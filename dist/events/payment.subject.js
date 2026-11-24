"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSubject = void 0;
class PaymentSubject {
    observers = new Set();
    subscribe(observer) {
        this.observers.add(observer);
        return () => {
            this.observers.delete(observer);
        };
    }
    async publish(event) {
        if (this.observers.size === 0) {
            throw new Error("No payment observers are registered");
        }
        for (const observer of this.observers) {
            await observer(event);
        }
    }
}
exports.PaymentSubject = PaymentSubject;
//# sourceMappingURL=payment.subject.js.map