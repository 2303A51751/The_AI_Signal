'use client';
// src/hooks/useEntityData.ts
//
// Reusable hook for fetching, creating, updating, and deleting
// records from the dynamic entity API. Used by DataTable, Form,
// MetricCard, and any other component that reads entity data.
//
// Features:
// - Automatic refetch on param change
// - Optimistic delete (remove from UI before server confirms)
// - Stable callback refs (useCallback) to avoid infinite loops
// - Exposed `refetch` for parent-triggered refreshes

import { useState, useEffect, useCallback, useRef } from 'react';

export interface FetchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EntityRecord {
  id: string;
  _createdAt?: string;
  [key: string]: unknown;
}

export interface UseEntityDataResult {
  records: EntityRecord[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createRecord: (data: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; data?: EntityRecord }>;
  updateRecord: (id: string, data: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  deleteRecord: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useEntityData(
  appId: string,
  entity: string | undefined,
  params: FetchParams = {}
): UseEntityDataResult {
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref for the fetch counter to handle race conditions
  // (fast param changes can cause out-of-order responses)
  const fetchCounterRef = useRef(0);

  const baseUrl = appId && entity ? `/api/generated/${appId}/${entity}` : null;

  const fetch_ = useCallback(async () => {
    if (!baseUrl) return;

    const counter = ++fetchCounterRef.current;
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params.page)      searchParams.set('page', String(params.page));
      if (params.pageSize)  searchParams.set('pageSize', String(params.pageSize));
      if (params.search)    searchParams.set('search', params.search);
      if (params.sortField) searchParams.set('sortField', params.sortField);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

      const res = await fetch(`${baseUrl}?${searchParams}`);
      const json = await res.json();

      // Discard stale responses from previous fetches
      if (counter !== fetchCounterRef.current) return;

      if (!res.ok) {
        setError(json.error ?? 'Failed to load data');
        return;
      }

      setRecords(json.data?.items ?? []);
      setTotal(json.data?.total ?? 0);
    } catch (err: any) {
      if (counter === fetchCounterRef.current) {
        setError('Network error. Please check your connection.');
      }
    } finally {
      if (counter === fetchCounterRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, params.page, params.pageSize, params.search, params.sortField, params.sortOrder]);

  useEffect(() => { fetch_(); }, [fetch_]);

  // ── MUTATIONS ─────────────────────────────────

  const createRecord = useCallback(async (data: Record<string, unknown>) => {
    if (!baseUrl) return { ok: false, error: 'No entity configured' };
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error ?? 'Create failed', details: json.details };
      fetch_(); // Refetch to update list
      return { ok: true, data: json.data as EntityRecord };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  }, [baseUrl, fetch_]);

  const updateRecord = useCallback(async (id: string, data: Record<string, unknown>) => {
    if (!baseUrl) return { ok: false, error: 'No entity configured' };
    try {
      const res = await fetch(baseUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error ?? 'Update failed' };

      // Optimistic update in local state
      setRecords(prev =>
        prev.map(r => r.id === id ? { ...r, ...data } : r)
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  }, [baseUrl]);

  const deleteRecord = useCallback(async (id: string) => {
    if (!baseUrl) return { ok: false, error: 'No entity configured' };

    // Optimistic delete
    setRecords(prev => prev.filter(r => r.id !== id));
    setTotal(prev => Math.max(0, prev - 1));

    try {
      const res = await fetch(`${baseUrl}?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        fetch_(); // Rollback by refetching
        return { ok: false, error: json.error ?? 'Delete failed' };
      }
      return { ok: true };
    } catch {
      fetch_(); // Rollback
      return { ok: false, error: 'Network error' };
    }
  }, [baseUrl, fetch_]);

  return {
    records, total, loading, error,
    refetch: fetch_,
    createRecord, updateRecord, deleteRecord,
  };
}
