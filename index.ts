import express, { type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";

import { AuthController } from "./auth/auth.controller";
import { AuthMiddleware } from "./auth/auth.middleware";
import { createAuthRoutes } from "./auth/auth.routes";
import { AuthService } from "./auth/auth.service";
import { BcryptPasswordHasher } from "./auth/password-hasher";
import { UserRepository } from "./auth/user.repository";
import { OutboxPublisher } from "./events/outbox.publisher";
import { PaymentSubject } from "./events/payment.subject";
import type { PaymentProvider } from "./events/payment-captured.contract";
import { JournalRepository } from "./ledger/journal.repository";
import { LedgerService } from "./ledger/ledger.service";
import { PaymentController } from "./payments/payment.controller";
import { PaymentRepository } from "./payments/payment.repository";
import { createPaymentRoutes } from "./payments/payment.routes";
import { PaymentService } from "./payments/payment.service";
import { FlutterwaveProvider } from "./payments/providers/flutterwave.provider";
import { MockPaymentProvider } from "./payments/providers/mock-payment.provider";
import { PaystackProvider } from "./payments/providers/paystack.provider";
import type { IPaymentProvider } from "./payments/providers/payment-provider.interface";
import { CurrencyRoutingStrategy } from "./payments/strategies/currency-routing.strategy";
import { SettlementController } from "./reconciliation/settlement.controller";
import { SettlementRepository } from "./reconciliation/settlement.repository";
import { createSettlementRoutes } from "./reconciliation/settlement.routes";
import { SettlementService } from "./reconciliation/settlement.service";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value?.trim()) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function createRateLimiter(windowMs: number, max: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: () => void): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      res.status(429).json({ error: "RATE_LIMITED" });
      return;
    }

    entry.count += 1;
    next();
  };
}

const prisma = new PrismaClient();
const app = express();
const port = Number(process.env.PORT ?? 3000);

const userRepo = new UserRepository(prisma);
const authService = new AuthService(
  userRepo,
  userRepo,
  new BcryptPasswordHasher(),
  requireEnv("JWT_SECRET"),
);
const authController = new AuthController(authService);
const authMiddleware = new AuthMiddleware(authService);

const providers = new Map<PaymentProvider, IPaymentProvider>();
const mockProvider = new MockPaymentProvider(requireEnv("MOCK_WEBHOOK_SECRET"));
providers.set("MOCK_NG", mockProvider);
providers.set("MOCK_US", mockProvider);

const paystackKey = process.env.PAYSTACK_SECRET_KEY;

if (paystackKey) {
  providers.set("PAYSTACK", new PaystackProvider(paystackKey));
}

const flutterwaveKey = process.env.FLUTTERWAVE_SECRET_KEY;
const flutterwaveHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

if (flutterwaveKey && flutterwaveHash) {
  providers.set(
    "FLUTTERWAVE",
    new FlutterwaveProvider(flutterwaveKey, flutterwaveHash),
  );
}

const ngnProvider: PaymentProvider = providers.has("PAYSTACK")
  ? "PAYSTACK"
  : providers.has("FLUTTERWAVE")
    ? "FLUTTERWAVE"
    : "MOCK_NG";

const paymentRepo = new PaymentRepository(prisma);
const routingStrategy = new CurrencyRoutingStrategy({ NGN: ngnProvider });
const paymentService = new PaymentService(paymentRepo, routingStrategy, providers);
const paymentController = new PaymentController(paymentService);

app.use(
  "/payments",
  createPaymentRoutes(paymentController, authMiddleware.authenticate),
);

app.use(express.json({ limit: "8kb" }));

app.use(
  "/auth",
  createAuthRoutes(
    authController,
    authMiddleware,
    createRateLimiter(60_000, 5),
    createRateLimiter(60_000, 10),
  ),
);

const journalRepo = new JournalRepository(prisma);
const ledgerService = new LedgerService(journalRepo);
const paymentSubject = new PaymentSubject();

paymentSubject.subscribe(ledgerService.postPaymentCapture);

const outboxPublisher = new OutboxPublisher(prisma, paymentSubject);
outboxPublisher.start();

const settlementRepo = new SettlementRepository(prisma);
const settlementService = new SettlementService(settlementRepo);
const settlementController = new SettlementController(settlementService);

app.use(
  "/demo/settlements",
  createSettlementRoutes(settlementController, authMiddleware.authenticate),
);

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
