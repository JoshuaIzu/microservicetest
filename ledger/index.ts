import { PrismaClient } from "@demo/ledger-db";
import { consume } from "../events/rabbitmq.consumer";
import { RabbitMqPublisher } from "../events/rabbitmq.publisher";
import { JournalRepository } from "./journal.repository";
import { LedgerService } from "./ledger.service";

const url = process.env.AMQP_URL;
if (!url || !process.env.LEDGER_DATABASE_URL) {
  throw new Error("AMQP_URL and LEDGER_DATABASE_URL are required");
}

const db = new PrismaClient();
const ledger = new LedgerService(new JournalRepository(db));
const publisher = new RabbitMqPublisher(url);

void consume(url, "ledger.capture.v2", async event => {
  if (event.type !== "payment.captured.v2") return;

  await ledger.postPaymentCapture(event);

  await publisher.publish({
    type: "ledger.posted.v1",
    paymentId: event.paymentId,
    captureEventId: event.id,
    currency: event.currency,
    amountMinor: event.amountMinor,
  });
});
