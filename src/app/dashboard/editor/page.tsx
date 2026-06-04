'use client';
// src/app/dashboard/editor/page.tsx
// Full-page config editor with app selector and live validation.

import React, { useState, useEffect } from 'react';
import { ConfigEditorPanel } from '@/components/ui/ConfigEditorPanel';
import { EXAMPLE_CONFIG } from '@/lib/runtime/example-config';
import { ChevronDown, Play } from 'lucide-react';
import Link from 'next/link';

interface AppSummary {
  id: string;
  name: string;
  slug: string;
  version: number;
}

const DEMO_JSON = JSON.stringify(EXAMPLE_CONFIG, null, 2);
const USER_ID = 'demo-user-id';

export default function EditorPage() {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppSummary | null>(null);
  const [editorValue, setEditorValue] = useState(DEMO_JSON);
  const [saving, setSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config', { headers: { 'x-user-id': USER_ID } })
      .then(r => r.json())
      .then(j => setApps(j.data ?? []));
  }, []);

  const handleAppSelect = async (app: AppSummary) => {
    setSelectedApp(app);
    const res = await fetch(`/api/config/${app.id}`, { headers: { 'x-user-id': USER_ID } });
    const json = await res.json();
    if (res.ok) {
      setEditorValue(JSON.stringify(json.data.config, null, 2));
    }
  };

  const handleSave = async (raw: string) => {
    setSaving(true);
    try {
      let parsed: any;
      try { parsed = JSON.parse(raw); }
      catch { return { ok: false, error: 'Invalid JSON syntax' }; }

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': USER_ID },
        body: JSON.stringify({
          name: parsed.name ?? 'Untitled App',
          slug: parsed.slug ?? 'untitled-app',
          description: parsed.description,
          schema: parsed,
        }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error ?? 'Save failed' };

      setLastSavedId(json.data.id ?? selectedApp?.id ?? null);
      // Refresh app list
      fetch('/api/config', { headers: { 'x-user-id': USER_ID } })
        .then(r => r.json()).then(j => setApps(j.data ?? []));

      return { ok: true, wasRepaired: json.data.wasRepaired, repairs: json.data.repairs };
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      {/* App picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <select
            onChange={e => {
              const app = apps.find(a => a.id === e.target.value);
              if (app) handleAppSelect(app);
            }}
            value={selectedApp?.id ?? ''}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
          >
            <option value="">— Load existing app —</option>
            {apps.map(a => (
              <option key={a.id} value={a.id}>{a.name} (v{a.version})</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        <span className="text-gray-300 text-sm">or paste your own config below</span>

        {lastSavedId && (
          <Link
            href={`/dashboard/${lastSavedId}`}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-medium
              bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Play className="h-4 w-4" />
            Launch App
          </Link>
        )}
      </div>

      <ConfigEditorPanel
        initialValue={editorValue}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
