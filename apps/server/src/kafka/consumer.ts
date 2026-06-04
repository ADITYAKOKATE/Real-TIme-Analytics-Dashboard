import { getKafka, TOPICS } from './kafkaClient';
import { validateEvent } from './schemaValidator';
import { enrichEvent } from './enricher';
import { accumulateEvent, startWindowFlusher } from './aggregator';
import { publishToDLQ } from './producer';
import { MetricModel } from '../models/Metric';
import { emitMetricUpdate } from '../socket/socketManager';
import { AnalyticsEvent } from '@analytics/shared';

const ALL_TOPICS = [
  TOPICS.PAGE_VIEWS,
  TOPICS.CLICKS,
  TOPICS.CONVERSIONS,
  TOPICS.API_CALLS,
  TOPICS.ERRORS,
];

export async function startKafkaConsumer(): Promise<void> {
  const kafka = getKafka();
  const consumer = kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID || 'analytics-consumer-group',
  });

  await consumer.connect();
  await consumer.subscribe({ topics: ALL_TOPICS, fromBeginning: true });

  // Start the 1-minute aggregation flusher
  startWindowFlusher(async (agg) => {
    try {
      await MetricModel.create({
        timestamp: agg.timestamp,
        metadata: { eventType: agg.eventType },
        count: agg.count,
        uniqueUsers: agg.uniqueUsers,
        totalValue: agg.totalValue,
        avgDuration: agg.avgDuration,
      });
    } catch (err) {
      console.error('Failed to write aggregated metric to MongoDB:', err);
    }
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const rawValue = message.value?.toString();
      if (!rawValue) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawValue);
      } catch {
        await publishToDLQ(rawValue, ['Invalid JSON']);
        return;
      }

      const { valid, errors } = validateEvent(parsed);
      if (!valid) {
        console.warn('Invalid event, sending to DLQ:', errors);
        await publishToDLQ(rawValue, errors || []);
        return;
      }

      const event = parsed as AnalyticsEvent;
      const enriched = enrichEvent(event);

      // Accumulate in 1-min window
      accumulateEvent(enriched);

      // Emit live update via socket.io
      emitMetricUpdate(event);
      console.log(`[Consumer] Processed event ${event.eventType} for ${event.userId}`);
    },
  });

  console.log('✅ Kafka consumer running');
}
