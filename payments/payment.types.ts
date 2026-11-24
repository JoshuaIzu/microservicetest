import { z } from "zod";
import {
  amountMinorSchema,
  currencySchema,
  paymentProviderSchema,
  type Currency,
  type PaymentProvider,
} from "../events/payment-captured.contract";

export {
  CURRENCIES,
  PAYMENT_PROVIDERS,
  type Currency,
  type PaymentProvider,
} from "../events/payment-captured.contract";

export const PAYMENT_STATUSES = ["PENDING", "CAPTURED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface ICreatePaymentDTO {
  amountMinor: number;
  currency: Currency;
}

export interface ICreatePaymentParams extends ICreatePaymentDTO {
  ownerId: string;
  key: string;
  provider: PaymentProvider;
}

export interface IPayment extends ICreatePaymentDTO {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
}

export const cardMethodSchema = z.object({
  type: z.literal("card"),
  number: z.string().min(12).max(19),
  cvv: z.string().min(3).max(4),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/),
  expiryYear: z.string().regex(/^\d{4}$/),
}).strict();

export const bankTransferMethodSchema = z.object({
  type: z.literal("bank_transfer"),
  accountNumber: z.string().min(10).max(10),
  bankCode: z.string().min(1).max(10),
}).strict();

export const ussdMethodSchema = z.object({
  type: z.literal("ussd"),
  phoneNumber: z.string().min(10).max(15),
}).strict();

export const paymentMethodSchema = z.discriminatedUnion("type", [
  cardMethodSchema,
  bankTransferMethodSchema,
  ussdMethodSchema,
]);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export interface ICreatePaymentInput extends ICreatePaymentDTO {
  email: string;
  paymentMethod: PaymentMethod;
}

export interface IProviderChargeRequest {
  paymentId: string;
  amountMinor: number;
  currency: Currency;
  email: string;
  paymentMethod: PaymentMethod;
}

export type ChargeStatus = "success" | "pending" | "failed";

export interface IChargeResult {
  status: ChargeStatus;
  providerRef: string;
  message?: string;
}

export interface ICreatePaymentResponse {
  paymentId: string;
  provider: PaymentProvider;
  charge: IChargeResult | null;
}

export type CaptureResult = "applied" | "duplicate" | "unmatched" | "mismatch";
export type WebhookResult = CaptureResult | "invalid_webhook";

export const paymentIdSchema = z.string().uuid();
export const idempotencyKeySchema = z.string().trim().min(1).max(128);

export const createPaymentSchema = z.object({
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  email: z.string().trim().email().max(254),
  paymentMethod: paymentMethodSchema,
}).strict();

export const paymentSchema = createPaymentSchema.omit({
  email: true,
  paymentMethod: true,
}).extend({
  id: paymentIdSchema,
  provider: paymentProviderSchema,
  status: z.enum(PAYMENT_STATUSES),
});
