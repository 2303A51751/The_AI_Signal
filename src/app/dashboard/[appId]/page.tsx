'use client';
// src/app/dashboard/[appId]/page.tsx
//
// The runtime app page. Fetches the AppConfiguration by ID,
// runs it through config repair, then hands it to the LayoutEngine.
// All rendering errors are caught at the component level via Error Boundaries.

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AppConfig } from '@/types/config';
import { LayoutEngine } from '@/components/engine/LayoutEngine';
import { Download, AlertTriangle, Loader2, Settings } from 'lucide-react';

interface LoadedApp {
  config: AppConfig;
  appId: string;
  wasRepaired: boolean;
  repairs: Array<{ path: string; issue: string }>;
}

export default function AppRuntimePage() {
  const { appId } = useParams<{ appId: string }>();
  const [app, setApp] = useState<LoadedApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRepairBanner, setShowRepairBanner] = useState(false);

  // Demo userId - replace with real auth
  const userId = 'demo-user-id';

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/config/${appId}`, {
          headers: { 'x-user-id': userId },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to load app');

        setApp({
          config: json.data.config,
          appId,
          wasRepaired: json.data.wasRepaired,
          repairs: json.data.repairs ?? [],
        });

        if (json.data.wasRepaired) setShowRepairBanner(true);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (appId) fetchConfig();
  }, [appId]);

  const handleExport = async () => {
    const url = `/api/export?appId=${appId}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${app?.config.slug ?? appId}.json`;
    a.click();
  };

  // ── LOADING ──────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading application...</p>
        </div>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────
  if (error || !app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <h2 className="font-semibold text-red-900 mb-1">Failed to load application</h2>
          <p className="text-sm text-red-700">{error ?? 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  // ── RUNTIME ──────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
              <Settings className="h-3.5 w-3.5 text-white" />
            </div>
            <h1 className="font-semibold text-gray-900 text-sm">{app.config.name}</h1>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              v{app.config.version ?? 1}
            </span>
          </div>

          <button
            onClick={handleExport}
            className="
              flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
              border border-gray-200 rounded-lg text-gray-600
              hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            <Download className="h-3.5 w-3.5" />
            Export Config
          </button>
        </div>
      </header>

      {/* Repair banner */}
      {showRepairBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="flex items-start gap-2 max-w-screen-2xl mx-auto">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 font-medium">
                Configuration was auto-repaired ({app.repairs.length} issue{app.repairs.length !== 1 ? 's' : ''} fixed)
              </p>
              <div className="mt-1 space-y-0.5">
                {app.repairs.slice(0, 3).map((r, i) => (
                  <p key={i} className="text-xs text-amber-700 font-mono">
                    {r.path}: {r.issue}
                  </p>
                ))}
                {app.repairs.length > 3 && (
                  <p className="text-xs text-amber-600">+ {app.repairs.length - 3} more</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowRepairBanner(false)}
              className="text-amber-500 hover:text-amber-700 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Runtime rendering */}
      <main>
        <LayoutEngine
          config={app.config.layout}
          appConfig={app.config}
          appId={appId}
          userId={userId}
        />
      </main>
    </div>
  );
}
