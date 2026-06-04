'use client';

import { useState, useEffect } from 'react';
import { AlertRule, AlertHistory, AlertChannel, AlertOperator } from '@analytics/shared';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const EVENT_TYPES = ['page_view', 'click', 'conversion', 'api_call', 'error', 'error_rate', 'avg_duration', 'conversion_rate'];
const OPERATORS: { value: AlertOperator; label: string }[] = [
  { value: 'gt', label: '> greater than' },
  { value: 'lt', label: '< less than' },
  { value: 'gte', label: '>= at least' },
  { value: 'lte', label: '<= at most' },
  { value: 'eq', label: '= equals' },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'badge-green',
    triggered: 'badge-red',
    muted: 'bg-text-muted/20 text-text-muted',
    resolved: 'badge-brand',
  };
  return <span className={`badge ${map[status] || 'badge-brand'}`}>{status}</span>;
}

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');
  const [form, setForm] = useState<Partial<AlertRule>>({
    name: '',
    metric: 'page_view',
    operator: 'gt',
    threshold: 100,
    windowMinutes: 5,
    channels: ['email'],
    cooldownMinutes: 30,
    status: 'active',
  });

  async function fetchRules() {
    const res = await fetch(`${API}/api/alerts/rules`);
    const json = await res.json();
    if (json.success) setRules(json.data);
  }

  async function fetchHistory() {
    const res = await fetch(`${API}/api/alerts/history`);
    const json = await res.json();
    if (json.success) setHistory(json.data);
  }

  useEffect(() => { fetchRules(); fetchHistory(); }, []);

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`${API}/api/alerts/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    fetchRules();
  }

  async function handleDelete(id: string) {
    await fetch(`${API}/api/alerts/rules/${id}`, { method: 'DELETE' });
    fetchRules();
  }

  async function handleMute(id: string) {
    await fetch(`${API}/api/alerts/rules/${id}/mute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours: 1 }),
    });
    fetchRules();
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Alert Rules</h1>
          <p className="text-sm text-text-secondary mt-0.5">Configure thresholds and notification channels</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + New Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-surface border border-bg-border rounded-lg p-1 w-fit">
        {(['rules', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'rules' && <span className="ml-2 badge badge-brand">{rules.length}</span>}
          </button>
        ))}
      </div>

      {/* Rules List */}
      {activeTab === 'rules' && (
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-3">◎</p>
              <p className="text-text-secondary">No alert rules configured yet.</p>
              <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Create your first rule</button>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule._id} className="card p-4 flex items-center gap-4 hover:border-brand/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-text-primary text-sm">{rule.name}</span>
                    <StatusBadge status={rule.status} />
                  </div>
                  <p className="text-xs text-text-secondary">
                    <code className="font-mono bg-bg-elevated px-1.5 py-0.5 rounded">{rule.metric}</code>
                    {' '}{rule.operator}{' '}
                    <strong>{rule.threshold}</strong>
                    {' '}in{' '}
                    <strong>{rule.windowMinutes}m</strong>
                    {' window · '}
                    Cooldown: <strong>{rule.cooldownMinutes}m</strong>
                    {' · '}Channels: <strong>{rule.channels.join(', ')}</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleMute(rule._id!)} className="btn-ghost text-xs py-1 px-2">
                    Mute 1h
                  </button>
                  <button onClick={() => handleDelete(rule._id!)} className="btn-ghost text-xs py-1 px-2 text-accent-orange hover:text-accent-orange">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History List */}
      {activeTab === 'history' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-bg-border">
              <tr className="text-left">
                {['Rule', 'Triggered At', 'Metric Value', 'Channels', 'Type'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-text-muted">No alerts have fired yet</td></tr>
              ) : (
                history.map((h) => (
                  <tr key={h._id} className="border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{h.ruleName}</td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{new Date(h.triggeredAt).toLocaleString()}</td>
                    <td className="px-4 py-3"><code className="font-mono">{h.metricValue.toFixed(2)}</code></td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{h.channels.join(', ')}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${h.isRecovery ? 'badge-green' : 'badge-red'}`}>
                        {h.isRecovery ? 'Recovery' : 'Alert'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Rule Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">New Alert Rule</h2>
              <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Rule Name</label>
                <input
                  required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., High error rate"
                  className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Metric</label>
                  <select
                    value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value as AlertRule['metric'] })}
                    className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
                  >
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Operator</label>
                  <select
                    value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value as AlertOperator })}
                    className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
                  >
                    {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Threshold</label>
                  <input type="number" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                    className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Window (min)</label>
                  <input type="number" value={form.windowMinutes} onChange={(e) => setForm({ ...form, windowMinutes: Number(e.target.value) })}
                    className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Cooldown (min)</label>
                  <input type="number" value={form.cooldownMinutes} onChange={(e) => setForm({ ...form, cooldownMinutes: Number(e.target.value) })}
                    className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-2 block">Notification Channels</label>
                <div className="flex gap-3">
                  {(['email', 'slack', 'webhook'] as AlertChannel[]).map((ch) => (
                    <label key={ch} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.channels?.includes(ch)}
                        onChange={(e) => setForm({ ...form, channels: e.target.checked ? [...(form.channels || []), ch] : (form.channels || []).filter((c) => c !== ch) })}
                        className="accent-brand" />
                      <span className="text-sm text-text-secondary capitalize">{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Create Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
