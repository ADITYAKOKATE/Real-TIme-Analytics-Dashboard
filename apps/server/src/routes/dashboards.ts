import { Router, Request, Response } from 'express';
import { DashboardModel } from '../models/Dashboard';
import { randomBytes } from 'crypto';

export const dashboardRouter = Router();

// GET /api/dashboards
dashboardRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const dashboards = await DashboardModel.find({ isPublic: false }).sort({ updatedAt: -1 });
    res.json({ success: true, data: dashboards });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/dashboards/:id
dashboardRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const dashboard = await DashboardModel.findById(req.params.id);
    if (!dashboard) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: dashboard });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// GET /api/dashboards/share/:token — public embed
dashboardRouter.get('/share/:token', async (req: Request, res: Response) => {
  try {
    const dashboard = await DashboardModel.findOne({ shareToken: req.params.token, isPublic: true });
    if (!dashboard) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: dashboard });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/dashboards
dashboardRouter.post('/', async (req: Request, res: Response) => {
  try {
    const dashboard = await DashboardModel.create(req.body);
    res.status(201).json({ success: true, data: dashboard });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

// PUT /api/dashboards/:id
dashboardRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const dashboard = await DashboardModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!dashboard) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: dashboard });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

// POST /api/dashboards/:id/share — generate public share link
dashboardRouter.post('/:id/share', async (req: Request, res: Response) => {
  try {
    const token = randomBytes(16).toString('hex');
    const dashboard = await DashboardModel.findByIdAndUpdate(
      req.params.id,
      { isPublic: true, shareToken: token },
      { new: true }
    );
    res.json({ success: true, data: { shareToken: token, shareUrl: `/share/${token}` } });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

// DELETE /api/dashboards/:id
dashboardRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await DashboardModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});
