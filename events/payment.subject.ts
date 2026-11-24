import type { PaymentCaptured } from "./payment-captured.contract";

export interface IPaymentEventPublisher {
  publish(event: PaymentCaptured): Promise<void>;
}

export type PaymentObserver = (event: PaymentCaptured) => Promise<void>;

export class PaymentSubject implements IPaymentEventPublisher {
  private readonly observers = new Set<PaymentObserver>();

  public subscribe(observer: PaymentObserver): () => void {
    this.observers.add(observer);

    return () => {
      this.observers.delete(observer);
    };
  }

  public async publish(event: PaymentCaptured): Promise<void> {
    if (this.observers.size === 0) {
      throw new Error("No payment observers are registered");
    }

    for (const observer of this.observers) {
      await observer(event);
    }
  }
}