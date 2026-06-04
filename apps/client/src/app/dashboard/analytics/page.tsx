'use client';

import { useState } from 'react';
import { LineChart } from '@/components/charts/LineChart';
import { Heatmap } from '@/components/charts/Heatmap';
import { BarChart } from '@/components/charts/BarChart';
import { useMetrics, useHeatmap, useMetricsSummary } from '@/hooks/useMetrics';

const EVENT_TYPES = ['page_view', 'click', 'conversion', 'api_call', 'error'] as const;
type EventType = typeof EVENT_TYPES[number];

const COLORS: Record<EventType, string> = {
  page_view: '#6c63ff',
  click: '#00d4ff',
  conversion: '#00e5a0',
  api_call: '#ffd93d',
  error: '#ff4d8b',
};

const TIME_RANGES = ['15m', '1h', '6h', '24h', '7d', '30d'] as const;

export default function AnalyticsPage() {
  const [selectedType, setSelectedType] = useState<EventType>('page_view');
  const [timeRange, setTimeRange] = useState<string>('6h');

  const { data: tsData, loading: tsLoading } = useMetrics(selectedType, timeRange);
  const { data: heatData, loading: heatLoading } = useHeatmap(selectedType);
  const { data: summary } = useMetricsSummary();

  const barData = Object.entries(summary).map(([key, val], i) => ({
    label: key.replace('_', ' '),
    value: val.uniqueUsers || 0,
    color: Object.values(COLORS)[i % Object.values(COLORS).length],
  }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
          <p className="text-sm text-text-secondary mt-0.5">Deep-dive into your event data</p>
        </div>

        <div className="flex gap-2">
          {/* Event type selector */}
          <div className="flex items-center gap-1.5 bg-bg-surface border border-bg-border rounded-lg p-1">
            {EVENT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedType === t ? 'text-white' : 'text-text-secondary hover:text-text-primary'}`}
                style={selectedType === t ? { background: COLORS[t] } : {}}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Time range */}
          <div className="flex items-center gap-1 bg-bg-surface border border-bg-border rounded-lg p-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${timeRange === r ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main timeseries */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary capitalize">
            {selectedType.replace('_', ' ')} — {timeRange} Trend
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 rounded" style={{ background: COLORS[selectedType] }} />
            <span className="text-xs text-text-muted">events/min</span>
          </div>
        </div>
        {tsLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="text-text-muted text-sm">Fetching data...</div>
          </div>
        ) : (
          <LineChart data={tsData} color={COLORS[selectedType]} height={260} showArea label={selectedType} />
        )}
      </div>

      {/* Heatmap */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">
            Activity Heatmap — {selectedType.replace('_', ' ')}
          </h2>
          <span className="badge badge-brand">Hour × Day of Week</span>
        </div>
        {heatLoading ? (
          <div className="h-48 flex items-center justify-center text-text-muted text-sm">Loading...</div>
        ) : (
          <Heatmap data={heatData} height={200} />
        )}
      </div>

      {/* Unique users per event */}
      <div className="chart-container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Unique Users by Event Type</h2>
          <span className="badge badge-brand">Last Hour</span>
        </div>
        <BarChart data={barData} height={220} />
      </div>

      {/* Stats summary table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-bg-border">
          <h2 className="text-sm font-semibold text-text-primary">Summary Table — Last Hour</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-bg-border">
            <tr>
              {['Event Type', 'Total Events', 'Unique Users', 'Total Value', 'Avg Duration'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary).length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-text-muted">No data yet. Start the event seed to see metrics.</td></tr>
            ) : (
              Object.entries(summary).map(([key, val]) => (
                <tr key={key} className="border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[key as EventType] || '#6c63ff' }} />
                      <span className="font-medium text-text-primary capitalize">{key.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{(val.totalCount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{(val.uniqueUsers || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">${(val.totalValue || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-text-secondary">{(val.avgDuration || 0).toFixed(0)}ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
