import amqp, { type Channel } from "amqplib";
import type { BrokerEvent } from "./payment-captured.contract";

const EXCHANGE = "fintech.events";

const bindings = {
  "ledger.capture.v2": ["payment.captured.v2"],
  "reconciliation.events.v1": ["payment.captured.v2", "ledger.posted.v1"],
} as const;

export type ConsumerQueue = keyof typeof bindings;

export interface IPaymentEventPublisher {
  publish(event: BrokerEvent): Promise<void>;
}

export async function connectBroker(url: string) {
  const connection = await amqp.connect(url, { timeout: 5000 });
  connection.on("error", error => console.error("RabbitMQ connection:", error.message));
  return connection;
}

export async function declareTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });

  for (const queue of Object.keys(bindings) as ConsumerQueue[]) {
    const failedQueue = `${queue}.failed`;
    await channel.assertQueue(failedQueue, { durable: true });
    await channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: "",
      deadLetterRoutingKey: failedQueue,
    });

    for (const topic of bindings[queue]) {
      await channel.bindQueue(queue, EXCHANGE, topic);
    }
  }
}

export class RabbitMqPublisher implements IPaymentEventPublisher {
  constructor(private readonly url: string) {}

  public async publish(event: BrokerEvent): Promise<void> {
    const connection = await connectBroker(this.url);

    try {
      const channel = await connection.createConfirmChannel();
      channel.on("error", error => console.error("RabbitMQ publisher:", error.message));
      await declareTopology(channel);

      let returned = false;
      channel.once("return", () => { returned = true; });

      channel.publish(EXCHANGE, event.type, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        mandatory: true,
        contentType: "application/json",
        messageId: event.type === "payment.captured.v2" ? event.id : event.captureEventId,
      });

      await channel.waitForConfirms();

      if (returned) {
        throw new Error(`RabbitMQ could not route ${event.type}`);
      }
    } finally {
      await connection.close().catch(() => {});
    }
  }
}
