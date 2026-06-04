'use client';

import { useSocket } from '@/contexts/SocketContext';
import { format } from 'date-fns';

export function ConnectionStatus() {
  const { isConnected, lastUpdate } = useSocket();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent-green animate-pulse' : 'bg-accent-orange'}`} />
        <span className="text-xs font-medium text-text-secondary">
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>
      {lastUpdate && (
        <span className="text-xs text-text-muted hidden sm:block">
          Updated {format(lastUpdate, 'HH:mm:ss')}
        </span>
      )}
    </div>
  );
}
