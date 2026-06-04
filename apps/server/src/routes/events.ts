import { Router, Request, Response } from 'express';
import { publishEvent } from '../kafka/producer';
import { AnalyticsEvent } from '@analytics/shared';
import { validateEvent } from '../kafka/schemaValidator';
import { v4 as uuidv4 } from 'uuid';

export const eventsRouter = Router();

// POST /api/events — ingest a single event directly (bypasses Kafka for testing)
eventsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      ...req.body,
    } as AnalyticsEvent;

    const { valid, errors } = validateEvent(event);
    if (!valid) {
      return res.status(400).json({ success: false, errors });
    }

    await publishEvent(event);
    res.status(202).json({ success: true, eventId: event.eventId });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/events/batch — ingest multiple events
eventsRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const { events } = req.body as { events: Partial<AnalyticsEvent>[] };
    const results = await Promise.allSettled(
      events.map(async (e) => {
        const event = { eventId: uuidv4(), timestamp: new Date().toISOString(), ...e } as AnalyticsEvent;
        const { valid, errors } = validateEvent(event);
        if (!valid) throw new Error(errors?.join(', '));
        await publishEvent(event);
        return event.eventId;
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    res.status(202).json({ success: true, succeeded, failed });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});
