import { setTimeout as delay } from "node:timers/promises";
import type { Channel, ConsumeMessage } from "amqplib";
import { brokerEventSchema, type BrokerEvent } from "./payment-captured.contract";
import { connectBroker, declareTopology, type ConsumerQueue } from "./rabbitmq.publisher";

async function handleMessage(
  channel: Channel,
  message: ConsumeMessage,
  handler: (event: BrokerEvent) => Promise<void>,
): Promise<void> {
  const parsed = brokerEventSchema.safeParse(parseJson(message.content));

  if (!parsed.success || parsed.data.type !== message.fields.routingKey) {
    console.error("Invalid broker event", message.properties.messageId);
    channel.nack(message, false, false);
    return;
  }

  try {
    await handler(parsed.data);
  } catch (error) {
    console.error("Consumer will retry:", error);
    await delay(1000);
    channel.nack(message, false, true);
    return;
  }

  channel.ack(message);
}

function parseJson(body: Buffer): unknown {
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    return undefined;
  }
}

export async function consume(
  url: string,
  queue: ConsumerQueue,
  handler: (event: BrokerEvent) => Promise<void>,
): Promise<never> {
  for (;;) {
    try {
      const connection = await connectBroker(url);

      try {
        const channel = await connection.createChannel();
        const closed = new Promise<void>(resolve => {
          channel.once("close", () => resolve());
        });
        channel.on("error", error => console.error("RabbitMQ consumer:", error.message));

        await declareTopology(channel);
        await channel.prefetch(1);
        await channel.consume(queue, message => {
          if (message === null) {
            void connection.close().catch(() => {});
            return;
          }

          void handleMessage(channel, message, handler).catch(error => {
            console.error("Could not acknowledge delivery:", error);
            void connection.close().catch(() => {});
          });
        });

        await closed;
      } finally {
        await connection.close().catch(() => {});
      }
    } catch (error) {
      console.error(`Consumer ${queue} disconnected:`, error);
    }

    await delay(2000);
  }
}
