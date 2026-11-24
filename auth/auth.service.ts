import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

import type { IPasswordHasher } from "./password-hasher";
import {
  jwtPayloadSchema,
  type IAuthResponse,
  type IJwtPayload,
  type ILoginDTO,
  type ISignupDTO,
  type IUser,
} from "./auth.types";

import type {
  ITokenRevocationRepository,
  IUserRepository,
} from "./user-repository.interface";

export { BCRYPT_ROUNDS } from "./password-hasher";

export class AuthService {
  private readonly issuer = "fintech-identity";
  private readonly audience = "fintech-api";
  private readonly tokenLifetime = "15m";

  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenRepo: ITokenRevocationRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly jwtSecret: string,
  ) {
    if (!jwtSecret.trim()) {
      throw new Error("JWT_SECRET is required");
    }
  }

  public async signUp(dto: ISignupDTO): Promise<IAuthResponse | null> {
    const email = this.normalizeEmail(dto.email);
    const passwordHash = await this.passwordHasher.hash(dto.password);

    const user = await this.userRepo.create({ email, passwordHash });

    return user ? this.buildAuthResponse(user) : null;
  }

  public async login(dto: ILoginDTO): Promise<IAuthResponse | null> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.userRepo.findByEmail(email);

    const passwordMatches = await this.passwordHasher.compare(
      dto.password,
      user?.passwordHash ?? null,
    );

    if (!user || !passwordMatches) {
      return null;
    }

    return this.buildAuthResponse(user);
  }

  public async getMe(userId: string): Promise<IAuthResponse["user"] | null> {
    const user = await this.userRepo.findById(userId);

    return user ? this.toResponseUser(user) : null;
  }

  public async authenticate(token: string): Promise<IJwtPayload | null> {
    let decoded: unknown;

    try {
      decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ["HS256"],
        issuer: this.issuer,
        audience: this.audience,
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return null;
      }

      throw error;
    }

    const result = jwtPayloadSchema.safeParse(decoded);

    if (!result.success) {
      return null;
    }

    const payload = result.data;
    const revoked = await this.tokenRepo.isTokenRevoked(payload.jti);

    return revoked ? null : payload;
  }

  public async logout(payload: IJwtPayload): Promise<void> {
    const expiresAt = new Date(payload.exp * 1000);

    await this.tokenRepo.revokeToken(payload.jti, expiresAt);
  }

  private buildAuthResponse(user: IUser): IAuthResponse {
    const token = jwt.sign({}, this.jwtSecret, {
      algorithm: "HS256",
      issuer: this.issuer,
      audience: this.audience,
      subject: user.id,
      jwtid: randomUUID(),
      expiresIn: this.tokenLifetime,
    });

    return {
      user: this.toResponseUser(user),
      token,
    };
  }

  private toResponseUser(user: IUser): IAuthResponse["user"] {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}