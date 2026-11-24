import type { IncomingHttpHeaders } from "node:http";
import type { CaptureNotice } from "../../events/payment-captured.contract";
import type {
  IChargeResult,
  IProviderChargeRequest,
} from "../payment.types";

export interface IPaymentProvider {
  charge(request: IProviderChargeRequest): Promise<IChargeResult>;
  verifyCapture(
    rawBody: Buffer,
    headers: IncomingHttpHeaders,
  ): CaptureNotice | null;
}
