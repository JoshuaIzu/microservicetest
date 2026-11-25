# Fintech demo

Auth and Payments run together on port 3000. Ledger is a RabbitMQ worker with its own PostgreSQL database. Reconciliation runs on port 3001 and matches settlements against local copies of capture and journal facts.

Payments commits the capture and outbox event in one transaction. The publisher marks the event delivered after RabbitMQ confirms it. Ledger acknowledges the delivery after posting the journal and publishing `ledger.posted.v1`. The unique journal event ID protects against duplicate posting when an event is replayed.

## Local setup

Use Node.js 22 or newer. Create three PostgreSQL databases with separate credentials and a RabbitMQ vhost with a user allowed to declare and use the queues. Copy `.env.example` to `.env` and replace the placeholders. In a deployment, give each process only the credentials it needs. All three use the broker URL. The API uses `DATABASE_URL`, Ledger uses `LEDGER_DATABASE_URL`, and Reconciliation uses `RECONCILIATION_DATABASE_URL`. Reconciliation verifies the bearer token with the API at `AUTH_BASE_URL`.

```sh
npm ci
npm run prisma:generate
npm run build
npm run prisma:deploy
npm run prisma:deploy:ledger
npm run prisma:deploy:reconciliation
```

Run these in separate terminals or as separate service processes.

```sh
npm start
npm run start:ledger
npm run start:reconciliation
```

For the demo, start a new payment with the mock provider and confirm it through the signed webhook on port 3000. Submit the same payment ID, provider, currency, and amount to `POST /demo/settlements` on port 3001 with the owner's bearer token. Reconciliation returns `404` until the capture event is projected, `202 pending` while the journal is missing, and `200 matched` when both copies match.

## Existing deployments

The API migration history and legacy tables are retained. This split does not backfill prior captures, journals, or settlements. The new publisher reads `payment.captured.v2` events only. If keeping existing history, stop new writes and drain the old outbox before cutover, then copy the historical data to its new owners and verify it before switching the settlement endpoint. Start all three processes on the new version when switching over.
