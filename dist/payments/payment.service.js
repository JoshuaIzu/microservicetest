"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
class PaymentService {
    paymentRepo;
    routingStrategy;
    providers;
    constructor(paymentRepo, routingStrategy, providers) {
        this.paymentRepo = paymentRepo;
        this.routingStrategy = routingStrategy;
        this.providers = providers;
    }
    createPayment = async (ownerId, key, input) => {
        const { amountMinor, currency } = input;
        const provider = this.routingStrategy.select(input);
        const { payment, created } = await this.paymentRepo.createOrFind({
            amountMinor,
            currency,
            ownerId,
            key,
            provider,
        });
        if (payment.amountMinor !== amountMinor ||
            payment.currency !== currency) {
            return null;
        }
        if (!created) {
            return { paymentId: payment.id, provider: payment.provider, charge: null };
        }
        const gateway = this.providers.get(provider);
        if (!gateway) {
            throw new Error(`No payment provider registered for ${provider}`);
        }
        const charge = await gateway.charge({
            paymentId: payment.id,
            amountMinor,
            currency,
            email: input.email,
            paymentMethod: input.paymentMethod,
        });
        return {
            paymentId: payment.id,
            provider: payment.provider,
            charge,
        };
    };
    getPaymentById = async (paymentId, ownerId) => {
        return this.paymentRepo.findById(paymentId, ownerId);
    };
    handleWebhook = async (provider, rawBody, headers) => {
        const gateway = this.providers.get(provider);
        if (!gateway) {
            return "invalid_webhook";
        }
        const notice = gateway.verifyCapture(rawBody, headers);
        if (!notice) {
            return "invalid_webhook";
        }
        return this.paymentRepo.capture(notice);
    };
}
exports.PaymentService = PaymentService;
//# sourceMappingURL=payment.service.js.map