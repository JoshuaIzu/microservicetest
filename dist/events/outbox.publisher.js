"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxPublisher = void 0;
const payment_captured_contract_1 = require("./payment-captured.contract");
class OutboxPublisher {
    db;
    publisher;
    timer;
    running = false;
    constructor(db, publisher) {
        this.db = db;
        this.publisher = publisher;
    }
    start(intervalMs = 1000) {
        if (this.timer) {
            return;
        }
        void this.publishPending();
        this.timer = setInterval(() => {
            void this.publishPending();
        }, intervalMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
    async publishPending() {
        if (this.running) {
            return;
        }
        this.running = true;
        try {
            const rows = await this.db.outboxEvent.findMany({
                where: { deliveredAt: null },
                orderBy: [{ createdAt: "asc" }, { id: "asc" }],
                take: 25,
            });
            for (const row of rows) {
                try {
                    const event = payment_captured_contract_1.paymentCapturedSchema.parse(row.payload);
                    await this.publisher.publish(event);
                    await this.db.outboxEvent.updateMany({
                        where: { id: row.id, deliveredAt: null },
                        data: { deliveredAt: new Date() },
                    });
                }
                catch (error) {
                    console.error("Outbox delivery failed", row.id, error);
                }
            }
        }
        catch (error) {
            console.error("Outbox polling failed", error);
        }
        finally {
            this.running = false;
        }
    }
}
exports.OutboxPublisher = OutboxPublisher;
//# sourceMappingURL=outbox.publisher.js.map