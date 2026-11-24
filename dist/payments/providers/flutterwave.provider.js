"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlutterwaveProvider = void 0;
const node_crypto_1 = require("node:crypto");
const payment_captured_contract_1 = require("../../events/payment-captured.contract");
const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";
class FlutterwaveProvider {
    secretKey;
    webhookHash;
    fetchImpl;
    constructor(secretKey, webhookHash, fetchImpl = fetch) {
        this.secretKey = secretKey;
        this.webhookHash = webhookHash;
        this.fetchImpl = fetchImpl;
        if (!secretKey.trim()) {
            throw new Error("FLUTTERWAVE_SECRET_KEY is required");
        }
        if (!webhookHash.trim()) {
            throw new Error("FLUTTERWAVE_WEBHOOK_HASH is required");
        }
    }
    async charge(request) {
        const method = request.paymentMethod;
        const body = {
            tx_ref: request.paymentId,
            amount: request.amountMinor / 100,
            currency: request.currency,
            email: request.email,
            redirect_url: process.env.PAYMENT_REDIRECT_URL,
        };
        switch (method.type) {
            case "card":
                body.card = {
                    number: method.number,
                    cvv: method.cvv,
                    expiry_month: method.expiryMonth,
                    expiry_year: method.expiryYear.slice(-2),
                };
                break;
            case "bank_transfer":
                body.account_number = method.accountNumber;
                body.bank_code = method.bankCode;
                break;
            case "ussd":
                body.phone_number = method.phoneNumber;
                break;
        }
        const response = await this.fetchImpl(`${FLUTTERWAVE_API}/charges?type=${method.type === "bank_transfer" ? "banktransfer" : method.type}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.secretKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        const payload = (await response.json());
        if (!response.ok || payload.status !== "success") {
            return {
                status: "failed",
                providerRef: request.paymentId,
                message: payload.message ?? `Flutterwave charge failed (${response.status})`,
            };
        }
        const gatewayStatus = payload.data?.status ?? "failed";
        const status = gatewayStatus === "successful"
            ? "success"
            : gatewayStatus === "pending"
                ? "pending"
                : "failed";
        return {
            status,
            providerRef: payload.data?.tx_ref ?? request.paymentId,
            message: payload.data?.message,
        };
    }
    verifyCapture(rawBody, headers) {
        const verifHash = headers["verif-hash"];
        if (typeof verifHash !== "string" || !verifHash) {
            return null;
        }
        const expected = Buffer.from(this.webhookHash, "utf8");
        const received = Buffer.from(verifHash, "utf8");
        if (expected.length !== received.length ||
            !(0, node_crypto_1.timingSafeEqual)(expected, received)) {
            return null;
        }
        let event;
        try {
            event = JSON.parse(rawBody.toString("utf8"));
        }
        catch {
            return null;
        }
        if (event.event !== "charge.completed" ||
            event.data?.status !== "successful") {
            return null;
        }
        const parsed = payment_captured_contract_1.captureNoticeSchema.safeParse({
            paymentId: event.data.tx_ref,
            provider: "FLUTTERWAVE",
            currency: event.data.currency,
            amountMinor: Math.round((event.data.amount ?? 0) * 100),
        });
        return parsed.success ? parsed.data : null;
    }
}
exports.FlutterwaveProvider = FlutterwaveProvider;
//# sourceMappingURL=flutterwave.provider.js.map