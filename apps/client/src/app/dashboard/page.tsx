'use client';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { Heatmap } from '@/components/charts/Heatmap';
import { PieChart } from '@/components/charts/PieChart';
import { useMetrics, useMetricsSummary, useHeatmap } from '@/hooks/useMetrics';
import { useSocket } from '@/contexts/SocketContext';
import { useState } from 'react';

const TIME_RANGES = ['15m', '1h', '6h', '24h', '7d'] as const;
type TimeRange = typeof TIME_RANGES[number];

const METRIC_CARDS = [
  { title: 'Page Views', eventType: 'page_view', icon: '👁', color: '#6c63ff' },
  { title: 'Clicks', eventType: 'click', icon: '🖱', color: '#00d4ff' },
  { title: 'Conversions', eventType: 'conversion', icon: '💰', color: '#00e5a0' },
  { title: 'API Calls', eventType: 'api_call', icon: '⚡', color: '#ffd93d' },
  { title: 'Errors', eventType: 'error', icon: '⚠', color: '#ff4d8b' },
];

export default function DashboardOverviewPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const { data: pageViewData, loading: pvLoading } = useMetrics('page_view', timeRange);
  const { data: clickData } = useMetrics('click', timeRange);
  const { data: conversionData } = useMetrics('conversion', timeRange);
  const { data: apiData } = useMetrics('api_call', timeRange);
  const { data: errorData } = useMetrics('error', timeRange);
  const { data: summary, loading: summaryLoading } = useMetricsSummary();
  const { data: heatmapData, loading: heatLoading } = useHeatmap('page_view');
  const { alerts } = useSocket();

  // Build comparison bar data from summary
  const barData = Object.entries(summary).map(([key, val], i) => ({
    label: key.replace('_', ' '),
    value: val.totalCount,
    color: ['#6c63ff', '#00d4ff', '#00e5a0', '#ffd93d', '#ff4d8b'][i % 5],
  }));

  // Build pie data from summary
  const pieData = Object.entries(summary).map(([key, val]) => ({
    label: key.replace('_', ' '),
    value: val.totalCount,
  }));

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Overview</h1>
          <p className="text-sm text-text-secondary mt-0.5">Real-time platform metrics</p>
        </div>
        <div className="flex items-center gap-1.5 bg-bg-surface border border-bg-border rounded-lg p-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                timeRange === r
                  ? 'bg-brand text-white shadow-glow-brand'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {METRIC_CARDS.map((c) => (
          <MetricCard key={c.eventType} {...c} value={summary[c.eventType]?.totalCount || 0} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 chart-container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Page Views Over Time</h2>
            <span className="badge badge-brand">Line</span>
          </div>
          {pvLoading ? (
            <div className="h-56 flex items-center justify-center text-text-muted">Loading...</div>
          ) : (
            <LineChart data={pageViewData} color="#6c63ff" height={220} label="page_view" />
          )}
        </div>

        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Event Distribution</h2>
            <span className="badge badge-brand">Pie</span>
          </div>
          {summaryLoading ? (
            <div className="h-56 flex items-center justify-center text-text-muted">Loading...</div>
          ) : (
            <PieChart data={pieData} height={220} />
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">API Calls</h2>
            <span className="badge" style={{ background: '#ffd93d20', color: '#ffd93d' }}>Live</span>
          </div>
          <LineChart data={apiData} color="#ffd93d" height={180} showArea={false} label="api_call" />
        </div>

        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Event Volume Comparison</h2>
            <span className="badge badge-brand">Bar</span>
          </div>
          <BarChart data={barData} height={180} />
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 chart-container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Activity Heatmap — Hour × Day</h2>
            <span className="badge badge-brand">7d</span>
          </div>
          {heatLoading ? (
            <div className="h-48 flex items-center justify-center text-text-muted">Loading...</div>
          ) : (
            <Heatmap data={heatmapData} height={180} />
          )}
        </div>

        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Recent Alerts</h2>
            <span className="badge badge-red">{alerts.length}</span>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No alerts fired yet</p>
            ) : (
              alerts.slice(0, 8).map((a) => (
                <div key={a.alertId} className="p-2.5 rounded-lg bg-bg-elevated border border-bg-border flex items-start gap-2">
                  <span className={`text-xs mt-0.5 ${a.isRecovery ? 'text-accent-green' : 'text-accent-orange'}`}>
                    {a.isRecovery ? '✅' : '🔔'}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-text-primary">{a.ruleName}</p>
                    <p className="text-xs text-text-muted truncate">{a.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Conversion + Error Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Conversions</h2>
            <span className="badge" style={{ background: '#00e5a020', color: '#00e5a0' }}>Revenue</span>
          </div>
          <LineChart data={conversionData} color="#00e5a0" height={160} label="conversion" />
        </div>
        <div className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Errors</h2>
            <span className="badge badge-red">Monitoring</span>
          </div>
          <LineChart data={errorData} color="#ff4d8b" height={160} showArea={false} label="error" />
        </div>
      </div>
    </div>
  );
}
