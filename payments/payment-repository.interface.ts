import type { CaptureNotice } from "../events/payment-captured.contract";
import type {
  CaptureResult,
  ICreatePaymentParams,
  IPayment,
} from "./payment.types";

export interface IPaymentRepository {
  createOrFind(
    data: ICreatePaymentParams,
  ): Promise<{ payment: IPayment; created: boolean }>;
  findById(paymentId: string, ownerId: string): Promise<IPayment | null>;
  capture(notice: CaptureNotice): Promise<CaptureResult>;
}
