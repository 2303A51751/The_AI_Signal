'use client';
// src/components/ui/MetricCard.tsx
//
// Displays a single aggregated metric (count, sum, avg, etc.)
// fetched dynamically from the entity data API.

import React, { useState, useEffect } from 'react';
import { TrendingUp, Hash, DollarSign, BarChart2 } from 'lucide-react';
import { ComponentConfig } from '@/types/config';

interface MetricConfig {
  entity: string;
  field: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  label: string;
  icon?: string;
  prefix?: string;
  suffix?: string;
}

interface MetricCardProps {
  appId: string;
  metric?: MetricConfig;
  props?: Record<string, unknown>;
}

export function MetricCard({ appId, metric }: MetricCardProps) {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metric?.entity || !appId) {
      setLoading(false);
      return;
    }

    const fetchMetric = async () => {
      try {
        setLoading(true);
        // Fetch all records and compute aggregation client-side
        // In production: push aggregation to DB via Prisma groupBy / _sum / _count
        const res = await fetch(`/api/generated/${appId}/${metric.entity}?pageSize=1000`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        const records = json.data.items ?? [];
        const computed = computeAggregation(records, metric);
        setValue(computed);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetric();
  }, [appId, metric]);

  const IconComponent = getIcon(metric?.icon);
  const formatted = formatMetricValue(value, metric);

  return (
    <div className="
      bg-white rounded-xl border border-gray-200 shadow-sm p-4
      flex flex-col gap-3 hover:shadow-md transition-shadow
    ">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{metric?.label ?? 'Metric'}</p>
        <div className="rounded-lg bg-blue-50 p-2">
          <IconComponent className="h-4 w-4 text-blue-600" />
        </div>
      </div>

      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : loading ? (
        <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 tabular-nums">
          {formatted}
        </p>
      )}

      <p className="text-xs text-gray-400 capitalize">
        {metric?.aggregation ?? 'count'} · {metric?.entity ?? '—'}
      </p>
    </div>
  );
}

// Renders a responsive grid of MetricCards
interface MetricCardGroupProps {
  appId: string;
  childrenConfig?: ComponentConfig[];
  props?: Record<string, unknown>;
}

export function MetricCardGroup({ appId, childrenConfig, props: groupProps }: MetricCardGroupProps) {
  const cols = (groupProps?.cols as number) ?? 4;
  const colMap: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${colMap[cols] ?? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-4`}>
      {(childrenConfig ?? []).map((child) => (
        <MetricCard
          key={child.id}
          appId={appId}
          metric={child.metric}
          props={child.props as Record<string, unknown>}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function computeAggregation(
  records: Record<string, unknown>[],
  metric: MetricConfig
): number {
  const { aggregation, field } = metric;

  if (aggregation === 'count') return records.length;

  const nums = records
    .map((r) => Number(r[field]))
    .filter((n) => !isNaN(n));

  if (nums.length === 0) return 0;

  switch (aggregation) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    default:    return 0;
  }
}

function formatMetricValue(value: number | null, metric?: MetricConfig): string {
  if (value === null) return '—';
  const prefix = metric?.prefix ?? '';
  const suffix = metric?.suffix ?? '';
  const formatted = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toFixed(2);
  return `${prefix}${formatted}${suffix}`;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  trending: TrendingUp,
  count: Hash,
  dollar: DollarSign,
  chart: BarChart2,
};

function getIcon(name?: string): React.ComponentType<{ className?: string }> {
  return ICONS[name ?? ''] ?? BarChart2;
}
