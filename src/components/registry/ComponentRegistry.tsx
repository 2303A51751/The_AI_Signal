'use client';
// src/components/registry/ComponentRegistry.tsx
//
// The Component Registry is the bridge between JSON config and React components.
// It maps ComponentType strings → React components.
//
// RESILIENCE: If a type isn't in the registry, we return a safe fallback
// rather than crashing. This means new component types can be introduced
// in configs before their implementations exist, and they'll degrade gracefully.

import React from 'react';
import { ComponentType } from '@/types/config';
import { ComponentErrorBoundary } from '@/components/boundaries/ComponentErrorBoundary';

// Lazy imports for code splitting - heavy components don't block initial render
import dynamic from 'next/dynamic';

const DataTable = dynamic(() => import('@/components/ui/DataTable').then(m => ({ default: m.DataTable })), {
  loading: () => <ComponentSkeleton label="Loading table..." />,
});

const DynamicForm = dynamic(() => import('@/components/ui/DynamicForm').then(m => ({ default: m.DynamicForm })), {
  loading: () => <ComponentSkeleton label="Loading form..." />,
});

const MetricCard = dynamic(() => import('@/components/ui/MetricCard').then(m => ({ default: m.MetricCard })), {
  loading: () => <ComponentSkeleton label="Loading metric..." />,
});

const MetricCardGroup = dynamic(() => import('@/components/ui/MetricCard').then(m => ({ default: m.MetricCardGroup })), {
  loading: () => <ComponentSkeleton label="Loading metrics..." />,
});

const CSVImportPanel = dynamic(() => import('@/components/ui/CSVImportPanel').then(m => ({ default: m.CSVImportPanel })), {
  loading: () => <ComponentSkeleton label="Loading import..." />,
});

const WorkflowPanel = dynamic(() => import('@/components/ui/WorkflowPanel').then(m => ({ default: m.WorkflowPanel })), {
  loading: () => <ComponentSkeleton label="Loading workflow logs..." />,
});

// ─────────────────────────────────────────────
// SKELETON LOADING STATE
// ─────────────────────────────────────────────
function ComponentSkeleton({ label }: { label?: string }) {
  return (
    <div className="animate-pulse rounded-lg bg-gray-100 p-4 min-h-[80px] flex items-center justify-center">
      <span className="text-xs text-gray-400">{label ?? 'Loading...'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// UNKNOWN COMPONENT FALLBACK
// Rendered when a type string doesn't match any registered component.
// ─────────────────────────────────────────────
function UnknownComponentFallback({ type }: { type: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
      <p className="text-sm text-gray-500">
        Unknown component type:{' '}
        <code className="font-mono text-xs bg-gray-200 px-1 py-0.5 rounded">{type}</code>
      </p>
      <p className="text-xs text-gray-400 mt-1">
        Register this component in the ComponentRegistry to enable it.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// INLINE PRIMITIVE COMPONENTS
// Simple enough to not warrant their own file.
// ─────────────────────────────────────────────
function HeadingComponent({ props }: { props: Record<string, unknown> }) {
  const level = (props?.level as number) ?? 2;
  const text = (props?.text as string) ?? 'Heading';
  const Tag = `h${Math.min(Math.max(level, 1), 6)}` as keyof JSX.IntrinsicElements;
  const sizeMap: Record<number, string> = {
    1: 'text-3xl font-bold', 2: 'text-2xl font-semibold',
    3: 'text-xl font-semibold', 4: 'text-lg font-medium',
    5: 'text-base font-medium', 6: 'text-sm font-medium',
  };
  return <Tag className={`${sizeMap[level] ?? 'text-xl'} text-gray-900 mb-2`}>{text}</Tag>;
}

function TextComponent({ props }: { props: Record<string, unknown> }) {
  return (
    <p className="text-gray-600 text-sm leading-relaxed">
      {(props?.content as string) ?? ''}
    </p>
  );
}

function DividerComponent() {
  return <hr className="border-gray-200 my-4" />;
}

// ─────────────────────────────────────────────
// REGISTRY MAP
// Add new component types here. Returning null means "render nothing".
// ─────────────────────────────────────────────
type RegistryEntry = {
  component: React.ComponentType<any>;
  displayName: string;
};

export const COMPONENT_REGISTRY: Partial<Record<ComponentType, RegistryEntry>> = {
  DataTable:      { component: DataTable,       displayName: 'Data Table' },
  Form:           { component: DynamicForm,     displayName: 'Form' },
  MetricCard:     { component: MetricCard,      displayName: 'Metric Card' },
  MetricCardGroup:{ component: MetricCardGroup, displayName: 'Metric Card Group' },
  CSVImport:      { component: CSVImportPanel,  displayName: 'CSV Import' },
  WorkflowPanel:  { component: WorkflowPanel,   displayName: 'Workflow Panel' },
  Heading:        { component: HeadingComponent,displayName: 'Heading' },
  Text:           { component: TextComponent,   displayName: 'Text' },
  Divider:        { component: DividerComponent,displayName: 'Divider' },
};

// ─────────────────────────────────────────────
// RESOLVER
// Returns the component wrapped in an error boundary,
// or a fallback for unknown types.
// ─────────────────────────────────────────────
export function resolveComponent(
  type: string,
  componentId: string
): React.ComponentType<any> {
  const entry = COMPONENT_REGISTRY[type as ComponentType];

  if (!entry) {
    // Return a stable component (not inline function) to avoid re-mount loops
    const Fallback = () => <UnknownComponentFallback type={type} />;
    Fallback.displayName = 'UnknownComponentFallback';
    return Fallback;
  }

  // Wrap in error boundary
  const { component: Inner, displayName } = entry;
  const Wrapped = (props: any) => (
    <ComponentErrorBoundary componentId={componentId} componentType={displayName}>
      <Inner {...props} />
    </ComponentErrorBoundary>
  );
  Wrapped.displayName = `SafeWrapper(${displayName})`;
  return Wrapped;
}
