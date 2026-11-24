"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementController = void 0;
const settlement_types_1 = require("./settlement.types");
class SettlementController {
    settlementService;
    constructor(settlementService) {
        this.settlementService = settlementService;
    }
    reconcile = async (req, res) => {
        const auth = res.locals.auth;
        if (!auth) {
            res.status(401).json({ error: "UNAUTHENTICATED" });
            return;
        }
        const input = settlement_types_1.settlementSchema.safeParse(req.body);
        if (!input.success) {
            res.status(400).json({ error: "INVALID_SETTLEMENT_INPUT" });
            return;
        }
        const result = await this.settlementService.reconcile(auth.sub, input.data);
        if (!result) {
            res.status(404).json({ error: "SETTLEMENT_NOT_FOUND" });
            return;
        }
        res.status(200).json(result);
    };
}
exports.SettlementController = SettlementController;
//# sourceMappingURL=settlement.controller.js.map