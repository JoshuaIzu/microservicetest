"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementService = void 0;
class SettlementService {
    settlementRepo;
    constructor(settlementRepo) {
        this.settlementRepo = settlementRepo;
    }
    reconcile = async (ownerId, dto) => {
        return this.settlementRepo.recordAndMatch(ownerId, dto);
    };
}
exports.SettlementService = SettlementService;
//# sourceMappingURL=settlement.service.js.map