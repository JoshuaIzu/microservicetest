import type { z } from "zod";
import { captureNoticeSchema } from "../events/payment-captured.contract";

export const settlementSchema = captureNoticeSchema;

export type ISettlementDTO = z.infer<typeof settlementSchema>;

export type SettlementResult = {
  status: "matched" | "discrepancy" | "pending";
  paymentId: string;
} | null;

