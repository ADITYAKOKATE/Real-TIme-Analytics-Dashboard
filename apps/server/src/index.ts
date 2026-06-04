import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { connectMongoDB } from './config/database';
import { connectRedis } from './config/redis';
import { startWindowFlusher } from './kafka/aggregator';
import { MetricModel } from './models/Metric';
import { setupSocketIO } from './socket/socketManager';
import { startAlertWorker } from './workers/alertWorker';
import { metricsRouter } from './routes/metrics';
import { dashboardRouter } from './routes/dashboards';
import { alertsRouter } from './routes/alerts';
import { eventsRouter } from './routes/events';

const app = express();
const httpServer = createServer(app);

// ─── Socket.io setup ───────────────────────────────────────────────
export const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// ─── Middleware ─────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────────
app.use('/api/metrics', metricsRouter);
app.use('/api/dashboards', dashboardRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/events', eventsRouter);

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Bootstrap ──────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectMongoDB();
    await connectRedis();
    
    // Start the 1-minute aggregation flusher (synchronous processing)
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

    setupSocketIO(io);
    startAlertWorker(io);

    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Analytics server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.io ready`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
