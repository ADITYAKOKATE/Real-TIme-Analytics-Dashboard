import { EnrichedEvent } from './enricher';
import { EventType } from '@analytics/shared';

// In-memory 1-minute tumbling windows
// Key: `eventType:minuteBucket`
interface WindowAccumulator {
  eventType: EventType;
  minuteBucket: Date;
  count: number;
  uniqueUsers: Set<string>;
  totalValue: number;
  totalDuration: number;
  errorCount: number;
}

const windows = new Map<string, WindowAccumulator>();
const FLUSH_INTERVAL_MS = 60_000; // 1 minute

function getMinuteBucket(timestamp: string): Date {
  const d = new Date(timestamp);
  d.setSeconds(0, 0);
  return d;
}

function getWindowKey(eventType: EventType, bucket: Date): string {
  return `${eventType}:${bucket.toISOString()}`;
}

export function accumulateEvent(event: EnrichedEvent): void {
  const bucket = getMinuteBucket(event.timestamp);
  const key = getWindowKey(event.eventType, bucket);

  if (!windows.has(key)) {
    windows.set(key, {
      eventType: event.eventType,
      minuteBucket: bucket,
      count: 0,
      uniqueUsers: new Set(),
      totalValue: 0,
      totalDuration: 0,
      errorCount: 0,
    });
  }

  const w = windows.get(key)!;
  w.count++;
  w.uniqueUsers.add(event.userId);

  const meta = event.metadata as unknown as Record<string, number>;
  if (event.eventType === 'conversion' && meta.value) {
    w.totalValue += meta.value;
  }
  if (event.eventType === 'api_call' && meta.durationMs) {
    w.totalDuration += meta.durationMs;
  }
  if (event.eventType === 'error') {
    w.errorCount++;
  }
}

export function flushWindows(
  onFlush: (agg: {
    eventType: EventType;
    timestamp: Date;
    count: number;
    uniqueUsers: number;
    totalValue: number;
    avgDuration: number;
  }) => Promise<void>
): void {
  const now = Date.now();
  const keysToFlush: string[] = [];

  windows.forEach((w, key) => {
    // Only flush windows older than 1 minute
    if (now - w.minuteBucket.getTime() >= FLUSH_INTERVAL_MS) {
      keysToFlush.push(key);
    }
  });

  keysToFlush.forEach(async (key) => {
    const w = windows.get(key)!;
    console.log(`[Aggregator] Flushing ${w.count} events for ${w.eventType} at bucket ${w.minuteBucket.toISOString()}`);
    await onFlush({
      eventType: w.eventType,
      timestamp: w.minuteBucket,
      count: w.count,
      uniqueUsers: w.uniqueUsers.size,
      totalValue: w.totalValue,
      avgDuration: w.count > 0 ? w.totalDuration / w.count : 0,
    });
    windows.delete(key);
  });
  if (keysToFlush.length === 0 && windows.size > 0) {
    console.log(`[Aggregator] Skipped flush. ${windows.size} windows are not yet older than 1 minute.`);
  }
}

// Start auto-flush every minute
export function startWindowFlusher(
  onFlush: Parameters<typeof flushWindows>[0]
): void {
  setInterval(() => flushWindows(onFlush), FLUSH_INTERVAL_MS);
  console.log('✅ 1-minute aggregation window flusher started');
}
