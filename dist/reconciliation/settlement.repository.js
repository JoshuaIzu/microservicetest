"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementRepository = void 0;
class SettlementRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async recordAndMatch(ownerId, dto) {
        const payment = await this.db.payment.findFirst({
            where: { id: dto.paymentId, ownerId },
            select: {
                id: true,
                provider: true,
                currency: true,
                amountMinor: true,
            },
        });
        if (!payment) {
            return null;
        }
        const matched = payment.provider === dto.provider &&
            payment.currency === dto.currency &&
            payment.amountMinor === dto.amountMinor;
        await this.db.settlement.upsert({
            where: { paymentId: payment.id },
            create: {
                paymentId: payment.id,
                amountMinor: dto.amountMinor,
                currency: dto.currency,
                provider: dto.provider,
            },
            update: {
                amountMinor: dto.amountMinor,
                currency: dto.currency,
                provider: dto.provider,
            },
        });
        return {
            status: matched ? "matched" : "discrepancy",
            paymentId: payment.id,
        };
    }
}
exports.SettlementRepository = SettlementRepository;
//# sourceMappingURL=settlement.repository.js.map