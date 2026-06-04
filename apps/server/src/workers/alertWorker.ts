import { Queue, Worker, Job } from 'bullmq';
import { Server as SocketServer } from 'socket.io';
import { AlertRuleModel, AlertHistoryModel } from '../models/Alert';
import { MetricModel } from '../models/Metric';
import { emitAlert } from '../socket/socketManager';
import { AlertRule, AlertTriggered } from '@analytics/shared';

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
  };
}

export function startAlertWorker(io: SocketServer): void {
  const connection = getRedisConnection();

  const alertQueue = new Queue('alert-evaluation', { connection });

  // Schedule recurring job every 60 seconds
  alertQueue.upsertJobScheduler('evaluate-alerts', {
    every: 60_000,
  }, {
    name: 'evaluate-all-rules',
    data: {},
    opts: { removeOnComplete: 10, removeOnFail: 20 },
  });

  const worker = new Worker(
    'alert-evaluation',
    async (_job: Job) => {
      await evaluateAllRules();
    },
    { connection }
  );

  worker.on('completed', () => {
    console.log('[AlertWorker] Rule evaluation cycle completed');
  });

  worker.on('failed', (job, err) => {
    console.error(`[AlertWorker] Job ${job?.id} failed:`, err);
  });

  console.log('✅ Alert evaluation worker started');
}

async function evaluateAllRules(): Promise<void> {
  const rules = await AlertRuleModel.find({ status: 'active' });

  for (const rule of rules) {
    try {
      await evaluateRule(rule);
    } catch (err) {
      console.error(`[AlertWorker] Error evaluating rule ${rule.name}:`, err);
    }
  }
}

async function evaluateRule(rule: AlertRule & { _id: string }): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - rule.windowMinutes * 60_000);

  // Query MongoDB timeseries for the metric in the window
  const metrics = await MetricModel.aggregate([
    {
      $match: {
        timestamp: { $gte: windowStart, $lte: now },
        'metadata.eventType': rule.metric,
      },
    },
    {
      $group: {
        _id: null,
        totalCount: { $sum: '$count' },
        avgDuration: { $avg: '$avgDuration' },
        totalValue: { $sum: '$totalValue' },
      },
    },
  ]);

  if (!metrics.length) return;

  const metricData = metrics[0];
  let currentValue = metricData.totalCount;

  if (rule.metric === 'avg_duration') currentValue = metricData.avgDuration || 0;
  if (rule.metric === 'conversion_rate') {
    currentValue = metricData.totalCount > 0
      ? (metricData.totalValue / metricData.totalCount) * 100
      : 0;
  }

  const conditionMet = evaluateCondition(currentValue, rule.operator, rule.threshold);

  // Deduplication: check cooldown
  if (conditionMet) {
    const lastAlert = await AlertHistoryModel.findOne({
      ruleId: rule._id.toString(),
      isRecovery: false,
    }).sort({ triggeredAt: -1 });

    if (lastAlert) {
      const cooldownEnd = new Date(
        new Date(lastAlert.triggeredAt).getTime() + rule.cooldownMinutes * 60_000
      );
      if (now < cooldownEnd) {
        console.log(`[AlertWorker] Rule "${rule.name}" in cooldown, skipping`);
        return;
      }
    }

    // Trigger the alert
    const alertHistory = await AlertHistoryModel.create({
      ruleId: rule._id.toString(),
      ruleName: rule.name,
      triggeredAt: now.toISOString(),
      metricValue: currentValue,
      threshold: rule.threshold,
      channels: rule.channels,
      isRecovery: false,
    });

    await AlertRuleModel.findByIdAndUpdate(rule._id, { status: 'triggered' });

    const alert: AlertTriggered = {
      alertId: alertHistory._id?.toString() || '',
      ruleName: rule.name,
      message: `Alert: "${rule.name}" — ${rule.metric} is ${currentValue.toFixed(2)} (threshold: ${rule.operator} ${rule.threshold})`,
      severity: currentValue > rule.threshold * 1.5 ? 'critical' : 'warning',
      timestamp: now.toISOString(),
      isRecovery: false,
    };

    emitAlert(alert);
    console.log(`[AlertWorker] 🔔 Alert triggered: ${rule.name}`);
  } else if (!conditionMet) {
    // Check if we need to emit recovery
    const lastAlert = await AlertHistoryModel.findOne({
      ruleId: rule._id.toString(),
      isRecovery: false,
      resolvedAt: { $exists: false },
    }).sort({ triggeredAt: -1 });

    if (lastAlert) {
      await AlertHistoryModel.findByIdAndUpdate(lastAlert._id, {
        resolvedAt: now.toISOString(),
      });
      await AlertRuleModel.findByIdAndUpdate(rule._id, { status: 'active' });

      const recovery: AlertTriggered = {
        alertId: lastAlert._id?.toString() || '',
        ruleName: rule.name,
        message: `Recovered: "${rule.name}" — ${rule.metric} is back to normal (${currentValue.toFixed(2)})`,
        severity: 'info',
        timestamp: now.toISOString(),
        isRecovery: true,
      };
      emitAlert(recovery);
      console.log(`[AlertWorker] ✅ Alert resolved: ${rule.name}`);
    }
  }
}

function evaluateCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'gt': return value > threshold;
    case 'lt': return value < threshold;
    case 'gte': return value >= threshold;
    case 'lte': return value <= threshold;
    case 'eq': return value === threshold;
    default: return false;
  }
}
