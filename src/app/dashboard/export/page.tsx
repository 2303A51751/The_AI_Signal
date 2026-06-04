'use client';
// src/app/dashboard/export/page.tsx
// Lists all apps and provides one-click JSON export and mock GitHub Gist export.

import React, { useState, useEffect } from 'react';
import { Download, Github, FileJson, Loader2, CheckCircle } from 'lucide-react';

interface AppSummary {
  id: string;
  name: string;
  slug: string;
  version: number;
  updatedAt: string;
}

const USER_ID = 'demo-user-id';

export default function ExportPage() {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [gistResult, setGistResult] = useState<{ appId: string; url: string } | null>(null);

  useEffect(() => {
    fetch('/api/config', { headers: { 'x-user-id': USER_ID } })
      .then(r => r.json())
      .then(j => { setApps(j.data ?? []); setLoading(false); });
  }, []);

  const handleJsonExport = (app: AppSummary) => {
    const a = document.createElement('a');
    a.href = `/api/export?appId=${app.id}`;
    a.download = `${app.slug}-v${app.version}.json`;
    a.click();
  };

  const handleGistExport = async (app: AppSummary) => {
    setExporting(app.id);
    setGistResult(null);
    try {
      const res = await fetch(`/api/export?appId=${app.id}&format=gist`, {
        headers: { 'x-user-id': USER_ID },
      });
      const json = await res.json();
      if (res.ok) {
        setGistResult({ appId: app.id, url: json.data.gistUrl });
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Export Configurations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Download your validated, auto-repaired app configs as JSON or publish to GitHub Gist.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No apps to export yet. Create one from the dashboard.
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <div key={app.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4
                flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="font-medium text-gray-900 truncate">{app.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
                    v{app.version}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 ml-6">
                  {app.slug} · Updated {new Date(app.updatedAt).toLocaleDateString()}
                </p>

                {/* Gist result banner */}
                {gistResult?.appId === app.id && (
                  <div className="mt-2 ml-6 flex items-center gap-2 text-xs text-green-700">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <a href={gistResult.url} target="_blank" rel="noopener noreferrer"
                      className="underline underline-offset-2">
                      {gistResult.url}
                    </a>
                    <span className="text-green-500">(mock — wire real OAuth token to enable)</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleGistExport(app)}
                  disabled={exporting === app.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                    border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50
                    disabled:opacity-50"
                  title="Export to GitHub Gist (mock)"
                >
                  {exporting === app.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Github className="h-3.5 w-3.5" />
                  }
                  Gist
                </button>

                <button
                  onClick={() => handleJsonExport(app)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                    bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  title="Download repaired JSON"
                >
                  <Download className="h-3.5 w-3.5" />
                  JSON
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">About exports</p>
        <p className="text-xs text-blue-700 leading-relaxed">
          Exported configs always contain the <strong>auto-repaired</strong> version with a{' '}
          <code className="font-mono text-xs bg-blue-100 px-1 rounded">_meta.repairs</code> array
          documenting what was fixed. Re-importing these configs will validate cleanly. The raw
          original is stored separately in the database and never modified.
        </p>
      </div>
    </div>
  );
}
