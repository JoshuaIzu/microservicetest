import { Prisma, type PrismaClient } from "@demo/ledger-db";
import type { IJournalRepository } from "./journal-repository.interface";
import type { ICreateJournalParams } from "./ledger.types";

export class JournalRepository implements IJournalRepository {
  constructor(private readonly db: PrismaClient) {}

  public async postOnce(data: ICreateJournalParams): Promise<void> {
    const { eventId, paymentId, currency, entries } = data;

    try {
      await this.db.journal.create({
        data: {
          eventId,
          paymentId,
          currency,
          entries: { create: entries },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.db.journal.findUnique({
          where: { eventId },
          select: { paymentId: true },
        });

        if (existing?.paymentId === paymentId) {
          return;
        }
      }

      throw error;
    }
  }
}