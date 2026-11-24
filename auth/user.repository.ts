import { Prisma, type PrismaClient } from "@prisma/client";
import type { ICreateUserParams, IUser } from "./auth.types";
import type {
  ITokenRevocationRepository,
  IUserRepository,
} from "./user-repository.interface";

const userSelect = {
  id: true,
  email: true,
  passwordHash: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export class UserRepository implements IUserRepository, ITokenRevocationRepository {
  constructor(private readonly db: PrismaClient) {}

  public async findByEmail(email: string): Promise<IUser | null> {
    return this.db.user.findUnique({
      where: { email },
      select: userSelect,
    });
  }

  public async findById(id: string): Promise<IUser | null> {
    return this.db.user.findUnique({
      where: { id },
      select: userSelect,
    });
  }

public async create(data: ICreateUserParams): Promise<IUser | null> {
  try {
    return await this.db.user.create({ data, select: userSelect });
  } catch (error) {
    const isDuplicateEmailError =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      String(error.meta?.target).includes("email");

    if (isDuplicateEmailError) {
      return null;
    }

    throw error;
  }
}

  public async revokeToken(tokenId: string, expiresAt: Date): Promise<void> {
    await this.db.revokedToken.createMany({
      data: [{ id: tokenId, expiresAt }],
      skipDuplicates: true,
    });
  }

  public async isTokenRevoked(tokenId: string): Promise<boolean> {
    const record = await this.db.revokedToken.findUnique({
      where: { id: tokenId },
      select: { id: true },
    });

    return record !== null;
  }
}