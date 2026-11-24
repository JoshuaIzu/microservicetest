"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockPaymentProvider = void 0;
const node_crypto_1 = require("node:crypto");
const payment_captured_contract_1 = require("../../events/payment-captured.contract");
class MockPaymentProvider {
    webhookSecret;
    constructor(webhookSecret) {
        this.webhookSecret = webhookSecret;
        if (!webhookSecret.trim()) {
            throw new Error("MOCK_WEBHOOK_SECRET is required");
        }
    }
    async charge(request) {
        return {
            status: "success",
            providerRef: `mock-${request.paymentId}`,
        };
    }
    verifyCapture(rawBody, headers) {
        const signature = headers["x-demo-signature"];
        if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) {
            return null;
        }
        const expected = (0, node_crypto_1.createHmac)("sha256", this.webhookSecret)
            .update(rawBody)
            .digest();
        if (!(0, node_crypto_1.timingSafeEqual)(expected, Buffer.from(signature, "hex"))) {
            return null;
        }
        let body;
        try {
            body = JSON.parse(rawBody.toString("utf8"));
        }
        catch {
            return null;
        }
        const parsed = payment_captured_contract_1.captureNoticeSchema.safeParse(body);
        return parsed.success ? parsed.data : null;
    }
}
exports.MockPaymentProvider = MockPaymentProvider;
//# sourceMappingURL=mock-payment.provider.js.map