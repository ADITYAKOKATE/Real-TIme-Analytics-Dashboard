import { Router, Request, Response } from 'express';
import { AnalyticsEvent } from '@analytics/shared';
import { validateEvent } from '../kafka/schemaValidator';
import { enrichEvent } from '../kafka/enricher';
import { accumulateEvent } from '../kafka/aggregator';
import { emitMetricUpdate } from '../socket/socketManager';
import { v4 as uuidv4 } from 'uuid';

export const eventsRouter = Router();

// Helper to synchronously process a single event
function processEvent(event: AnalyticsEvent) {
  const { valid, errors } = validateEvent(event);
  if (!valid) throw new Error(errors?.join(', '));

  const enriched = enrichEvent(event);
  
  // Accumulate in 1-min window in-memory
  accumulateEvent(enriched);
  
  // Emit live update to dashboard
  emitMetricUpdate(event);
}

// POST /api/events — ingest a single event
eventsRouter.post('/', (req: Request, res: Response) => {
  try {
    const event = {
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
      ...req.body,
    } as AnalyticsEvent;

    processEvent(event);
    res.status(202).json({ success: true, eventId: event.eventId });
  } catch (err) {
    res.status(400).json({ success: false, error: String(err) });
  }
});

// POST /api/events/batch — ingest multiple events
eventsRouter.post('/batch', (req: Request, res: Response) => {
  try {
    const { events } = req.body as { events: Partial<AnalyticsEvent>[] };
    let succeeded = 0;
    let failed = 0;

    events.forEach((e) => {
      try {
        const event = { eventId: uuidv4(), timestamp: new Date().toISOString(), ...e } as AnalyticsEvent;
        processEvent(event);
        succeeded++;
      } catch (err) {
        failed++;
      }
    });

    res.status(202).json({ success: true, succeeded, failed });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});
