import { Server as SocketServer, Socket } from 'socket.io';
import { getRedisClient } from '../config/redis';
import { AnalyticsEvent, MetricUpdate, AlertTriggered } from '@analytics/shared';

let io: SocketServer;

// Track per-metric live counts for spike detection
const lastMinuteCounts = new Map<string, number>();

export function setupSocketIO(socketServer: SocketServer): void {
  io = socketServer;

  io.on('connection', async (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Send buffered events on reconnect
    await replayBufferedEvents(socket);

    // Client subscribes to specific metric rooms
    socket.on('subscribe', (metrics: string[]) => {
      metrics.forEach((metric) => {
        socket.join(`metric:${metric}`);
      });
      socket.emit('subscribed', { metrics });
    });

    socket.on('unsubscribe', (metrics: string[]) => {
      metrics.forEach((metric) => {
        socket.leave(`metric:${metric}`);
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  // Emit dashboard-wide heartbeat every 5 seconds
  setInterval(() => {
    io.emit('heartbeat', { timestamp: new Date().toISOString() });
  }, 5000);

  console.log('✅ Socket.io setup complete');
}

export function emitMetricUpdate(event: AnalyticsEvent): void {
  if (!io) return;

  const currentCount = (lastMinuteCounts.get(event.eventType) || 0) + 1;
  lastMinuteCounts.set(event.eventType, currentCount);

  const update: MetricUpdate = {
    eventType: event.eventType,
    timestamp: event.timestamp,
    count: currentCount,
    uniqueUsers: 1,
    delta: 0,
  };

  // Emit to metric-specific room
  io.to(`metric:${event.eventType}`).emit('metric:update', update);
  // Also emit to global analytics room
  io.to('metric:all').emit('metric:update', update);

  // Buffer in Redis (last 60s of events)
  bufferEvent(event);
}

export function emitAlert(alert: AlertTriggered): void {
  if (!io) return;
  io.emit('alert:triggered', alert);
}

async function bufferEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `event_buffer:${event.eventType}`;
    const entry = JSON.stringify({ ...event, bufferedAt: Date.now() });

    await redis.lpush(key, entry);
    await redis.ltrim(key, 0, 299); // Keep last 300 events per type
    await redis.expire(key, 60); // 60 second expiry
  } catch (err) {
    console.error('Redis buffer error:', err);
  }
}

async function replayBufferedEvents(socket: Socket): Promise<void> {
  try {
    const redis = getRedisClient();
    const eventTypes = ['page_view', 'click', 'conversion', 'api_call', 'error'];
    const buffered: AnalyticsEvent[] = [];

    for (const type of eventTypes) {
      const key = `event_buffer:${type}`;
      const events = await redis.lrange(key, 0, -1);
      events.forEach((e) => {
        try {
          buffered.push(JSON.parse(e));
        } catch {}
      });
    }

    if (buffered.length > 0) {
      socket.emit('replay', {
        events: buffered.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
        count: buffered.length,
      });
    }
  } catch (err) {
    console.error('Redis replay error:', err);
  }
}
