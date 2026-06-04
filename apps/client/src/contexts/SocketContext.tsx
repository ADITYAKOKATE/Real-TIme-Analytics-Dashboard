'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MetricUpdate, AlertTriggered, AnalyticsEvent } from '@analytics/shared';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  lastUpdate: Date | null;
  latestMetrics: Record<string, MetricUpdate>;
  alerts: AlertTriggered[];
  replayEvents: AnalyticsEvent[];
  subscribe: (metrics: string[]) => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  lastUpdate: null,
  latestMetrics: {},
  alerts: [],
  replayEvents: [],
  subscribe: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [latestMetrics, setLatestMetrics] = useState<Record<string, MetricUpdate>>({});
  const [alerts, setAlerts] = useState<AlertTriggered[]>([]);
  const [replayEvents, setReplayEvents] = useState<AnalyticsEvent[]>([]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Subscribe to all metrics by default
      socket.emit('subscribe', ['all', 'page_view', 'click', 'conversion', 'api_call', 'error']);
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('metric:update', (update: MetricUpdate) => {
      setLastUpdate(new Date());
      setLatestMetrics((prev) => ({
        ...prev,
        [update.eventType]: update,
      }));
    });

    socket.on('alert:triggered', (alert: AlertTriggered) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    socket.on('replay', ({ events }: { events: AnalyticsEvent[]; count: number }) => {
      setReplayEvents(events);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribe = (metrics: string[]) => {
    socketRef.current?.emit('subscribe', metrics);
  };

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, isConnected, lastUpdate, latestMetrics, alerts, replayEvents, subscribe }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
