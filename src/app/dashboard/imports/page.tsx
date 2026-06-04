'use client';
// src/app/dashboard/imports/page.tsx
// Standalone CSV import manager. User selects app, then entity, then uploads.

import React, { useState, useEffect } from 'react';
import { CSVImportPanel } from '@/components/ui/CSVImportPanel';
import { AppConfig } from '@/types/config';
import { ChevronDown } from 'lucide-react';

interface AppSummary { id: string; name: string; slug: string; }

const USER_ID = 'demo-user-id';

export default function ImportsPage() {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/config', { headers: { 'x-user-id': USER_ID } })
      .then(r => r.json()).then(j => setApps(j.data ?? []));
  }, []);

  const handleAppSelect = async (id: string) => {
    setSelectedAppId(id);
    setAppConfig(null);
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/config/${id}`, { headers: { 'x-user-id': USER_ID } });
      const json = await res.json();
      if (res.ok) setAppConfig(json.data.config);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">CSV Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bulk-load records into any entity. Valid rows are always committed; invalid rows are skipped with error details.
        </p>
      </div>

      {/* App selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Select Application</label>
        <div className="relative w-64">
          <select
            value={selectedAppId}
            onChange={e => handleAppSelect(e.target.value)}
            className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="">Choose an app...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading && (
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      )}

      {appConfig && selectedAppId && (
        <CSVImportPanel
          appId={selectedAppId}
          userId={USER_ID}
          appConfig={appConfig}
        />
      )}

      {!selectedAppId && (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
          Select an application above to begin importing
        </div>
      )}
    </div>
  );
}
