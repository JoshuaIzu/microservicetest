"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentRoutes = createPaymentRoutes;
const express_1 = require("express");
function createPaymentRoutes(controller, authenticate) {
    const router = (0, express_1.Router)();
    router.post("/webhooks/:provider", (0, express_1.raw)({ type: "application/json", limit: "8kb", inflate: false }), controller.handleWebhook);
    router.post("/", authenticate, (0, express_1.json)({ limit: "8kb" }), controller.createPayment);
    router.get("/:id", authenticate, controller.getPaymentById);
    return router;
}
//# sourceMappingURL=payment.routes.js.map