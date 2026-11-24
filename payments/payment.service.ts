import type { IncomingHttpHeaders } from "node:http";
import type { IPaymentRepository } from "./payment-repository.interface";
import type {
  ICreatePaymentInput,
  ICreatePaymentResponse,
  IPayment,
  PaymentProvider,
  WebhookResult,
} from "./payment.types";
import type { IPaymentProvider } from "./providers/payment-provider.interface";
import type { IPaymentRoutingStrategy } from "./strategies/payment-routing.strategy.interface";

export class PaymentService {
  constructor(
    private readonly paymentRepo: IPaymentRepository,
    private readonly routingStrategy: IPaymentRoutingStrategy,
    private readonly providers: ReadonlyMap<PaymentProvider, IPaymentProvider>,
  ) {}

  public createPayment = async (
    ownerId: string,
    key: string,
    input: ICreatePaymentInput,
  ): Promise<ICreatePaymentResponse | null> => {
    const { amountMinor, currency } = input;
    const provider = this.routingStrategy.select(input);

    const { payment, created } = await this.paymentRepo.createOrFind({
      amountMinor,
      currency,
      ownerId,
      key,
      provider,
    });

    if (
      payment.amountMinor !== amountMinor ||
      payment.currency !== currency
    ) {
      return null;
    }

    if (!created) {
      return { paymentId: payment.id, provider: payment.provider, charge: null };
    }

    const gateway = this.providers.get(provider);

    if (!gateway) {
      throw new Error(`No payment provider registered for ${provider}`);
    }

    const charge = await gateway.charge({
      paymentId: payment.id,
      amountMinor,
      currency,
      email: input.email,
      paymentMethod: input.paymentMethod,
    });

    return {
      paymentId: payment.id,
      provider: payment.provider,
      charge,
    };
  };

  public getPaymentById = async (
    paymentId: string,
    ownerId: string,
  ): Promise<IPayment | null> => {
    return this.paymentRepo.findById(paymentId, ownerId);
  };

  public handleWebhook = async (
    provider: PaymentProvider,
    rawBody: Buffer,
    headers: IncomingHttpHeaders,
  ): Promise<WebhookResult> => {
    const gateway = this.providers.get(provider);

    if (!gateway) {
      return "invalid_webhook";
    }

    const notice = gateway.verifyCapture(rawBody, headers);

    if (!notice) {
      return "invalid_webhook";
    }

    return this.paymentRepo.capture(notice);
  };
}
