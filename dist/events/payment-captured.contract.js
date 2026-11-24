"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentCapturedSchema = exports.captureNoticeSchema = exports.amountMinorSchema = exports.paymentProviderSchema = exports.currencySchema = exports.PAYMENT_PROVIDERS = exports.CURRENCIES = void 0;
const zod_1 = require("zod");
exports.CURRENCIES = ["NGN", "USD"];
exports.PAYMENT_PROVIDERS = [
    "MOCK_NG",
    "MOCK_US",
    "PAYSTACK",
    "FLUTTERWAVE",
];
exports.currencySchema = zod_1.z.enum(exports.CURRENCIES);
exports.paymentProviderSchema = zod_1.z.enum(exports.PAYMENT_PROVIDERS);
exports.amountMinorSchema = zod_1.z.number().int().positive().max(2_147_483_647);
exports.captureNoticeSchema = zod_1.z.object({
    paymentId: zod_1.z.string().uuid(),
    provider: exports.paymentProviderSchema,
    currency: exports.currencySchema,
    amountMinor: exports.amountMinorSchema,
}).strict();
exports.paymentCapturedSchema = exports.captureNoticeSchema.extend({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.literal("payment.captured.v1"),
});
//# sourceMappingURL=payment-captured.contract.js.map