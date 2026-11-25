import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type {
  CaptureNotice,
  PaymentCaptured,
} from "../events/payment-captured.contract";
import type { IPaymentRepository } from "./payment-repository.interface";
import {
  paymentSchema,
  type CaptureResult,
  type ChargeStatus,
  type ICreatePaymentParams,
  type IPayment,
} from "./payment.types";

const paymentSelect = {
  id: true,
  amountMinor: true,
  currency: true,
  provider: true,
  status: true,
  chargeStatus: true,
  chargeReference: true,
} satisfies Prisma.PaymentSelect;

export class PaymentRepository implements IPaymentRepository {
  constructor(private readonly db: PrismaClient) {}

  public async createOrFind(
    data: ICreatePaymentParams,
  ): Promise<{ payment: IPayment; created: boolean }> {
    try {
      const record = await this.db.payment.create({
        data,
        select: paymentSelect,
      });

      return { payment: paymentSchema.parse(record), created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.db.payment.findUnique({
          where: {
            ownerId_key: { ownerId: data.ownerId, key: data.key },
          },
          select: paymentSelect,
        });

        if (existing) {
          return { payment: paymentSchema.parse(existing), created: false };
        }
      }

      throw error;
    }
  }

  public async findById(
    paymentId: string,
    ownerId: string,
  ): Promise<IPayment | null> {
    const record = await this.db.payment.findFirst({
      where: { id: paymentId, ownerId },
      select: paymentSelect,
    });

    return record ? paymentSchema.parse(record) : null;
  }

  public async findAll(ownerId: string): Promise<IPayment[]> {
    const records = await this.db.payment.findMany({
      where: { ownerId },
      select: paymentSelect,
    });

    return records.map((record) => paymentSchema.parse(record));
  }

  public async recordChargeOutcome(
    paymentId: string,
    chargeStatus: ChargeStatus,
    chargeReference: string,
  ): Promise<void> {
    await this.db.payment.update({
      where: { id: paymentId },
      data: { chargeStatus, chargeReference },
    });
  }

  public async capture(notice: CaptureNotice): Promise<CaptureResult> {
    const { paymentId, provider, currency, amountMinor } = notice;

    return this.db.$transaction(
      async (tx): Promise<CaptureResult> => {
        const updated = await tx.payment.updateMany({
          where: {
            id: paymentId,
            status: "PENDING",
            provider,
            currency,
            amountMinor,
          },
          data: { status: "CAPTURED" },
        });

        if (updated.count === 0) {
          const existing = await tx.payment.findUnique({
            where: { id: paymentId },
            select: paymentSelect,
          });

          if (!existing) {
            return "unmatched";
          }

          const sameCapture =
            existing.status === "CAPTURED" &&
            existing.provider === provider &&
            existing.currency === currency &&
            existing.amountMinor === amountMinor;

          return sameCapture ? "duplicate" : "mismatch";
        }

        const { ownerId } = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId },
          select: { ownerId: true },
        });

        const event: PaymentCaptured = {
          ownerId,
          ...notice,
          id: randomUUID(),
          type: "payment.captured.v2",
        };

        await tx.outboxEvent.create({
          data: { id: event.id, payload: event },
        });

        return "applied";
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}