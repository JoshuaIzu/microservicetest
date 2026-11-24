"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtPayloadSchema = exports.signupSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const emailSchema = zod_1.z.string()
    .trim()
    .max(254)
    .email()
    .transform((email) => email.toLowerCase());
exports.loginSchema = zod_1.z.object({
    email: emailSchema,
    password: zod_1.z.string().min(1).max(256),
}).strict();
exports.signupSchema = exports.loginSchema.extend({
    password: zod_1.z.string().min(15).max(256),
});
exports.jwtPayloadSchema = zod_1.z.object({
    sub: zod_1.z.string().uuid(),
    jti: zod_1.z.string().uuid(),
    exp: zod_1.z.number().int().positive(),
});
//# sourceMappingURL=auth.types.js.map