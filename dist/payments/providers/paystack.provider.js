"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackProvider = void 0;
const node_crypto_1 = require("node:crypto");
const payment_captured_contract_1 = require("../../events/payment-captured.contract");
const PAYSTACK_API = "https://api.paystack.co";
class PaystackProvider {
    secretKey;
    fetchImpl;
    constructor(secretKey, fetchImpl = fetch) {
        this.secretKey = secretKey;
        this.fetchImpl = fetchImpl;
        if (!secretKey.trim()) {
            throw new Error("PAYSTACK_SECRET_KEY is required");
        }
    }
    async charge(request) {
        if (request.paymentMethod.type !== "card") {
            return {
                status: "failed",
                providerRef: request.paymentId,
                message: `Paystack charge does not support ${request.paymentMethod.type}`,
            };
        }
        const method = request.paymentMethod;
        const response = await this.fetchImpl(`${PAYSTACK_API}/charge`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: request.email,
                amount: request.amountMinor,
                reference: request.paymentId,
                currency: request.currency,
                card: {
                    number: method.number,
                    cvv: method.cvv,
                    expiry_month: method.expiryMonth,
                    expiry_year: method.expiryYear,
                },
            }),
        });
        const payload = (await response.json());
        if (!response.ok || !payload.status) {
            return {
                status: "failed",
                providerRef: request.paymentId,
                message: payload.message ?? `Paystack charge failed (${response.status})`,
            };
        }
        const gatewayStatus = payload.data?.status ?? "failed";
        const status = gatewayStatus === "success"
            ? "success"
            : gatewayStatus === "send_otp" || gatewayStatus === "open_url"
                ? "pending"
                : "failed";
        return {
            status,
            providerRef: payload.data?.reference ?? request.paymentId,
            message: payload.data?.message,
        };
    }
    verifyCapture(rawBody, headers) {
        const signature = headers["x-paystack-signature"];
        if (typeof signature !== "string" || !/^[a-f0-9]{512}$/i.test(signature)) {
            return null;
        }
        const expected = (0, node_crypto_1.createHmac)("sha512", this.secretKey)
            .update(rawBody)
            .digest();
        if (!(0, node_crypto_1.timingSafeEqual)(expected, Buffer.from(signature, "hex"))) {
            return null;
        }
        let event;
        try {
            event = JSON.parse(rawBody.toString("utf8"));
        }
        catch {
            return null;
        }
        if (event.event !== "charge.success" || !event.data) {
            return null;
        }
        const parsed = payment_captured_contract_1.captureNoticeSchema.safeParse({
            paymentId: event.data.reference,
            provider: "PAYSTACK",
            currency: event.data.currency,
            amountMinor: event.data.amount,
        });
        return parsed.success ? parsed.data : null;
    }
}
exports.PaystackProvider = PaystackProvider;
//# sourceMappingURL=paystack.provider.js.map