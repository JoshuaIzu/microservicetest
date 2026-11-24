import type { ICreatePaymentDTO, PaymentProvider } from "../payment.types";

export interface IPaymentRoutingStrategy {
  select(dto: ICreatePaymentDTO): PaymentProvider;
}