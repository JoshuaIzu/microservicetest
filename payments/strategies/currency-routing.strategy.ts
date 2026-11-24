import type { Currency } from "../../events/payment-captured.contract";
import type {
  ICreatePaymentDTO,
  PaymentProvider,
} from "../payment.types";
import type { IPaymentRoutingStrategy } from "./payment-routing.strategy.interface";

const DEFAULT_PROVIDERS: Record<Currency, PaymentProvider> = {
  NGN: "MOCK_NG",
  USD: "MOCK_US",
};

export class CurrencyRoutingStrategy implements IPaymentRoutingStrategy {
  private readonly providers: Record<Currency, PaymentProvider>;

  constructor(overrides: Partial<Record<Currency, PaymentProvider>> = {}) {
    this.providers = { ...DEFAULT_PROVIDERS, ...overrides };
  }

  public select(dto: ICreatePaymentDTO): PaymentProvider {
    return this.providers[dto.currency];
  }
}
