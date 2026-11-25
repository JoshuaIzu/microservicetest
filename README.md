# Fintech Microservices Demo


## Project background

A Demo project initial built with as monolith but transformed to a microservice architecture using the features, auth and payment as one entity, ledger as another entity and then reconcition as another entity. 

Three entities in total each with its own database. And RabbitMQ acting as kafka for event streams connecting from payment to ledger and reconciliation(settlement). The service have copy from other service does not need to query that service for data.
and local transfer using outbox.publisher for the payment notification.


## Getting started

### Prerequisites

- Node.js 22 or later and npm
- PostgreSQL databases for Auth and Payments, Ledger, and Reconciliation
- A running RabbitMQ broker

Copy `.env.example` to `.env` and fill in the database URLs, RabbitMQ URL, and secrets. Then run:

```bash
npm ci
npm run prisma:generate
npm run build
npm run prisma:deploy
npm run prisma:deploy:ledger
npm run prisma:deploy:reconciliation
```

Start each process in a separate terminal:

```bash
npm start
npm run start:ledger
npm run start:reconciliation
```

Auth and Payments listen on port `3000`. Reconciliation listens on port `3001`. Ledger runs as a background worker with no HTTP endpoint.

## API endpoints

Send `Authorization: Bearer <token>` to protected endpoints and `Content-Type: application/json` with JSON request bodies.

### Health and authentication

- **Check API health** — `GET` [public `/health` URL](https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech/health)
- **Create an account** — `POST` [public `/auth/signup` URL](https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech/auth/signup)
- **Sign in** — `POST` [public `/auth/login` URL](https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech/auth/login)
- **Get the signed-in user** — `GET`, bearer token required [public `/auth/me` URL](https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech/auth/me)
- **Revoke the current token** — `DELETE`, bearer token required [public `/auth/logout` URL](https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech/auth/logout)

Signup and login both accept an `email` and `password` and return a user object and a JWT.

### Payments

- **Create a payment** — `POST`, bearer token and `Idempotency-Key` required [public `/payments/` URL](https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech/payments/)
- **List your payments** — `GET`, bearer token required [public `/payments/` URL](https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech/payments/)
- **Get a payment by ID** — `GET`, bearer token required. Replace `:id` with the payment ID. [Public `/payments/:id` URL](https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech/payments/:id)
- **Confirm a mock USD payment** — `POST`, signed webhook required [public `/payments/webhooks/MOCK_US` URL](https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech/payments/webhooks/MOCK_US)

### Reconciliation

- **Submit a settlement** — `POST`, bearer token required [public `/demo/settlements` URL](https://3001-agra5b44rcc74lljx6hliqfjei.instabox.tech/demo/settlements)

A settlement request includes `paymentId`, `provider`, `currency`, and `amountMinor`. Reconciliation returns `202 pending` while it waits for a ledger posting that matches the captured payment. A successful match returns `200 matched`.

### How the services communicate

| From → To | HTTP call or RabbitMQ event | Purpose |
|---|---|---|
| Payments → Ledger | `payment.captured.v2` through `ledger.capture.v2` | Ledger posts the debit and credit entries in its own database. |
| Payments → Reconciliation | `payment.captured.v2` through `reconciliation.events.v1` | Reconciliation saves a local copy of the capture. |
| Ledger → Reconciliation | `ledger.posted.v1` through `reconciliation.events.v1` | Reconciliation saves the posting confirmation for settlement matching. |
| Reconciliation → Auth | `GET http://127.0.0.1:3000/auth/me` | Reconciliation verifies the caller’s bearer token through the internal Auth endpoint. |

## Testing with Postman or cURL

The example below creates a **$1.00 mock USD payment**. In Postman, use the same URLs and headers, and select **Bearer Token** for protected requests.

### 1. Sign up

Use a fresh test email or log in with an existing account.

```bash
API="https://3000-agra5b44rcc74lljx6hliqfjei.instabox.tech"
RECON="https://3001-agra5b44rcc74lljx6hliqfjei.instabox.tech"

curl -i -X POST "$API/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!LongEnough"}'
```

Save the `token` from the `201 Created` response.

### 2. Create a mock payment

```bash
TOKEN="<jwt-from-signup-or-login>"
KEY="$(node -e 'console.log(require("node:crypto").randomUUID())')"

curl -i -X POST "$API/payments/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{
    "amountMinor": 100,
    "currency": "USD",
    "email": "test@example.com",
    "paymentMethod": {
      "type": "card",
      "number": "4084084084084081",
      "cvv": "123",
      "expiryMonth": "12",
      "expiryYear": "2030"
    }
  }'
```

Save the `paymentId` from the `202 Accepted` response. Reuse the same idempotency key if you retry this payment.

### 3. Send a signed webhook and check the payment

Run this from the project directory where `.env` contains `MOCK_WEBHOOK_SECRET`. The signature is computed from the same request body sent to the webhook.

```bash
PAYMENT_ID="<payment-id-from-step-2>"
BODY="{\"paymentId\":\"$PAYMENT_ID\",\"provider\":\"MOCK_US\",\"currency\":\"USD\",\"amountMinor\":100}"

SIGNATURE="$(node --env-file=.env -e '
  const { createHmac } = require("node:crypto");
  console.log(createHmac("sha256", process.env.MOCK_WEBHOOK_SECRET)
    .update(process.argv[1]).digest("hex"));
' "$BODY")"

curl -i -X POST "$API/payments/webhooks/MOCK_US" \
  -H "Content-Type: application/json" \
  -H "X-Demo-Signature: $SIGNATURE" \
  --data-binary "$BODY"

curl -i "$API/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

The webhook returns `200 applied`. The payment lookup then shows `CAPTURED`.

### 4. Match the settlement and log out

```bash
curl -i -X POST "$RECON/demo/settlements" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary "$BODY"
```

If Reconciliation returns `202 pending`, retry after a few seconds. A `200 matched` response confirms it received both the payment capture and the ledger posting.

```bash
curl -i -X DELETE "$API/auth/logout" \
  -H "Authorization: Bearer $TOKEN"
```

### Output from the InstaBox run

```text
Webhook: 200 { status: 'applied' }
Payment: CAPTURED
Settlement: 202 {
  status: 'pending',
  paymentId: 'aa3c0d13-99d0-455e-a031-579cef4fd14f'
}
Settlement: 200 {
  status: 'matched',
  paymentId: 'aa3c0d13-99d0-455e-a031-579cef4fd14f'
}
PASS: capture, ledger posting, and settlement matching
Logout: 204
```

## Features Overview

- JWT authentication with signup, login, and logout
- Payment creation with idempotency keys and provider routing
- Signed webhooks that confirm payment capture
- A transactional outbox that publishes capture events to RabbitMQ
- A Ledger worker that posts debit and credit entries to its own PostgreSQL database
- A Reconciliation API that matches settlements against local copies of payment captures and ledger postings
