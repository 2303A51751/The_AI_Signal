'use client';
// src/app/dashboard/workflows/page.tsx
// Global workflow log viewer across all user apps.

import React, { useState, useEffect } from 'react';
import { WorkflowPanel } from '@/components/ui/WorkflowPanel';
import { AppConfig } from '@/types/config';
import { ChevronDown } from 'lucide-react';

interface AppSummary { id: string; name: string; slug: string; }

const USER_ID = 'demo-user-id';

export default function WorkflowsPage() {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetch('/api/config', { headers: { 'x-user-id': USER_ID } })
      .then(r => r.json()).then(j => {
        const data = j.data ?? [];
        setApps(data);
        // Auto-select first app
        if (data.length > 0) handleSelect(data[0].id);
      });
  }, []);

  const handleSelect = async (id: string) => {
    setSelectedAppId(id);
    setAppConfig(null);
    if (!id) return;
    const res = await fetch(`/api/config/${id}`, { headers: { 'x-user-id': USER_ID } });
    const json = await res.json();
    if (res.ok) setAppConfig(json.data.config);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Workflow Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review trigger executions and action results across your applications.
        </p>
      </div>

      <div className="relative w-64">
        <select
          value={selectedAppId}
          onChange={e => handleSelect(e.target.value)}
          className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
        >
          <option value="">Choose an app...</option>
          {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>

      {selectedAppId && (
        <WorkflowPanel
          appId={selectedAppId}
          userId={USER_ID}
          appConfig={appConfig ?? undefined}
        />
      )}
    </div>
  );
}
