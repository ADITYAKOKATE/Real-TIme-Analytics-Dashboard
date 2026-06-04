import dotenv from 'dotenv';
import path from 'path';
// Load .env from apps/server
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectMongoDB } from '../config/database';
import { MetricModel, MetricHourlyModel } from '../models/Metric';

const eventTypes = ['page_view', 'click', 'conversion', 'api_call', 'error'];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function run() {
  console.log(`Connecting to: ${process.env.MONGODB_URI?.split('@')[1]}`);
  await connectMongoDB();
  console.log('Connected to Cloud MongoDB. Seeding data...');

  // Clear existing data (if any)
  await MetricModel.deleteMany({});
  await MetricHourlyModel.deleteMany({});
  console.log('Cleared existing metrics');

  const now = Date.now();
  const metrics = [];
  
  for (let i = 0; i < 500; i++) {
    const type = eventTypes[randomBetween(0, eventTypes.length - 1)];
    const timestamp = new Date(now - randomBetween(0, 3600_000));
    
    // Create a 1-minute bucket mock
    timestamp.setSeconds(0, 0);

    metrics.push({
      timestamp,
      metadata: { eventType: type, userId: `user_${randomBetween(1, 100)}` },
      count: randomBetween(1, 10),
      uniqueUsers: randomBetween(1, 10),
      totalValue: type === 'conversion' ? randomBetween(50, 500) : 0,
      avgDuration: type === 'api_call' ? randomBetween(20, 2000) : 0,
    });
  }

  await MetricModel.insertMany(metrics);
  console.log('✅ Successfully seeded 500 records into the remote MongoDB Atlas cluster!');

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
