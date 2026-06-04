import { Router, Request, Response } from 'express';
import { AlertRuleModel, AlertHistoryModel } from '../models/Alert';
import { AlertRule } from '@analytics/shared';

export const alertsRouter = Router();

// GET /api/alerts/rules
alertsRouter.get('/rules', async (_req: Request, res: Response) => {
  try {
    const rules = await AlertRuleModel.find().sort({ createdAt: -1 });
    res.json({ success: true, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/alerts/rules
alertsRouter.post('/rules', async (req: Request, res: Response) => {
  try {
    const body = req.body as Omit<AlertRule, '_id'>;
    const rule = await AlertRuleModel.create(body);
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

// PUT /api/alerts/rules/:id
alertsRouter.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const rule = await AlertRuleModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

// DELETE /api/alerts/rules/:id
alertsRouter.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    await AlertRuleModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/alerts/rules/:id/mute — mute for N hours
alertsRouter.post('/rules/:id/mute', async (req: Request, res: Response) => {
  try {
    const { hours = 1 } = req.body;
    const muteUntil = new Date(Date.now() + hours * 3600_000).toISOString();
    const rule = await AlertRuleModel.findByIdAndUpdate(
      req.params.id,
      { status: 'muted', muteUntil },
      { new: true }
    );
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

// GET /api/alerts/history
alertsRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [history, total] = await Promise.all([
      AlertHistoryModel.find().sort({ triggeredAt: -1 }).skip(skip).limit(Number(limit)),
      AlertHistoryModel.countDocuments(),
    ]);
    res.json({
      success: true,
      data: history,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});
