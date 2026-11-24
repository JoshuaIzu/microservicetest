import { timingSafeEqual } from "node:crypto";
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

const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";

type FetchLike = typeof fetch;

interface IFlutterwaveChargeResponse {
  status: string;
  message?: string;
  data?: {
    status?: string;
    id?: number;
    tx_ref?: string;
    message?: string;
  };
}

interface IFlutterwaveWebhookEvent {
  event?: string;
  data?: {
    status?: string;
    tx_ref?: string;
    amount?: number;
    currency?: string;
  };
}

export class FlutterwaveProvider implements IPaymentProvider {
  constructor(
    private readonly secretKey: string,
    private readonly webhookHash: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    if (!secretKey.trim()) {
      throw new Error("FLUTTERWAVE_SECRET_KEY is required");
    }

    if (!webhookHash.trim()) {
      throw new Error("FLUTTERWAVE_WEBHOOK_HASH is required");
    }
  }

  public async charge(request: IProviderChargeRequest): Promise<IChargeResult> {
    const method = request.paymentMethod;

    const body: Record<string, unknown> = {
      tx_ref: request.paymentId,
      amount: request.amountMinor / 100,
      currency: request.currency,
      email: request.email,
      redirect_url: process.env.PAYMENT_REDIRECT_URL,
    };

    switch (method.type) {
      case "card":
        body.card = {
          number: method.number,
          cvv: method.cvv,
          expiry_month: method.expiryMonth,
          expiry_year: method.expiryYear.slice(-2),
        };
        break;
      case "bank_transfer":
        body.account_number = method.accountNumber;
        body.bank_code = method.bankCode;
        break;
      case "ussd":
        body.phone_number = method.phoneNumber;
        break;
    }

    const response = await this.fetchImpl(
      `${FLUTTERWAVE_API}/charges?type=${method.type === "bank_transfer" ? "banktransfer" : method.type}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const payload = (await response.json()) as IFlutterwaveChargeResponse;

    if (!response.ok || payload.status !== "success") {
      return {
        status: "failed",
        providerRef: request.paymentId,
        message:
          payload.message ?? `Flutterwave charge failed (${response.status})`,
      };
    }

    const gatewayStatus = payload.data?.status ?? "failed";
    const status: ChargeStatus =
      gatewayStatus === "successful"
        ? "success"
        : gatewayStatus === "pending"
          ? "pending"
          : "failed";

    return {
      status,
      providerRef: payload.data?.tx_ref ?? request.paymentId,
      message: payload.data?.message,
    };
  }

  public async verifyCharge(reference: string): Promise<IChargeResult | null> {
    const response = await this.fetchImpl(
      `${FLUTTERWAVE_API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${this.secretKey}` } },
    );

    const payload = (await response.json()) as {
      status?: string;
      data?: { status?: string; tx_ref?: string };
    };

    if (!response.ok || payload.status !== "success" || !payload.data) {
      return null;
    }

    const gatewayStatus = payload.data.status ?? "failed";
    const status: ChargeStatus =
      gatewayStatus === "successful"
        ? "success"
        : gatewayStatus === "failed"
          ? "failed"
          : "pending";

    return {
      status,
      providerRef: payload.data.tx_ref ?? reference,
    };
  }

  public verifyCapture(
    rawBody: Buffer,
    headers: IncomingHttpHeaders,
  ): CaptureNotice | null {
    const verifHash = headers["verif-hash"];

    if (typeof verifHash !== "string" || !verifHash) {
      return null;
    }

    const expected = Buffer.from(this.webhookHash, "utf8");
    const received = Buffer.from(verifHash, "utf8");

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      return null;
    }

    let event: IFlutterwaveWebhookEvent;

    try {
      event = JSON.parse(rawBody.toString("utf8")) as IFlutterwaveWebhookEvent;
    } catch {
      return null;
    }

    if (
      event.event !== "charge.completed" ||
      event.data?.status !== "successful"
    ) {
      return null;
    }

    const parsed = captureNoticeSchema.safeParse({
      paymentId: event.data.tx_ref,
      provider: "FLUTTERWAVE",
      currency: event.data.currency,
      amountMinor: Math.round((event.data.amount ?? 0) * 100),
    });

    return parsed.success ? parsed.data : null;
  }
}
