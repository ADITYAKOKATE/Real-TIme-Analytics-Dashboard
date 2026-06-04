import mongoose from 'mongoose';

export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI!;
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
    await ensureTimeSeriesCollections();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

async function ensureTimeSeriesCollections() {
  const db = mongoose.connection.db!;

  // Create metrics timeseries collection if not exists
  try {
    await db.createCollection('metrics', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'minutes',
      },
      expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days TTL
    });
    console.log('✅ MongoDB timeseries collection "metrics" created');
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 48) {
      console.log('ℹ️  MongoDB collection "metrics" already exists, skipping');
    } else {
      throw err;
    }
  }

  // Hourly rollup collection
  try {
    await db.createCollection('metrics_hourly', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'hours',
      },
      expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
    });
    console.log('✅ MongoDB timeseries collection "metrics_hourly" created');
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 48) {
      console.log('ℹ️  MongoDB collection "metrics_hourly" already exists, skipping');
    } else {
      throw err;
    }
  }
}
