"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRepository = void 0;
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
const payment_types_1 = require("./payment.types");
const paymentSelect = {
    id: true,
    amountMinor: true,
    currency: true,
    provider: true,
    status: true,
};
class PaymentRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async createOrFind(data) {
        try {
            const record = await this.db.payment.create({
                data,
                select: paymentSelect,
            });
            return { payment: payment_types_1.paymentSchema.parse(record), created: true };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002") {
                const existing = await this.db.payment.findUnique({
                    where: {
                        ownerId_key: { ownerId: data.ownerId, key: data.key },
                    },
                    select: paymentSelect,
                });
                if (existing) {
                    return { payment: payment_types_1.paymentSchema.parse(existing), created: false };
                }
            }
            throw error;
        }
    }
    async findById(paymentId, ownerId) {
        const record = await this.db.payment.findFirst({
            where: { id: paymentId, ownerId },
            select: paymentSelect,
        });
        return record ? payment_types_1.paymentSchema.parse(record) : null;
    }
    async capture(notice) {
        const { paymentId, provider, currency, amountMinor } = notice;
        return this.db.$transaction(async (tx) => {
            const updated = await tx.payment.updateMany({
                where: {
                    id: paymentId,
                    status: "PENDING",
                    provider,
                    currency,
                    amountMinor,
                },
                data: { status: "CAPTURED" },
            });
            if (updated.count === 0) {
                const existing = await tx.payment.findUnique({
                    where: { id: paymentId },
                    select: paymentSelect,
                });
                if (!existing) {
                    return "unmatched";
                }
                const sameCapture = existing.status === "CAPTURED" &&
                    existing.provider === provider &&
                    existing.currency === currency &&
                    existing.amountMinor === amountMinor;
                return sameCapture ? "duplicate" : "mismatch";
            }
            const event = {
                ...notice,
                id: (0, node_crypto_1.randomUUID)(),
                type: "payment.captured.v1",
            };
            await tx.outboxEvent.create({
                data: { id: event.id, payload: event },
            });
            return "applied";
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.ReadCommitted });
    }
}
exports.PaymentRepository = PaymentRepository;
//# sourceMappingURL=payment.repository.js.map