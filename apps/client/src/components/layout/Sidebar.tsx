'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '⬡' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '◈' },
  { href: '/dashboard/builder', label: 'Builder', icon: '⊞' },
  { href: '/dashboard/alerts', label: 'Alerts', icon: '◎' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 min-h-screen bg-bg-surface border-r border-bg-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-bg-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-brand">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <h1 className="font-semibold text-text-primary text-sm">Ecommerce Analytics</h1>
            <p className="text-xs text-text-muted">Analytics Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider px-3 py-2">
          Platform
        </p>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              pathname === item.href ? 'nav-link-active' : 'nav-link'
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-bg-border">
        <ConnectionStatus />
      </div>
    </aside>
  );
}
