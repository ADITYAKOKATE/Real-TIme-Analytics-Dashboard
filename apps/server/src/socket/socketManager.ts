import { Server as SocketServer, Socket } from 'socket.io';
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

// In-memory buffer replacing Redis
const eventBuffer = new Map<string, (AnalyticsEvent & { bufferedAt: number })[]>();

async function bufferEvent(event: AnalyticsEvent): Promise<void> {
  const key = event.eventType;
  const entry = { ...event, bufferedAt: Date.now() };

  if (!eventBuffer.has(key)) {
    eventBuffer.set(key, []);
  }

  const list = eventBuffer.get(key)!;
  list.unshift(entry); // Add to beginning

  // Keep last 300 events
  if (list.length > 300) {
    list.pop();
  }

  // Cleanup old events (older than 60s)
  const now = Date.now();
  while (list.length > 0 && now - list[list.length - 1].bufferedAt > 60_000) {
    list.pop();
  }
}

async function replayBufferedEvents(socket: Socket): Promise<void> {
  const buffered: AnalyticsEvent[] = [];
  const now = Date.now();

  eventBuffer.forEach((events, _key) => {
    // Only replay events within the last 60 seconds
    const recent = events.filter((e) => now - e.bufferedAt <= 60_000);
    buffered.push(...recent);
  });

  if (buffered.length > 0) {
    socket.emit('replay', {
      events: buffered.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
      count: buffered.length,
    });
  }
}
