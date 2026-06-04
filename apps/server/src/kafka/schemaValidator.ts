import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { AnalyticsEvent } from '@analytics/shared';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const baseEventSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string', minLength: 1 },
    eventType: { type: 'string', enum: ['page_view', 'click', 'conversion', 'api_call', 'error'] },
    userId: { type: 'string', minLength: 1 },
    sessionId: { type: 'string', minLength: 1 },
    timestamp: { type: 'string', format: 'date-time' },
    metadata: { type: 'object' },
  },
  required: ['eventId', 'eventType', 'userId', 'sessionId', 'timestamp', 'metadata'],
  additionalProperties: true,
};

const schemas: Record<string, object> = {
  page_view: {
    ...baseEventSchema,
    properties: {
      ...baseEventSchema.properties,
      metadata: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          referrer: { type: 'string' },
          title: { type: 'string' },
          userAgent: { type: 'string' },
          ip: { type: 'string' },
        },
        required: ['url'],
      },
    },
  },
  click: {
    ...baseEventSchema,
    properties: {
      ...baseEventSchema.properties,
      metadata: {
        type: 'object',
        properties: {
          elementId: { type: 'string' },
          elementType: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['elementId', 'elementType', 'url'],
      },
    },
  },
  conversion: {
    ...baseEventSchema,
    properties: {
      ...baseEventSchema.properties,
      metadata: {
        type: 'object',
        properties: {
          conversionType: { type: 'string' },
          value: { type: 'number', minimum: 0 },
          currency: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['conversionType', 'value', 'currency', 'url'],
      },
    },
  },
  api_call: {
    ...baseEventSchema,
    properties: {
      ...baseEventSchema.properties,
      metadata: {
        type: 'object',
        properties: {
          method: { type: 'string' },
          endpoint: { type: 'string' },
          statusCode: { type: 'integer', minimum: 100, maximum: 599 },
          durationMs: { type: 'number', minimum: 0 },
        },
        required: ['method', 'endpoint', 'statusCode', 'durationMs'],
      },
    },
  },
  error: {
    ...baseEventSchema,
    properties: {
      ...baseEventSchema.properties,
      metadata: {
        type: 'object',
        properties: {
          errorCode: { type: 'string' },
          errorMessage: { type: 'string' },
          stackTrace: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['errorCode', 'errorMessage'],
      },
    },
  },
};

// Compile all validators
const validators = Object.fromEntries(
  Object.entries(schemas).map(([key, schema]) => [key, ajv.compile(schema)])
);

export function validateEvent(event: unknown): { valid: boolean; errors?: string[] } {
  const evt = event as Partial<AnalyticsEvent>;
  const eventType = evt?.eventType;

  if (!eventType || !validators[eventType]) {
    return { valid: false, errors: [`Unknown or missing eventType: ${eventType}`] };
  }

  const validate = validators[eventType];
  const valid = validate(event) as boolean;

  if (!valid) {
    const errors = validate.errors?.map(
      (e) => `${e.instancePath || 'root'} ${e.message}`
    );
    return { valid: false, errors };
  }

  return { valid: true };
}
