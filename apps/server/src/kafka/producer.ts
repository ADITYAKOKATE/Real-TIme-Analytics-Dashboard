import { getKafka, TOPICS } from './kafkaClient';
import { AnalyticsEvent } from '@analytics/shared';

let producer: ReturnType<ReturnType<typeof getKafka>['producer']>;

export async function getProducer() {
  if (!producer) {
    producer = getKafka().producer({
      maxInFlightRequests: 5,
      idempotent: false,
    });
    await producer.connect();
    console.log('✅ Kafka producer connected');
  }
  return producer;
}

export async function publishEvent(event: AnalyticsEvent): Promise<void> {
  const p = await getProducer();
  const topicMap: Record<string, string> = {
    page_view: TOPICS.PAGE_VIEWS,
    click: TOPICS.CLICKS,
    conversion: TOPICS.CONVERSIONS,
    api_call: TOPICS.API_CALLS,
    error: TOPICS.ERRORS,
  };

  const topic = topicMap[event.eventType];
  if (!topic) throw new Error(`No Kafka topic for event type: ${event.eventType}`);

  await p.send({
    topic,
    messages: [
      {
        key: event.userId, // partition key for ordering per user
        value: JSON.stringify(event),
        timestamp: new Date(event.timestamp).getTime().toString(),
      },
    ],
  });
}

export async function publishToDLQ(
  rawMessage: string,
  errors: string[]
): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic: TOPICS.DEAD_LETTER,
    messages: [
      {
        value: JSON.stringify({
          originalMessage: rawMessage,
          errors,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });
}
