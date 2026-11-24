import type { PaymentCaptured } from "../events/payment-captured.contract";
import type { IJournalRepository } from "./journal-repository.interface";

export class LedgerService {
  constructor(private readonly journalRepo: IJournalRepository) {}

  public postPaymentCapture = async (event: PaymentCaptured): Promise<void> => {
    await this.journalRepo.postOnce({
      eventId: event.id,
      paymentId: event.paymentId,
      currency: event.currency,
      entries: [
        {
          account: "provider_clearing",
          side: "DEBIT",
          amountMinor: event.amountMinor,
        },
        {
          account: "merchant_payable",
          side: "CREDIT",
          amountMinor: event.amountMinor,
        },
      ],
    });
  };
}