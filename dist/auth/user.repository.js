"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const client_1 = require("@prisma/client");
const userSelect = {
    id: true,
    email: true,
    passwordHash: true,
    createdAt: true,
};
class UserRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByEmail(email) {
        return this.db.user.findUnique({
            where: { email },
            select: userSelect,
        });
    }
    async findById(id) {
        return this.db.user.findUnique({
            where: { id },
            select: userSelect,
        });
    }
    async create(data) {
        try {
            return await this.db.user.create({ data, select: userSelect });
        }
        catch (error) {
            const isDuplicateEmailError = error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002" &&
                String(error.meta?.target).includes("email");
            if (isDuplicateEmailError) {
                return null;
            }
            throw error;
        }
    }
    async revokeToken(tokenId, expiresAt) {
        await this.db.revokedToken.createMany({
            data: [{ id: tokenId, expiresAt }],
            skipDuplicates: true,
        });
    }
    async isTokenRevoked(tokenId) {
        const record = await this.db.revokedToken.findUnique({
            where: { id: tokenId },
            select: { id: true },
        });
        return record !== null;
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=user.repository.js.map