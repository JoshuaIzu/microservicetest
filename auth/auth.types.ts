import { z } from "zod";

export interface IUser {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
}

export interface IAuthResponse {
    user: Omit<IUser, 'passwordHash'>;
    token: string;
}

export interface ILoginDTO {
    email: string;
    password: string;
}

export interface ISignupDTO {
    email: string;
    password: string;
}

export interface ICreateUserParams {
    email: string;
    passwordHash: string;
}

export interface IJwtPayload {
    sub: string;
    jti: string;
    exp: number;
}

const emailSchema = z.string()
  .trim()
  .max(254)
  .email()
  .transform((email: string) => email.toLowerCase());

const withinBcryptLimit = (password: string): boolean =>
  Buffer.byteLength(password, "utf8") <= 72;

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1)
    .max(256)
    .refine(withinBcryptLimit),
}).strict();

export const signupSchema = loginSchema.extend({
  password: z
    .string()
    .min(15)
    .max(256)
    .refine(withinBcryptLimit),
});

export const jwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  jti: z.string().uuid(),
  exp: z.number().int().positive(),
});
