import type { PrismaClient } from "@prisma/client";
import type { ISettlementRepository } from "./settlement-repository.interface";
import type { ISettlementDTO, SettlementResult } from "./settlement.types";

export class SettlementRepository implements ISettlementRepository {
  constructor(private readonly db: PrismaClient) {}

  public async recordAndMatch(
    ownerId: string,
    dto: ISettlementDTO,
  ): Promise<SettlementResult> {
    const payment = await this.db.payment.findFirst({
      where: { id: dto.paymentId, ownerId },
      select: {
        id: true,
        provider: true,
        currency: true,
        amountMinor: true,
      },
    });

    if (!payment) {
      return null;
    }

    const matched =
      payment.provider === dto.provider &&
      payment.currency === dto.currency &&
      payment.amountMinor === dto.amountMinor;

    await this.db.settlement.upsert({
      where: { paymentId: payment.id },
      create: {
        paymentId: payment.id,
        amountMinor: dto.amountMinor,
        currency: dto.currency,
        provider: dto.provider,
      },
      update: {
        amountMinor: dto.amountMinor,
        currency: dto.currency,
        provider: dto.provider,
      },
    });

    return {
      status: matched ? "matched" : "discrepancy",
      paymentId: payment.id,
    };
  }
}
