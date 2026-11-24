"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyRoutingStrategy = void 0;
const DEFAULT_PROVIDERS = {
    NGN: "MOCK_NG",
    USD: "MOCK_US",
};
class CurrencyRoutingStrategy {
    providers;
    constructor(overrides = {}) {
        this.providers = { ...DEFAULT_PROVIDERS, ...overrides };
    }
    select(dto) {
        return this.providers[dto.currency];
    }
}
exports.CurrencyRoutingStrategy = CurrencyRoutingStrategy;
//# sourceMappingURL=currency-routing.strategy.js.map