'use client';
// src/components/engine/LayoutEngine.tsx
//
// THE CORE FRONTEND RUNTIME.
//
// This recursive engine reads a ComponentConfig tree and renders it
// into a live React component tree. It handles:
//  - Layout components (SidebarLayout, TabLayout, Grid)
//  - Leaf components (DataTable, Form, MetricCard, etc.)
//  - Unknown types → graceful fallback
//  - Broken children → isolated via Error Boundaries
//
// ARCHITECTURAL NOTE:
// We keep layout logic (how components are positioned) here,
// and component logic (what they do) in the registry.
// This separation means you can add new layout types without
// touching individual component implementations.

import React, { useState } from 'react';
import { ComponentConfig, AppConfig } from '@/types/config';
import { resolveComponent } from '@/components/registry/ComponentRegistry';
import { ComponentErrorBoundary } from '@/components/boundaries/ComponentErrorBoundary';

interface EngineProps {
  config: ComponentConfig;
  appConfig: AppConfig;
  appId: string;
  userId: string;
  depth?: number;
}

// Max recursion depth guard - prevents infinite loops from circular configs
const MAX_DEPTH = 12;

// ─────────────────────────────────────────────
// LAYOUT RENDERERS
// Each layout type handles positioning of children.
// ─────────────────────────────────────────────

function SidebarLayout({ config, appConfig, appId, userId, depth }: EngineProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = (config.props?.sidebarWidth as string) ?? 'w-64';
  const [sidebar, ...main] = config.children ?? [];

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`
          ${sidebarOpen ? sidebarWidth : 'w-0 overflow-hidden'}
          flex-shrink-0 bg-white border-r border-gray-200
          transition-all duration-200 ease-in-out
        `}
      >
        {sidebar && (
          <div className="p-4">
            <LayoutEngine
              config={sidebar}
              appConfig={appConfig}
              appId={appId}
              userId={userId}
              depth={(depth ?? 0) + 1}
            />
          </div>
        )}
      </aside>

      {/* Toggle button */}
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="
          absolute left-0 top-4 z-10 flex h-8 w-8 items-center justify-center
          rounded-r-md bg-gray-200 text-gray-600 hover:bg-gray-300
          focus:outline-none focus:ring-2 focus:ring-blue-500
        "
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {sidebarOpen ? '‹' : '›'}
      </button>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">
        {main.map((child) => (
          <ComponentErrorBoundary
            key={child.id}
            componentId={child.id}
            componentType={child.type}
          >
            <LayoutEngine
              config={child}
              appConfig={appConfig}
              appId={appId}
              userId={userId}
              depth={(depth ?? 0) + 1}
            />
          </ComponentErrorBoundary>
        ))}
      </main>
    </div>
  );
}

function TabLayout({ config, appConfig, appId, userId, depth }: EngineProps) {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = config.children ?? [];
  const tabLabels = (config.props?.tabLabels as string[]) ?? tabs.map((_, i) => `Tab ${i + 1}`);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`
              px-4 py-3 text-sm font-medium border-b-2 transition-colors
              focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500
              ${activeTab === i
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 overflow-auto">
        {tabs[activeTab] && (
          <ComponentErrorBoundary
            key={activeTab}
            componentId={tabs[activeTab].id}
            componentType={tabs[activeTab].type}
          >
            <LayoutEngine
              config={tabs[activeTab]}
              appConfig={appConfig}
              appId={appId}
              userId={userId}
              depth={(depth ?? 0) + 1}
            />
          </ComponentErrorBoundary>
        )}
      </div>
    </div>
  );
}

function GridLayout({ config, appConfig, appId, userId, depth }: EngineProps) {
  const cols = (config.props?.cols as number) ?? 2;
  const gap = (config.props?.gap as string) ?? 'gap-4';
  const colsMap: Record<number, string> = {
    1: 'grid-cols-1', 2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
  };

  return (
    <div className={`grid ${colsMap[cols] ?? 'grid-cols-2'} ${gap}`}>
      {(config.children ?? []).map((child) => (
        <ComponentErrorBoundary
          key={child.id}
          componentId={child.id}
          componentType={child.type}
        >
          <LayoutEngine
            config={child}
            appConfig={appConfig}
            appId={appId}
            userId={userId}
            depth={(depth ?? 0) + 1}
          />
        </ComponentErrorBoundary>
      ))}
    </div>
  );
}

function StackLayout({ config, appConfig, appId, userId, depth }: EngineProps) {
  const gap = (config.props?.gap as string) ?? 'gap-6';

  return (
    <div className={`flex flex-col ${gap}`}>
      {(config.children ?? []).map((child) => (
        <ComponentErrorBoundary
          key={child.id}
          componentId={child.id}
          componentType={child.type}
        >
          <LayoutEngine
            config={child}
            appConfig={appConfig}
            appId={appId}
            userId={userId}
            depth={(depth ?? 0) + 1}
          />
        </ComponentErrorBoundary>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN ENGINE
// ─────────────────────────────────────────────
export function LayoutEngine({ config, appConfig, appId, userId, depth = 0 }: EngineProps) {
  // Guard: prevent infinite recursion
  if (depth > MAX_DEPTH) {
    return (
      <div className="text-xs text-red-500 border border-red-200 p-2 rounded">
        Max layout depth exceeded at: {config.type}
      </div>
    );
  }

  // Guard: config must exist
  if (!config || typeof config !== 'object') {
    return null;
  }

  // ── LAYOUT BRANCH ──────────────────────────
  // These components control structure, not content
  if (config.type === 'SidebarLayout') {
    return <SidebarLayout config={config} appConfig={appConfig} appId={appId} userId={userId} depth={depth} />;
  }

  if (config.type === 'TabLayout') {
    return <TabLayout config={config} appConfig={appConfig} appId={appId} userId={userId} depth={depth} />;
  }

  if (config.type === 'Layout') {
    const variant = (config.props?.variant as string) ?? 'stack';
    if (variant === 'grid') {
      return <GridLayout config={config} appConfig={appConfig} appId={appId} userId={userId} depth={depth} />;
    }
    return <StackLayout config={config} appConfig={appConfig} appId={appId} userId={userId} depth={depth} />;
  }

  // ── LEAF BRANCH ────────────────────────────
  // These components are content producers, resolved via registry
  const ResolvedComponent = resolveComponent(config.type, config.id);

  // Build props to pass into the resolved component
  // Entity-bound components get their entity definition injected
  const entityDef = config.entity
    ? appConfig.entities.find((e) => e.name === config.entity)
    : undefined;

  const componentProps = {
    ...((config.props as object) ?? {}),
    appId,
    userId,
    entityDef,
    entity: config.entity,
    metric: config.metric,
    triggers: config.triggers,
    appConfig,
    // Pass children config for any component that wants to render sub-content
    childrenConfig: config.children,
  };

  return <ResolvedComponent {...componentProps} />;
}
