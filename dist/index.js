"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_controller_1 = require("./auth/auth.controller");
const auth_middleware_1 = require("./auth/auth.middleware");
const auth_routes_1 = require("./auth/auth.routes");
const auth_service_1 = require("./auth/auth.service");
const password_hasher_1 = require("./auth/password-hasher");
const user_repository_1 = require("./auth/user.repository");
const outbox_publisher_1 = require("./events/outbox.publisher");
const payment_subject_1 = require("./events/payment.subject");
const journal_repository_1 = require("./ledger/journal.repository");
const ledger_service_1 = require("./ledger/ledger.service");
const payment_controller_1 = require("./payments/payment.controller");
const payment_repository_1 = require("./payments/payment.repository");
const payment_routes_1 = require("./payments/payment.routes");
const payment_service_1 = require("./payments/payment.service");
const flutterwave_provider_1 = require("./payments/providers/flutterwave.provider");
const mock_payment_provider_1 = require("./payments/providers/mock-payment.provider");
const paystack_provider_1 = require("./payments/providers/paystack.provider");
const currency_routing_strategy_1 = require("./payments/strategies/currency-routing.strategy");
const settlement_controller_1 = require("./reconciliation/settlement.controller");
const settlement_repository_1 = require("./reconciliation/settlement.repository");
const settlement_routes_1 = require("./reconciliation/settlement.routes");
const settlement_service_1 = require("./reconciliation/settlement.service");
function requireEnv(name) {
    const value = process.env[name];
    if (!value?.trim()) {
        throw new Error(`${name} is required`);
    }
    return value;
}
function createRateLimiter(windowMs, max) {
    const hits = new Map();
    return (req, res, next) => {
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
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
const port = Number(process.env.PORT ?? 3000);
const userRepo = new user_repository_1.UserRepository(prisma);
const authService = new auth_service_1.AuthService(userRepo, userRepo, new password_hasher_1.BcryptPasswordHasher(), requireEnv("JWT_SECRET"));
const authController = new auth_controller_1.AuthController(authService);
const authMiddleware = new auth_middleware_1.AuthMiddleware(authService);
const providers = new Map();
const mockProvider = new mock_payment_provider_1.MockPaymentProvider(requireEnv("MOCK_WEBHOOK_SECRET"));
providers.set("MOCK_NG", mockProvider);
providers.set("MOCK_US", mockProvider);
const paystackKey = process.env.PAYSTACK_SECRET_KEY;
if (paystackKey) {
    providers.set("PAYSTACK", new paystack_provider_1.PaystackProvider(paystackKey));
}
const flutterwaveKey = process.env.FLUTTERWAVE_SECRET_KEY;
const flutterwaveHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
if (flutterwaveKey && flutterwaveHash) {
    providers.set("FLUTTERWAVE", new flutterwave_provider_1.FlutterwaveProvider(flutterwaveKey, flutterwaveHash));
}
const ngnProvider = providers.has("PAYSTACK")
    ? "PAYSTACK"
    : providers.has("FLUTTERWAVE")
        ? "FLUTTERWAVE"
        : "MOCK_NG";
const paymentRepo = new payment_repository_1.PaymentRepository(prisma);
const routingStrategy = new currency_routing_strategy_1.CurrencyRoutingStrategy({ NGN: ngnProvider });
const paymentService = new payment_service_1.PaymentService(paymentRepo, routingStrategy, providers);
const paymentController = new payment_controller_1.PaymentController(paymentService);
app.use("/payments", (0, payment_routes_1.createPaymentRoutes)(paymentController, authMiddleware.authenticate));
app.use(express_1.default.json({ limit: "8kb" }));
app.use("/auth", (0, auth_routes_1.createAuthRoutes)(authController, authMiddleware, createRateLimiter(60_000, 5), createRateLimiter(60_000, 10)));
const journalRepo = new journal_repository_1.JournalRepository(prisma);
const ledgerService = new ledger_service_1.LedgerService(journalRepo);
const paymentSubject = new payment_subject_1.PaymentSubject();
paymentSubject.subscribe(ledgerService.postPaymentCapture);
const outboxPublisher = new outbox_publisher_1.OutboxPublisher(prisma, paymentSubject);
outboxPublisher.start();
const settlementRepo = new settlement_repository_1.SettlementRepository(prisma);
const settlementService = new settlement_service_1.SettlementService(settlementRepo);
const settlementController = new settlement_controller_1.SettlementController(settlementService);
app.use("/demo/settlements", (0, settlement_routes_1.createSettlementRoutes)(settlementController, authMiddleware.authenticate));
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
//# sourceMappingURL=index.js.map