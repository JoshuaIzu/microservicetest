import type { IncomingHttpHeaders } from "node:http";
import type { CaptureNotice } from "../../events/payment-captured.contract";
import type {
  IChargeResult,
  IProviderChargeRequest,
} from "../payment.types";

export interface IPaymentProvider {
  charge(request: IProviderChargeRequest): Promise<IChargeResult>;
  verifyCharge(reference: string): Promise<IChargeResult | null>;
  verifyCapture(
    rawBody: Buffer,
    headers: IncomingHttpHeaders,
  ): CaptureNotice | null;
}
