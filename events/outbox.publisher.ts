import type { PrismaClient } from "@prisma/client";
import { paymentCapturedSchema } from "./payment-captured.contract";
import type { IPaymentEventPublisher } from "./payment.subject";

export class OutboxPublisher {
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    private readonly db: PrismaClient,
    private readonly publisher: IPaymentEventPublisher,
  ) {}

  public start(intervalMs = 1000): void {
    if (this.timer) {
      return;
    }

    void this.publishPending();

    this.timer = setInterval(() => {
      void this.publishPending();
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public async publishPending(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const rows = await this.db.outboxEvent.findMany({
        where: { deliveredAt: null },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 25,
      });

      for (const row of rows) {
        try {
          const event = paymentCapturedSchema.parse(row.payload);

          await this.publisher.publish(event);

          await this.db.outboxEvent.updateMany({
            where: { id: row.id, deliveredAt: null },
            data: { deliveredAt: new Date() },
          });
        } catch (error) {
          console.error("Outbox delivery failed", row.id, error);
        }
      }
    } catch (error) {
      console.error("Outbox polling failed", error);
    } finally {
      this.running = false;
    }
  }
}