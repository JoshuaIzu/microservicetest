import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import {
  captureNoticeSchema,
  type CaptureNotice,
} from "../../events/payment-captured.contract";
import type {
  IChargeResult,
  IProviderChargeRequest,
} from "../payment.types";
import type { IPaymentProvider } from "./payment-provider.interface";

export class MockPaymentProvider implements IPaymentProvider {
  constructor(private readonly webhookSecret: string) {
    if (!webhookSecret.trim()) {
      throw new Error("MOCK_WEBHOOK_SECRET is required");
    }
  }

  public async charge(request: IProviderChargeRequest): Promise<IChargeResult> {
    return {
      status: "success",
      providerRef: `mock-${request.paymentId}`,
    };
  }

  public verifyCapture(
    rawBody: Buffer,
    headers: IncomingHttpHeaders,
  ): CaptureNotice | null {
    const signature = headers["x-demo-signature"];

    if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) {
      return null;
    }

    const expected = createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest();

    if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
      return null;
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return null;
    }

    const parsed = captureNoticeSchema.safeParse(body);

    return parsed.success ? parsed.data : null;
  }
}
