"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BcryptPasswordHasher = exports.BCRYPT_ROUNDS = void 0;
const node_crypto_1 = require("node:crypto");
const bcrypt_1 = __importDefault(require("bcrypt"));
exports.BCRYPT_ROUNDS = 12;
class BcryptPasswordHasher {
    dummyHash;
    hash(plain) {
        return bcrypt_1.default.hash(plain, exports.BCRYPT_ROUNDS);
    }
    async compare(plain, hash) {
        return bcrypt_1.default.compare(plain, await (hash ?? this.getDummyHash()));
    }
    getDummyHash() {
        this.dummyHash ??= this.hash((0, node_crypto_1.randomUUID)());
        return this.dummyHash;
    }
}
exports.BcryptPasswordHasher = BcryptPasswordHasher;
//# sourceMappingURL=password-hasher.js.map