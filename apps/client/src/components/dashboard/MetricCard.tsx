'use client';

import { useSocket } from '@/contexts/SocketContext';

interface MetricCardProps {
  title: string;
  eventType: string;
  icon: string;
  color: string;
  value: number;
  format?: (v: number) => string;
  unit?: string;
}

export function MetricCard({ title, eventType, icon, color, value: baseValue, format: fmt, unit = '' }: MetricCardProps) {
  const { latestMetrics } = useSocket();
  const metric = latestMetrics[eventType];
  // If there's live traffic, we can optionally add it or just show the base value.
  // For the dashboard, we'll show the baseValue (which comes from the API summary for the time range)
  const value = baseValue;
  const delta = metric?.delta ?? 0;

  return (
    <div className="metric-card group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>

      <div>
        <div className="text-3xl font-bold text-text-primary tracking-tight">
          {fmt ? fmt(value) : value.toLocaleString()}
          {unit && <span className="text-sm font-normal text-text-muted ml-1">{unit}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={`text-xs font-medium ${
              delta >= 0 ? 'text-accent-green' : 'text-accent-orange'
            }`}
          >
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-xs text-text-muted">vs prev min</span>
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="h-0.5 rounded-full mt-1 opacity-40 group-hover:opacity-70 transition-opacity"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
    </div>
  );
}
