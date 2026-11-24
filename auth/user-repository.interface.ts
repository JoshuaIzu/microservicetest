import type { ICreateUserParams, IUser } from "./auth.types";

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  create(data: ICreateUserParams): Promise<IUser | null>;
}

export interface ITokenRevocationRepository {
  revokeToken(tokenId: string, expiresAt: Date): Promise<void>;
  isTokenRevoked(tokenId: string): Promise<boolean>;
}