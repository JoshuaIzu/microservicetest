"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalRepository = void 0;
const client_1 = require("@prisma/client");
class JournalRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async postOnce(data) {
        const { eventId, paymentId, currency, entries } = data;
        try {
            await this.db.journal.create({
                data: {
                    eventId,
                    paymentId,
                    currency,
                    entries: { create: entries },
                },
            });
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002") {
                const existing = await this.db.journal.findUnique({
                    where: { eventId },
                    select: { paymentId: true },
                });
                if (existing?.paymentId === paymentId) {
                    return;
                }
            }
            throw error;
        }
    }
}
exports.JournalRepository = JournalRepository;
//# sourceMappingURL=journal.repository.js.map