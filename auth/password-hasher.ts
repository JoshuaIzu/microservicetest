import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";

export const BCRYPT_ROUNDS = 12;

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string | null): Promise<boolean>;
}

export class BcryptPasswordHasher implements IPasswordHasher {
  private dummyHash?: Promise<string>;

  public hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  public async compare(plain: string, hash: string | null): Promise<boolean> {
    return bcrypt.compare(plain, await (hash ?? this.getDummyHash()));
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hash(randomUUID());

    return this.dummyHash;
  }
}
