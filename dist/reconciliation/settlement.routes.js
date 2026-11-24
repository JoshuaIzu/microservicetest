"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSettlementRoutes = createSettlementRoutes;
const express_1 = require("express");
function createSettlementRoutes(controller, authenticate) {
    const router = (0, express_1.Router)();
    router.post("/", authenticate, (0, express_1.json)({ limit: "8kb" }), controller.reconcile);
    return router;
}
//# sourceMappingURL=settlement.routes.js.map