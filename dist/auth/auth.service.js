"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.BCRYPT_ROUNDS = void 0;
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_types_1 = require("./auth.types");
var password_hasher_1 = require("./password-hasher");
Object.defineProperty(exports, "BCRYPT_ROUNDS", { enumerable: true, get: function () { return password_hasher_1.BCRYPT_ROUNDS; } });
class AuthService {
    userRepo;
    tokenRepo;
    passwordHasher;
    jwtSecret;
    issuer = "fintech-identity";
    audience = "fintech-api";
    tokenLifetime = "15m";
    constructor(userRepo, tokenRepo, passwordHasher, jwtSecret) {
        this.userRepo = userRepo;
        this.tokenRepo = tokenRepo;
        this.passwordHasher = passwordHasher;
        this.jwtSecret = jwtSecret;
        if (!jwtSecret.trim()) {
            throw new Error("JWT_SECRET is required");
        }
    }
    async signUp(dto) {
        const email = this.normalizeEmail(dto.email);
        const passwordHash = await this.passwordHasher.hash(dto.password);
        const user = await this.userRepo.create({ email, passwordHash });
        return user ? this.buildAuthResponse(user) : null;
    }
    async login(dto) {
        const email = this.normalizeEmail(dto.email);
        const user = await this.userRepo.findByEmail(email);
        const passwordMatches = await this.passwordHasher.compare(dto.password, user?.passwordHash ?? null);
        if (!user || !passwordMatches) {
            return null;
        }
        return this.buildAuthResponse(user);
    }
    async getMe(userId) {
        const user = await this.userRepo.findById(userId);
        return user ? this.toResponseUser(user) : null;
    }
    async authenticate(token) {
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, this.jwtSecret, {
                algorithms: ["HS256"],
                issuer: this.issuer,
                audience: this.audience,
            });
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                return null;
            }
            throw error;
        }
        const result = auth_types_1.jwtPayloadSchema.safeParse(decoded);
        if (!result.success) {
            return null;
        }
        const payload = result.data;
        const revoked = await this.tokenRepo.isTokenRevoked(payload.jti);
        return revoked ? null : payload;
    }
    async logout(payload) {
        const expiresAt = new Date(payload.exp * 1000);
        await this.tokenRepo.revokeToken(payload.jti, expiresAt);
    }
    buildAuthResponse(user) {
        const token = jsonwebtoken_1.default.sign({}, this.jwtSecret, {
            algorithm: "HS256",
            issuer: this.issuer,
            audience: this.audience,
            subject: user.id,
            jwtid: (0, node_crypto_1.randomUUID)(),
            expiresIn: this.tokenLifetime,
        });
        return {
            user: this.toResponseUser(user),
            token,
        };
    }
    toResponseUser(user) {
        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
        };
    }
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map