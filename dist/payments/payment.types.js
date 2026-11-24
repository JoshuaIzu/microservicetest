"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentSchema = exports.createPaymentSchema = exports.idempotencyKeySchema = exports.paymentIdSchema = exports.paymentMethodSchema = exports.ussdMethodSchema = exports.bankTransferMethodSchema = exports.cardMethodSchema = exports.PAYMENT_STATUSES = exports.paymentProviderSchema = exports.PAYMENT_PROVIDERS = exports.CURRENCIES = void 0;
const zod_1 = require("zod");
const payment_captured_contract_1 = require("../events/payment-captured.contract");
var payment_captured_contract_2 = require("../events/payment-captured.contract");
Object.defineProperty(exports, "CURRENCIES", { enumerable: true, get: function () { return payment_captured_contract_2.CURRENCIES; } });
Object.defineProperty(exports, "PAYMENT_PROVIDERS", { enumerable: true, get: function () { return payment_captured_contract_2.PAYMENT_PROVIDERS; } });
Object.defineProperty(exports, "paymentProviderSchema", { enumerable: true, get: function () { return payment_captured_contract_2.paymentProviderSchema; } });
exports.PAYMENT_STATUSES = ["PENDING", "CAPTURED"];
exports.cardMethodSchema = zod_1.z.object({
    type: zod_1.z.literal("card"),
    number: zod_1.z.string().min(12).max(19),
    cvv: zod_1.z.string().min(3).max(4),
    expiryMonth: zod_1.z.string().regex(/^(0[1-9]|1[0-2])$/),
    expiryYear: zod_1.z.string().regex(/^\d{4}$/),
}).strict();
exports.bankTransferMethodSchema = zod_1.z.object({
    type: zod_1.z.literal("bank_transfer"),
    accountNumber: zod_1.z.string().min(10).max(10),
    bankCode: zod_1.z.string().min(1).max(10),
}).strict();
exports.ussdMethodSchema = zod_1.z.object({
    type: zod_1.z.literal("ussd"),
    phoneNumber: zod_1.z.string().min(10).max(15),
}).strict();
exports.paymentMethodSchema = zod_1.z.discriminatedUnion("type", [
    exports.cardMethodSchema,
    exports.bankTransferMethodSchema,
    exports.ussdMethodSchema,
]);
exports.paymentIdSchema = zod_1.z.string().uuid();
exports.idempotencyKeySchema = zod_1.z.string().trim().min(1).max(128);
exports.createPaymentSchema = zod_1.z.object({
    amountMinor: payment_captured_contract_1.amountMinorSchema,
    currency: payment_captured_contract_1.currencySchema,
    email: zod_1.z.string().trim().email().max(254),
    paymentMethod: exports.paymentMethodSchema,
}).strict();
exports.paymentSchema = exports.createPaymentSchema.omit({
    email: true,
    paymentMethod: true,
}).extend({
    id: exports.paymentIdSchema,
    provider: payment_captured_contract_1.paymentProviderSchema,
    status: zod_1.z.enum(exports.PAYMENT_STATUSES),
});
//# sourceMappingURL=payment.types.js.map