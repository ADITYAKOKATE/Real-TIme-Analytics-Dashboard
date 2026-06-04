import mongoose, { Schema } from 'mongoose';
import { AggregatedMetric } from '@analytics/shared';

// Note: The actual timeseries collection is created in database.ts.
// This model operates on top of that collection.
const MetricSchema = new Schema<AggregatedMetric>(
  {
    timestamp: { type: Date, required: true },
    metadata: {
      eventType: { type: String, required: true },
      dimension: { type: String },
      dimensionValue: { type: String },
    },
    count: { type: Number, required: true, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    avgDuration: { type: Number, default: 0 },
    errorRate: { type: Number, default: 0 },
  },
  {
    // Use the timeseries collection we created manually
    collection: 'metrics',
    timestamps: false,
    autoCreate: false,
  }
);

export const MetricModel = mongoose.model<AggregatedMetric>('Metric', MetricSchema);

// Hourly rollup model
const MetricHourlySchema = new Schema(
  {
    timestamp: { type: Date, required: true },
    metadata: {
      eventType: { type: String, required: true },
    },
    count: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    avgDuration: { type: Number, default: 0 },
  },
  { collection: 'metrics_hourly', timestamps: false, autoCreate: false }
);

export const MetricHourlyModel = mongoose.model('MetricHourly', MetricHourlySchema);
