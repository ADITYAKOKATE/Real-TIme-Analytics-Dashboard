import { useState, useEffect, useCallback } from 'react';
import { TimeSeriesDataPoint } from '@analytics/shared';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useMetrics(eventType?: string, timeRange: string = '1h') {
  const [data, setData] = useState<TimeSeriesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const rangeMap: Record<string, number> = {
        '15m': 15 * 60_000,
        '1h': 3600_000,
        '6h': 6 * 3600_000,
        '24h': 24 * 3600_000,
        '7d': 7 * 24 * 3600_000,
        '30d': 30 * 24 * 3600_000,
      };
      const ms = rangeMap[timeRange] || 3600_000;
      const from = new Date(Date.now() - ms).toISOString();
      const to = new Date().toISOString();

      const params = new URLSearchParams({ from, to });
      if (eventType) params.set('eventType', eventType);

      const res = await fetch(`${API}/api/metrics/timeseries?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [eventType, timeRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useMetricsSummary() {
  const [data, setData] = useState<Record<string, { totalCount: number; uniqueUsers: number; totalValue: number; avgDuration: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch(`${API}/api/metrics/summary`);
        const json = await res.json();
        if (json.success) {
          const map: typeof data = {};
          json.data.forEach((d: { _id: string; totalCount: number; uniqueUsers: number; totalValue: number; avgDuration: number }) => {
            map[d._id] = d;
          });
          setData(map);
        }
      } finally {
        setLoading(false);
      }
    }
    fetch_();
    const i = setInterval(fetch_, 15_000);
    return () => clearInterval(i);
  }, []);

  return { data, loading };
}

export function useHeatmap(eventType?: string) {
  const [data, setData] = useState<Array<{ _id: { dayOfWeek: number; hour: number }; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_() {
      const params = new URLSearchParams();
      if (eventType) params.set('eventType', eventType);
      const res = await fetch(`${API}/api/metrics/heatmap?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      setLoading(false);
    }
    fetch_();
  }, [eventType]);

  return { data, loading };
}
