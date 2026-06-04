'use client';
// src/app/dashboard/data/page.tsx
// Cross-app entity data browser using DataTable.

import React, { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { AppConfig, EntityDefinition } from '@/types/config';
import { ChevronDown } from 'lucide-react';

interface AppSummary { id: string; name: string; }

const USER_ID = 'demo-user-id';

export default function DataPage() {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [selectedEntity, setSelectedEntity] = useState('');

  useEffect(() => {
    fetch('/api/config', { headers: { 'x-user-id': USER_ID } })
      .then(r => r.json()).then(j => {
        const data = j.data ?? [];
        setApps(data);
        if (data.length > 0) handleAppSelect(data[0].id);
      });
  }, []);

  const handleAppSelect = async (id: string) => {
    setSelectedAppId(id);
    setAppConfig(null);
    setSelectedEntity('');
    if (!id) return;
    const res = await fetch(`/api/config/${id}`, { headers: { 'x-user-id': USER_ID } });
    const json = await res.json();
    if (res.ok) {
      setAppConfig(json.data.config);
      if (json.data.config.entities?.length > 0) {
        setSelectedEntity(json.data.config.entities[0].name);
      }
    }
  };

  const entityDef: EntityDefinition | undefined =
    appConfig?.entities.find(e => e.name === selectedEntity);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Data Browser</h1>
        <p className="text-sm text-gray-500 mt-1">Browse and manage records for any entity in your apps.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            value={selectedAppId}
            onChange={e => handleAppSelect(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="">Select app...</option>
            {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {appConfig && appConfig.entities.length > 0 && (
          <div className="relative">
            <select
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              {appConfig.entities.map(e => (
                <option key={e.name} value={e.name}>{e.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {selectedAppId && selectedEntity && entityDef ? (
        <DataTable
          appId={selectedAppId}
          userId={USER_ID}
          entity={selectedEntity}
          entityDef={entityDef}
          props={{ allowCreate: true, allowEdit: true, allowDelete: true }}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-16 text-center text-sm text-gray-400">
          Select an app and entity above to browse data
        </div>
      )}
    </div>
  );
}
