/**
 * Seed script: generates realistic fake analytics events into Kafka
 * Run: npm run seed --workspace=apps/server
 */
import 'dotenv/config';
import { initKafka } from '../kafka/kafkaClient';
import { publishEvent } from '../kafka/producer';
import { AnalyticsEvent, EventType } from '@analytics/shared';
import { v4 as uuidv4 } from 'uuid';

const USERS = Array.from({ length: 50 }, () => uuidv4());
const PAGES = ['/home', '/pricing', '/docs', '/blog', '/dashboard', '/signup', '/login'];
const ENDPOINTS = ['/api/users', '/api/metrics', '/api/events', '/api/dashboards'];
const DEVICES = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedEvents() {
  await initKafka();
  console.log('🌱 Starting event seeding...');

  const totalEvents = 500;
  let count = 0;

  const eventTypes: EventType[] = ['page_view', 'click', 'conversion', 'api_call', 'error'];
  const weights = [0.45, 0.25, 0.10, 0.15, 0.05]; // weighted distribution

  for (let i = 0; i < totalEvents; i++) {
    const rand = Math.random();
    let cumulative = 0;
    let eventType: EventType = 'page_view';
    for (let j = 0; j < weights.length; j++) {
      cumulative += weights[j];
      if (rand < cumulative) { eventType = eventTypes[j]; break; }
    }

    const userId = randomItem(USERS);
    const timestamp = new Date(Date.now() - randomBetween(0, 3600_000)).toISOString();

    let event: AnalyticsEvent;

    switch (eventType) {
      case 'page_view':
        event = {
          eventId: uuidv4(), eventType, userId, sessionId: uuidv4(), timestamp,
          metadata: { url: randomItem(PAGES), referrer: randomItem(PAGES), title: 'Analytics Dashboard', userAgent: randomItem(DEVICES) }
        }; break;
      case 'click':
        event = {
          eventId: uuidv4(), eventType, userId, sessionId: uuidv4(), timestamp,
          metadata: { elementId: `btn-${randomBetween(1, 10)}`, elementType: 'button', url: randomItem(PAGES), userAgent: randomItem(DEVICES) }
        }; break;
      case 'conversion':
        event = {
          eventId: uuidv4(), eventType, userId, sessionId: uuidv4(), timestamp,
          metadata: { conversionType: randomItem(['signup', 'purchase', 'subscription']), value: randomBetween(10, 500), currency: 'USD', url: randomItem(PAGES) }
        }; break;
      case 'api_call':
        event = {
          eventId: uuidv4(), eventType, userId, sessionId: uuidv4(), timestamp,
          metadata: { method: randomItem(['GET', 'POST', 'PUT', 'DELETE']), endpoint: randomItem(ENDPOINTS), statusCode: randomItem([200, 200, 200, 201, 400, 404, 500]), durationMs: randomBetween(5, 2000) }
        }; break;
      case 'error':
        event = {
          eventId: uuidv4(), eventType, userId, sessionId: uuidv4(), timestamp,
          metadata: { errorCode: randomItem(['E001', 'E002', 'E500']), errorMessage: randomItem(['Network error', 'Timeout', 'Unknown error']), url: randomItem(PAGES) }
        }; break;
    }

    await publishEvent(event!);
    count++;
    if (count % 50 === 0) console.log(`  ✅ ${count}/${totalEvents} events published`);
    await new Promise((r) => setTimeout(r, 20)); // slight delay
  }

  console.log(`🎉 Done! ${count} events published to Kafka.`);
  process.exit(0);
}

seedEvents().catch((err) => { console.error(err); process.exit(1); });
