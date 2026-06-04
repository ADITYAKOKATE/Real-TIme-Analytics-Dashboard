import mongoose, { Schema } from 'mongoose';
import { Dashboard } from '@analytics/shared';

const WidgetConfigSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['line', 'area', 'bar', 'heatmap', 'scatter', 'choropleth', 'kpi', 'table', 'alert_list', 'pie'],
      required: true,
    },
    title: { type: String, required: true },
    metric: { type: String, required: true },
    timeRange: {
      type: String,
      enum: ['15m', '1h', '6h', '24h', '7d', '30d'],
      default: '1h',
    },
    dimension: { type: String },
    chartColor: { type: String },
    refreshInterval: { type: Number, default: 30 },
  },
  { _id: false }
);

const GridLayoutSchema = new Schema(
  {
    i: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
  },
  { _id: false }
);

const DashboardSchema = new Schema<Dashboard>(
  {
    name: { type: String, required: true },
    description: { type: String },
    widgets: [WidgetConfigSchema],
    layouts: {
      lg: [GridLayoutSchema],
      md: [GridLayoutSchema],
      sm: [GridLayoutSchema],
    },
    isPublic: { type: Boolean, default: false },
    shareToken: { type: String, unique: true, sparse: true },
    ownerId: { type: String },
  },
  { timestamps: true }
);

export const DashboardModel = mongoose.model<Dashboard>('Dashboard', DashboardSchema);
