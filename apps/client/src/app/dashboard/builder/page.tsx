'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Dashboard, WidgetConfig, ChartType, GridLayout as GridLayoutItem } from '@analytics/shared';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { PieChart } from '@/components/charts/PieChart';
import { useMetrics, useMetricsSummary } from '@/hooks/useMetrics';
import { useSocket } from '@/contexts/SocketContext';
import { v4 as uuidv4 } from 'uuid';

// DraggableGrid is a separate client component where WidthProvider(Responsive)
// is called at module-evaluation time — this avoids the CJS interop issue
// that breaks WidthProvider when called inside a dynamic() async callback.
const DraggableGrid = dynamic(() => import('@/components/dashboard/DraggableGrid'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';


const WIDGET_TEMPLATES: Array<{ type: ChartType; label: string; icon: string; defaultW: number; defaultH: number }> = [
  { type: 'kpi', label: 'KPI Card', icon: '⬡', defaultW: 2, defaultH: 2 },
  { type: 'line', label: 'Line Chart', icon: '◈', defaultW: 4, defaultH: 3 },
  { type: 'bar', label: 'Bar Chart', icon: '▥', defaultW: 3, defaultH: 3 },
  { type: 'pie', label: 'Pie Chart', icon: '◑', defaultW: 3, defaultH: 3 },
  { type: 'alert_list', label: 'Alert Feed', icon: '◎', defaultW: 2, defaultH: 3 },
];

function KpiWidget({ widget }: { widget: WidgetConfig }) {
  const { latestMetrics } = useSocket();
  const metric = latestMetrics[widget.metric] || { count: 0 };
  return (
    <div className="h-full flex flex-col justify-center items-center gap-2 p-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{widget.title}</p>
      <p className="text-4xl font-bold text-text-primary">{metric.count.toLocaleString()}</p>
      <span className="badge badge-green text-xs">Live</span>
    </div>
  );
}

function AlertListWidget() {
  const { alerts } = useSocket();
  return (
    <div className="h-full overflow-auto p-3 space-y-2">
      {alerts.length === 0 ? (
        <p className="text-xs text-text-muted text-center pt-4">No alerts</p>
      ) : (
        alerts.slice(0, 10).map((a) => (
          <div key={a.alertId} className="text-xs p-2 rounded-lg bg-bg-elevated border border-bg-border">
            <span className={`font-medium ${a.isRecovery ? 'text-accent-green' : 'text-accent-orange'}`}>
              {a.isRecovery ? '✅' : '🔔'} {a.ruleName}
            </span>
            <p className="text-text-muted mt-0.5 truncate">{a.message}</p>
          </div>
        ))
      )}
    </div>
  );
}

function ChartWidget({ widget }: { widget: WidgetConfig }) {
  const { data } = useMetrics(widget.metric !== 'all' ? widget.metric : undefined, widget.timeRange);
  const { data: summary } = useMetricsSummary();

  const barData = Object.entries(summary).map(([key, val], i) => ({
    label: key.replace('_', ' '),
    value: val.totalCount,
    color: ['#6c63ff', '#00d4ff', '#00e5a0', '#ffd93d', '#ff4d8b'][i % 5],
  }));

  const pieData = Object.entries(summary).map(([key, val]) => ({
    label: key.replace('_', ' '),
    value: val.totalCount,
  }));

  if (widget.type === 'line') return <LineChart data={data} color={widget.chartColor || '#6c63ff'} height={160} />;
  if (widget.type === 'bar') return <BarChart data={barData} height={160} />;
  if (widget.type === 'pie') return <PieChart data={pieData} height={200} />;
  return null;
}

function WidgetRenderer({ widget }: { widget: WidgetConfig }) {
  if (widget.type === 'kpi') return <KpiWidget widget={widget} />;
  if (widget.type === 'alert_list') return <AlertListWidget />;
  return <ChartWidget widget={widget} />;
}

export default function BuilderPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [current, setCurrent] = useState<Dashboard | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showNewDash, setShowNewDash] = useState(false);
  const [newDashName, setNewDashName] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [layouts, setLayouts] = useState<{ lg: GridLayoutItem[]; md: GridLayoutItem[]; sm: GridLayoutItem[] }>({ lg: [], md: [], sm: [] });

  async function fetchDashboards() {
    const res = await fetch(`${API}/api/dashboards`);
    const json = await res.json();
    if (json.success) setDashboards(json.data);
  }

  useEffect(() => { fetchDashboards(); }, []);

  useEffect(() => {
    if (current) setLayouts(current.layouts || { lg: [], md: [], sm: [] });
  }, [current]);

  async function createDashboard() {
    if (!newDashName.trim()) return;
    const res = await fetch(`${API}/api/dashboards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newDashName, widgets: [], layouts: { lg: [], md: [], sm: [] }, isPublic: false }),
    });
    const json = await res.json();
    if (json.success) { setCurrent(json.data); setShowNewDash(false); setNewDashName(''); fetchDashboards(); }
  }

  function addWidget(template: typeof WIDGET_TEMPLATES[0]) {
    if (!current) return;
    const newWidget: WidgetConfig = {
      id: uuidv4(),
      type: template.type,
      title: template.label,
      metric: 'page_view',
      timeRange: '1h',
      chartColor: '#6c63ff',
    };
    const newLayout: GridLayoutItem = {
      i: newWidget.id,
      x: 0, y: Infinity,
      w: template.defaultW,
      h: template.defaultH,
    };
    const updated: Dashboard = {
      ...current,
      widgets: [...current.widgets, newWidget],
      layouts: {
        lg: [...(layouts.lg || []), newLayout],
        md: [...(layouts.md || []), { ...newLayout, w: Math.min(template.defaultW, 4) }],
        sm: [...(layouts.sm || []), { ...newLayout, w: 2 }],
      },
    };
    setCurrent(updated);
    setLayouts(updated.layouts);
  }

  async function saveLayout() {
    if (!current) return;
    const toSave = { ...current, layouts };
    await fetch(`${API}/api/dashboards/${current._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toSave),
    });
    setCurrent(toSave);
    setEditMode(false);
    fetchDashboards();
  }

  async function shareCurrentDash() {
    if (!current) return;
    const res = await fetch(`${API}/api/dashboards/${current._id}/share`, { method: 'POST' });
    const json = await res.json();
    if (json.success) setShareUrl(`${window.location.origin}${json.data.shareUrl}`);
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard Builder</h1>
          <p className="text-sm text-text-secondary mt-0.5">Drag, drop, and configure your widgets</p>
        </div>
        <div className="flex gap-2">
          {current && (
            <>
              <button onClick={shareCurrentDash} className="btn-ghost text-sm">Share</button>
              <button onClick={() => setEditMode(!editMode)} className={`text-sm px-4 py-2 rounded-lg transition-all ${editMode ? 'bg-accent-green/20 text-accent-green border border-accent-green/30' : 'btn-ghost'}`}>
                {editMode ? '✓ Editing' : 'Edit'}
              </button>
              {editMode && <button onClick={saveLayout} className="btn-primary text-sm">Save</button>}
            </>
          )}
          <button onClick={() => setShowNewDash(true)} className="btn-primary text-sm">New Dashboard</button>
        </div>
      </div>

      {shareUrl && (
        <div className="card p-3 flex items-center gap-3 border-accent-cyan/30">
          <span className="text-accent-cyan text-sm">🔗</span>
          <code className="text-xs text-text-secondary flex-1 truncate">{shareUrl}</code>
          <button onClick={() => { navigator.clipboard.writeText(shareUrl); }} className="text-xs text-brand">Copy</button>
          <button onClick={() => setShareUrl(null)} className="text-text-muted text-sm">×</button>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar panel */}
        <div className="w-52 flex-shrink-0 space-y-4">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Dashboards</p>
            <div className="space-y-1">
              {dashboards.map((d) => (
                <button key={d._id} onClick={() => setCurrent(d)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${current?._id === d._id ? 'bg-brand/10 text-brand-light border border-brand/20' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}>
                  {d.name}
                </button>
              ))}
              {dashboards.length === 0 && <p className="text-xs text-text-muted px-3">No dashboards yet</p>}
            </div>
          </div>

          {editMode && current && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Add Widget</p>
              <div className="space-y-1.5">
                {WIDGET_TEMPLATES.map((t) => (
                  <button key={t.type} onClick={() => addWidget(t)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all flex items-center gap-2">
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Grid Canvas */}
        <div className="flex-1 min-h-96">
          {!current ? (
            <div className="h-96 card flex flex-col items-center justify-center gap-4">
              <p className="text-5xl opacity-30">⊞</p>
              <p className="text-text-muted">Select or create a dashboard to get started</p>
              <button onClick={() => setShowNewDash(true)} className="btn-primary">Create Dashboard</button>
            </div>
          ) : (
            <div className="card p-4 min-h-96 relative">
              {current.widgets.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none opacity-50">
                  <p className="text-4xl">⊞</p>
                  <p className="text-text-muted text-sm">Enable Edit mode and add widgets</p>
                </div>
              )}
              <DraggableGrid
                layouts={layouts}
                isDraggable={editMode}
                isResizable={editMode}
                onLayoutChange={(_, allLayouts) => setLayouts(allLayouts as typeof layouts)}
              >
                {current.widgets.map((widget) => (
                  <div key={widget.id}>
                    <div className="card-elevated h-full flex flex-col overflow-hidden">
                      <div className={`drag-handle flex items-center justify-between px-3 py-2 border-b border-bg-border ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                        <span className="text-xs font-semibold text-text-secondary truncate">{widget.title}</span>
                        {editMode && (
                          <button
                            onClick={() => setCurrent({ ...current, widgets: current.widgets.filter((w) => w.id !== widget.id) })}
                            className="text-text-muted hover:text-accent-orange text-sm ml-2"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <WidgetRenderer widget={widget} />
                      </div>
                    </div>
                  </div>
                ))}
              </DraggableGrid>
            </div>
          )}
        </div>
      </div>

      {/* New Dashboard Modal */}
      {showNewDash && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-sm p-6 space-y-4 animate-slide-up">
            <h2 className="text-lg font-semibold text-text-primary">New Dashboard</h2>
            <input
              autoFocus
              value={newDashName}
              onChange={(e) => setNewDashName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createDashboard()}
              placeholder="Dashboard name..."
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowNewDash(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={createDashboard} className="btn-primary text-sm">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
