import type { PrismaClient } from "@demo/reconciliation-db";
import type { BrokerEvent } from "../events/payment-captured.contract";
import type { ISettlementRepository } from "./settlement-repository.interface";
import type { ISettlementDTO, SettlementResult } from "./settlement.types";

export class SettlementRepository implements ISettlementRepository {
  constructor(private readonly db: PrismaClient) {}

  public applyEvent = async (event: BrokerEvent): Promise<void> => {
    if (event.type === "payment.captured.v2") {
      const { paymentId, id, ownerId, provider, currency, amountMinor } = event;
      await this.db.capturedPayment.upsert({
        where: { paymentId },
        create: { paymentId, eventId: id, ownerId, provider, currency, amountMinor },
        update: {},
      });
      return;
    }

    const { paymentId, captureEventId, currency, amountMinor } = event;
    await this.db.postedJournal.upsert({
      where: { paymentId },
      create: { paymentId, captureEventId, currency, amountMinor },
      update: {},
    });
  };

  public async recordAndMatch(
    ownerId: string,
    dto: ISettlementDTO,
  ): Promise<SettlementResult> {
    return this.db.$transaction(async tx => {
      const { paymentId, provider, currency, amountMinor } = dto;
      const payment = await tx.capturedPayment.findUnique({
        where: { paymentId, ownerId },
      });

      if (!payment) return null;

      await tx.settlement.upsert({
        where: { paymentId },
        create: dto,
        update: { provider, currency, amountMinor },
      });

      if (
        payment.provider !== provider ||
        payment.currency !== currency ||
        payment.amountMinor !== amountMinor
      ) {
        return { status: "discrepancy", paymentId };
      }

      const journal = await tx.postedJournal.findUnique({ where: { paymentId } });
      if (!journal) return { status: "pending", paymentId };

      const matches =
        journal.captureEventId === payment.eventId &&
        journal.currency === currency &&
        journal.amountMinor === amountMinor;

      return { status: matches ? "matched" : "discrepancy", paymentId };
    });
  }
}
