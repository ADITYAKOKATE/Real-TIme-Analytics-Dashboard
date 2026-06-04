'use client';

import { useSocket } from '@/contexts/SocketContext';
import { AlertTriggered } from '@analytics/shared';
import { format } from 'date-fns';
import { useState } from 'react';

function AlertBadge({ severity }: { severity: AlertTriggered['severity'] }) {
  const map = {
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[severity]}`}>
      {severity.toUpperCase()}
    </span>
  );
}

export function AlertToast() {
  const { alerts } = useSocket();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.alertId)).slice(0, 3);

  if (!visible.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {visible.map((alert) => (
        <div
          key={alert.alertId}
          className="card p-4 shadow-card animate-slide-up border-bg-border/80 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <AlertBadge severity={alert.severity} />
            <button
              onClick={() => setDismissed((p) => new Set([...p, alert.alertId]))}
              className="text-text-muted hover:text-text-primary text-lg leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-text-primary font-medium">{alert.ruleName}</p>
          <p className="text-xs text-text-secondary">{alert.message}</p>
          <p className="text-xs text-text-muted">{format(new Date(alert.timestamp), 'HH:mm:ss')}</p>
        </div>
      ))}
    </div>
  );
}
