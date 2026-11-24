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
        status: true,
      },
    });

    if (!payment) {
      return null;
    }

    const fieldsMatch =
      payment.provider === dto.provider &&
      payment.currency === dto.currency &&
      payment.amountMinor === dto.amountMinor;

    const journal = fieldsMatch
      ? await this.db.journal.findUnique({
          where: { paymentId: payment.id },
          select: { paymentId: true },
        })
      : null;

    const settled =
      payment.status === "CAPTURED" && journal !== null;

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
      status: !fieldsMatch ? "discrepancy" : settled ? "matched" : "pending",
      paymentId: payment.id,
    };
  }
}
