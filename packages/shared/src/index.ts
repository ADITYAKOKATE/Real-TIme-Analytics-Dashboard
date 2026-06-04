// ─────────────────────────────────────────────
// Kafka Event Types
// ─────────────────────────────────────────────

export type EventType =
  | 'page_view'
  | 'click'
  | 'conversion'
  | 'api_call'
  | 'error';

export interface BaseEvent {
  eventId: string;
  eventType: EventType;
  userId: string;
  sessionId: string;
  timestamp: string; // ISO 8601
  metadata: Record<string, unknown>;
}

export interface PageViewEvent extends BaseEvent {
  eventType: 'page_view';
  metadata: {
    url: string;
    referrer?: string;
    title?: string;
    userAgent?: string;
    ip?: string;
  };
}

export interface ClickEvent extends BaseEvent {
  eventType: 'click';
  metadata: {
    elementId: string;
    elementType: string;
    url: string;
    userAgent?: string;
  };
}

export interface ConversionEvent extends BaseEvent {
  eventType: 'conversion';
  metadata: {
    conversionType: string;
    value: number;
    currency: string;
    url: string;
  };
}

export interface ApiCallEvent extends BaseEvent {
  eventType: 'api_call';
  metadata: {
    method: string;
    endpoint: string;
    statusCode: number;
    durationMs: number;
    userAgent?: string;
  };
}

export interface ErrorEvent extends BaseEvent {
  eventType: 'error';
  metadata: {
    errorCode: string;
    errorMessage: string;
    stackTrace?: string;
    url?: string;
  };
}

export type AnalyticsEvent =
  | PageViewEvent
  | ClickEvent
  | ConversionEvent
  | ApiCallEvent
  | ErrorEvent;

// ─────────────────────────────────────────────
// Aggregated Metric Types (MongoDB)
// ─────────────────────────────────────────────

export interface AggregatedMetric {
  timestamp: Date;
  metadata: {
    eventType: EventType;
    dimension?: string;
    dimensionValue?: string;
  };
  count: number;
  uniqueUsers: number;
  totalValue?: number; // for conversions
  avgDuration?: number; // for api_calls
  errorRate?: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

// ─────────────────────────────────────────────
// Alert Rule Types
// ─────────────────────────────────────────────

export type AlertOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
export type AlertChannel = 'email' | 'slack' | 'webhook';
export type AlertStatus = 'active' | 'muted' | 'triggered' | 'resolved';

export interface AlertRule {
  _id?: string;
  name: string;
  description?: string;
  metric: EventType | 'error_rate' | 'avg_duration' | 'conversion_rate';
  operator: AlertOperator;
  threshold: number;
  windowMinutes: number;
  channels: AlertChannel[];
  channelConfig?: {
    email?: string[];
    slackWebhook?: string;
    webhook?: string;
  };
  cooldownMinutes: number;
  status: AlertStatus;
  muteUntil?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlertHistory {
  _id?: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: string;
  resolvedAt?: string;
  metricValue: number;
  threshold: number;
  channels: AlertChannel[];
  isRecovery: boolean;
}

// ─────────────────────────────────────────────
// Dashboard / Widget Types
// ─────────────────────────────────────────────

export type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'heatmap'
  | 'scatter'
  | 'choropleth'
  | 'kpi'
  | 'table'
  | 'alert_list'
  | 'pie';

export interface WidgetConfig {
  id: string;
  type: ChartType;
  title: string;
  metric: EventType | 'error_rate' | 'avg_duration' | 'conversion_rate' | 'all';
  timeRange: '15m' | '1h' | '6h' | '24h' | '7d' | '30d';
  dimension?: string;
  chartColor?: string;
  refreshInterval?: number; // seconds
}

export interface GridLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Dashboard {
  _id?: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  layouts: { lg: GridLayout[]; md: GridLayout[]; sm: GridLayout[] };
  isPublic: boolean;
  shareToken?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────
// Socket.io Event Types
// ─────────────────────────────────────────────

export interface MetricUpdate {
  eventType: EventType;
  timestamp: string;
  count: number;
  uniqueUsers: number;
  totalValue?: number;
  avgDuration?: number;
  delta?: number; // percentage change from previous window
}

export interface AlertTriggered {
  alertId: string;
  ruleName: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  isRecovery: boolean;
}

// ─────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}
