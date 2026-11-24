import type { CaptureNotice } from "../events/payment-captured.contract";
import type {
  CaptureResult,
  ChargeStatus,
  ICreatePaymentParams,
  IPayment,
} from "./payment.types";

export interface IPaymentRepository {
  createOrFind(
    data: ICreatePaymentParams,
  ): Promise<{ payment: IPayment; created: boolean }>;
  findById(paymentId: string, ownerId: string): Promise<IPayment | null>;
  findAll(ownerId: string): Promise<IPayment[]>;
  recordChargeOutcome(
    paymentId: string,
    chargeStatus: ChargeStatus,
    chargeReference: string,
  ): Promise<void>;
  capture(notice: CaptureNotice): Promise<CaptureResult>;
}
