"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = void 0;
class LedgerService {
    journalRepo;
    constructor(journalRepo) {
        this.journalRepo = journalRepo;
    }
    postPaymentCapture = async (event) => {
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
exports.LedgerService = LedgerService;
//# sourceMappingURL=ledger.service.js.map