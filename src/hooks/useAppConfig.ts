'use client';
// src/hooks/useAppConfig.ts
//
// Fetches a single AppConfiguration by ID with repair metadata.
// Shared between the runtime page and any component needing config access.

import { useState, useEffect } from 'react';
import { AppConfig } from '@/types/config';

export interface UseAppConfigResult {
  config: AppConfig | null;
  appId: string;
  loading: boolean;
  error: string | null;
  wasRepaired: boolean;
  repairs: Array<{ path: string; issue: string; repairedValue?: unknown }>;
  refetch: () => void;
}

export function useAppConfig(appId: string, userId: string): UseAppConfigResult {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wasRepaired, setWasRepaired] = useState(false);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!appId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/config/${appId}`, {
          headers: { 'x-user-id': userId },
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? 'Failed to load config');

        setConfig(json.data.config);
        setWasRepaired(json.data.wasRepaired);
        setRepairs(json.data.repairs ?? []);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [appId, userId, tick]);

  return {
    config, appId, loading, error,
    wasRepaired, repairs,
    refetch: () => setTick(t => t + 1),
  };
}
