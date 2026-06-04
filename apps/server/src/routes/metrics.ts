import { Router, Request, Response } from 'express';
import { MetricModel } from '../models/Metric';
import { ApiResponse, TimeSeriesDataPoint } from '@analytics/shared';

export const metricsRouter = Router();

// GET /api/metrics/timeseries?eventType=page_view&from=2024-01-01&to=2024-01-02&granularity=minutes
metricsRouter.get('/timeseries', async (req: Request, res: Response) => {
  try {
    const { eventType, from, to, granularity = 'minutes' } = req.query;
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - 3600_000);
    const toDate = to ? new Date(to as string) : new Date();

    const groupBy = granularity === 'hours'
      ? { $dateToString: { format: '%Y-%m-%dT%H:00:00.000Z', date: '$timestamp' } }
      : { $dateToString: { format: '%Y-%m-%dT%H:%M:00.000Z', date: '$timestamp' } };

    const match: Record<string, unknown> = {
      timestamp: { $gte: fromDate, $lte: toDate },
    };
    if (eventType) match['metadata.eventType'] = eventType;

    const data = await MetricModel.aggregate<{
      _id: string;
      count: number;
      uniqueUsers: number;
      totalValue: number;
      avgDuration: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: groupBy,
          count: { $sum: '$count' },
          uniqueUsers: { $sum: '$uniqueUsers' },
          totalValue: { $sum: '$totalValue' },
          avgDuration: { $avg: '$avgDuration' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const response: ApiResponse<TimeSeriesDataPoint[]> = {
      success: true,
      data: data.map((d) => ({
        timestamp: d._id,
        value: d.count,
        label: eventType as string || 'all',
      })),
    };
    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/metrics/summary — overall KPIs for the last 1 hour
metricsRouter.get('/summary', async (_req: Request, res: Response) => {
  try {
    const oneHourAgo = new Date(Date.now() - 3600_000);
    const data = await MetricModel.aggregate([
      { $match: { timestamp: { $gte: oneHourAgo } } },
      {
        $group: {
          _id: '$metadata.eventType',
          totalCount: { $sum: '$count' },
          uniqueUsers: { $sum: '$uniqueUsers' },
          totalValue: { $sum: '$totalValue' },
          avgDuration: { $avg: '$avgDuration' },
        },
      },
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/metrics/heatmap — count per hour-of-day × day-of-week
metricsRouter.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const { eventType } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000);

    const match: Record<string, unknown> = { timestamp: { $gte: sevenDaysAgo } };
    if (eventType) match['metadata.eventType'] = eventType;

    const data = await MetricModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$timestamp' },
            hour: { $hour: '$timestamp' },
          },
          count: { $sum: '$count' },
        },
      },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});
