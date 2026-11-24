"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const payment_types_1 = require("./payment.types");
const webhookStatus = {
    applied: 200,
    duplicate: 200,
    invalid_webhook: 400,
    unmatched: 503,
    mismatch: 422,
};
class PaymentController {
    paymentService;
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    createPayment = async (req, res) => {
        const auth = res.locals.auth;
        if (!auth) {
            res.status(401).json({ error: "UNAUTHENTICATED" });
            return;
        }
        const input = payment_types_1.createPaymentSchema.safeParse(req.body);
        const key = payment_types_1.idempotencyKeySchema.safeParse(req.get("Idempotency-Key"));
        if (!input.success || !key.success) {
            res.status(400).json({ error: "INVALID_PAYMENT_INPUT" });
            return;
        }
        const result = await this.paymentService.createPayment(auth.sub, key.data, input.data);
        if (!result) {
            res.status(409).json({ error: "IDEMPOTENCY_CONFLICT" });
            return;
        }
        res.status(202).json(result);
    };
    getPaymentById = async (req, res) => {
        const auth = res.locals.auth;
        if (!auth) {
            res.status(401).json({ error: "UNAUTHENTICATED" });
            return;
        }
        const paymentId = payment_types_1.paymentIdSchema.safeParse(req.params.id);
        if (!paymentId.success) {
            res.status(400).json({ error: "INVALID_PAYMENT_ID" });
            return;
        }
        const payment = await this.paymentService.getPaymentById(paymentId.data, auth.sub);
        if (!payment) {
            res.status(404).json({ error: "PAYMENT_NOT_FOUND" });
            return;
        }
        res.status(200).json(payment);
    };
    handleWebhook = async (req, res) => {
        const provider = payment_types_1.paymentProviderSchema.safeParse(req.params.provider);
        if (!provider.success || !Buffer.isBuffer(req.body)) {
            res.status(400).json({ error: "INVALID_WEBHOOK_REQUEST" });
            return;
        }
        const result = await this.paymentService.handleWebhook(provider.data, req.body, req.headers);
        res.status(webhookStatus[result]).json({ status: result });
    };
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=payment.controller.js.map