import { Kafka, logLevel } from 'kafkajs';

export const TOPICS = {
  PAGE_VIEWS: 'page_views',
  CLICKS: 'clicks',
  CONVERSIONS: 'conversions',
  API_CALLS: 'api_calls',
  ERRORS: 'errors',
  DEAD_LETTER: 'analytics.dlq',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

let kafka: Kafka;

export async function initKafka(): Promise<void> {
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

  kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'analytics-server',
    brokers,
    logLevel: logLevel.WARN,
    retry: {
      initialRetryTime: 300,
      retries: 8,
    },
  });

  // Create topics if not exist
  const admin = kafka.admin();
  await admin.connect();
  const existingTopics = await admin.listTopics();

  const topicsToCreate = Object.values(TOPICS).filter(
    (t) => !existingTopics.includes(t)
  );

  if (topicsToCreate.length > 0) {
    await admin.createTopics({
      topics: topicsToCreate.map((topic) => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1,
      })),
    });
    console.log(`✅ Kafka topics created: ${topicsToCreate.join(', ')}`);
  }

  await admin.disconnect();
  console.log('✅ Kafka initialized');
}

export function getKafka(): Kafka {
  if (!kafka) throw new Error('Kafka not initialized. Call initKafka() first.');
  return kafka;
}
