import mongoose, { Schema } from 'mongoose';
import { AlertRule, AlertHistory } from '@analytics/shared';

const AlertRuleSchema = new Schema<AlertRule>(
  {
    name: { type: String, required: true },
    description: { type: String },
    metric: { type: String, required: true },
    operator: { type: String, enum: ['gt', 'lt', 'gte', 'lte', 'eq'], required: true },
    threshold: { type: Number, required: true },
    windowMinutes: { type: Number, required: true, default: 5 },
    channels: [{ type: String, enum: ['email', 'slack', 'webhook'] }],
    channelConfig: {
      email: [{ type: String }],
      slackWebhook: { type: String },
      webhook: { type: String },
    },
    cooldownMinutes: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['active', 'muted', 'triggered', 'resolved'],
      default: 'active',
    },
    muteUntil: { type: String },
  },
  { timestamps: true }
);

export const AlertRuleModel = mongoose.model<AlertRule>('AlertRule', AlertRuleSchema);

const AlertHistorySchema = new Schema<AlertHistory>(
  {
    ruleId: { type: String, required: true },
    ruleName: { type: String, required: true },
    triggeredAt: { type: String, required: true },
    resolvedAt: { type: String },
    metricValue: { type: Number, required: true },
    threshold: { type: Number, required: true },
    channels: [{ type: String }],
    isRecovery: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AlertHistoryModel = mongoose.model<AlertHistory>(
  'AlertHistory',
  AlertHistorySchema
);
