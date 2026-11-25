import { z } from "zod";

export const CURRENCIES = ["NGN", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PAYMENT_PROVIDERS = [
  "MOCK_NG",
  "MOCK_US",
  "PAYSTACK",
  "FLUTTERWAVE",
] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const currencySchema = z.enum(CURRENCIES);
export const paymentProviderSchema = z.enum(PAYMENT_PROVIDERS);
export const amountMinorSchema = z.number().int().positive().max(2_147_483_647);

export const captureNoticeSchema = z.object({
  paymentId: z.string().uuid(),
  provider: paymentProviderSchema,
  currency: currencySchema,
  amountMinor: amountMinorSchema,
}).strict();

export const paymentCapturedSchema = captureNoticeSchema.extend({
  id: z.string().uuid(),
  type: z.literal("payment.captured.v2"),
  ownerId: z.string().uuid(),
});

export type CaptureNotice = z.infer<typeof captureNoticeSchema>;
export type PaymentCaptured = z.infer<typeof paymentCapturedSchema>;

export const ledgerPostedSchema = z.object({
  type: z.literal("ledger.posted.v1"),
  paymentId: z.string().uuid(),
  captureEventId: z.string().uuid(),
  currency: currencySchema,
  amountMinor: amountMinorSchema,
}).strict();

export const brokerEventSchema = z.discriminatedUnion("type", [
  paymentCapturedSchema,
  ledgerPostedSchema,
]);

export type BrokerEvent = z.infer<typeof brokerEventSchema>;
