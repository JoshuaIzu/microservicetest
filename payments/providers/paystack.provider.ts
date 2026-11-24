import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import {
  captureNoticeSchema,
  type CaptureNotice,
} from "../../events/payment-captured.contract";
import type {
  ChargeStatus,
  IChargeResult,
  IProviderChargeRequest,
} from "../payment.types";
import type { IPaymentProvider } from "./payment-provider.interface";

const PAYSTACK_API = "https://api.paystack.co";

type FetchLike = typeof fetch;

interface IPaystackChargeResponse {
  status: boolean;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
    message?: string;
  };
}

interface IPaystackWebhookEvent {
  event?: string;
  data?: {
    reference?: string;
    currency?: string;
    amount?: number;
  };
}

export class PaystackProvider implements IPaymentProvider {
  constructor(
    private readonly secretKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    if (!secretKey.trim()) {
      throw new Error("PAYSTACK_SECRET_KEY is required");
    }
  }

  public async charge(request: IProviderChargeRequest): Promise<IChargeResult> {
    if (request.paymentMethod.type !== "card") {
      return {
        status: "failed",
        providerRef: request.paymentId,
        message: `Paystack charge does not support ${request.paymentMethod.type}`,
      };
    }

    const method = request.paymentMethod;

    const response = await this.fetchImpl(`${PAYSTACK_API}/charge`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: request.email,
        amount: request.amountMinor,
        reference: request.paymentId,
        currency: request.currency,
        card: {
          number: method.number,
          cvv: method.cvv,
          expiry_month: method.expiryMonth,
          expiry_year: method.expiryYear,
        },
      }),
    });

    const payload = (await response.json()) as IPaystackChargeResponse;

    if (!response.ok || !payload.status) {
      return {
        status: "failed",
        providerRef: request.paymentId,
        message: payload.message ?? `Paystack charge failed (${response.status})`,
      };
    }

    const gatewayStatus = payload.data?.status ?? "failed";
    const status: ChargeStatus =
      gatewayStatus === "success"
        ? "success"
        : gatewayStatus === "send_otp" || gatewayStatus === "open_url"
          ? "pending"
          : "failed";

    return {
      status,
      providerRef: payload.data?.reference ?? request.paymentId,
      message: payload.data?.message,
    };
  }

  public verifyCapture(
    rawBody: Buffer,
    headers: IncomingHttpHeaders,
  ): CaptureNotice | null {
    const signature = headers["x-paystack-signature"];

    if (typeof signature !== "string" || !/^[a-f0-9]{512}$/i.test(signature)) {
      return null;
    }

    const expected = createHmac("sha512", this.secretKey)
      .update(rawBody)
      .digest();

    if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
      return null;
    }

    let event: IPaystackWebhookEvent;

    try {
      event = JSON.parse(rawBody.toString("utf8")) as IPaystackWebhookEvent;
    } catch {
      return null;
    }

    if (event.event !== "charge.success" || !event.data) {
      return null;
    }

    const parsed = captureNoticeSchema.safeParse({
      paymentId: event.data.reference,
      provider: "PAYSTACK",
      currency: event.data.currency,
      amountMinor: event.data.amount,
    });

    return parsed.success ? parsed.data : null;
  }
}
