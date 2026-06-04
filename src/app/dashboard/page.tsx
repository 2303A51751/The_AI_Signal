'use client';
// src/app/dashboard/page.tsx
// Home dashboard: lists all user apps with launch, export and delete controls.
// Config creation is now handled by the dedicated /dashboard/editor page.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play, Download, Trash2, Code2, ChevronRight,
  Plus, Database, Zap, FileUp, BarChart2,
} from 'lucide-react';

interface AppSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  version: number;
  updatedAt: string;
  isPublished: boolean;
}

const USER_ID = 'demo-user-id';

export default function DashboardPage() {
  const [apps, setApps] = useState<AppSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config', { headers: { 'x-user-id': USER_ID } });
      const json = await res.json();
      setApps(json.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApps(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will also delete all data records.`)) return;
    await fetch(`/api/config/${id}`, { method: 'DELETE', headers: { 'x-user-id': USER_ID } });
    fetchApps();
  };

  const handleExport = (app: AppSummary) => {
    const a = document.createElement('a');
    a.href = `/api/export?appId=${app.id}`;
    a.download = `${app.slug}-v${app.version}.json`;
    a.click();
  };

  // ── STATS CARDS ───────────────────────────────────────────────────
  const stats = [
    { label: 'Applications', value: apps.length, icon: Code2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Published', value: apps.filter(a => a.isPublished).length, icon: BarChart2, color: 'text-green-600 bg-green-50' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build and manage your JSON-driven applications
          </p>
        </div>
        <Link
          href="/dashboard/editor"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium
            bg-blue-600 text-white rounded-xl hover:bg-blue-700
            focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Application
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className={`h-8 w-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}

        {/* Quick-action cards */}
        {[
          { label: 'Import CSV', href: '/dashboard/imports', icon: FileUp, color: 'text-purple-600 bg-purple-50' },
          { label: 'Workflows', href: '/dashboard/workflows', icon: Zap, color: 'text-amber-600 bg-amber-50' },
        ].map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4
              hover:shadow-md transition-shadow group"
          >
            <div className={`h-8 w-8 rounded-lg ${card.color} flex items-center justify-center mb-2`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
              {card.label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-0.5">
              Open <ChevronRight className="h-3 w-3" />
            </p>
          </Link>
        ))}
      </div>

      {/* App list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Your Applications</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
            <Code2 className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No applications yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Create your first app by pasting a JSON config
            </p>
            <Link
              href="/dashboard/editor"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Application
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map(app => (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm
                  p-4 flex items-center gap-4 hover:shadow-md transition-shadow"
              >
                {/* Icon */}
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600
                  flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Code2 className="h-5 w-5 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 truncate">{app.name}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      v{app.version}
                    </span>
                    {app.isPublished && (
                      <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        Published
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <code className="font-mono">{app.slug}</code>
                    {app.description && ` · ${app.description}`}
                    {' · '}Updated {new Date(app.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link
                    href={`/dashboard/editor?load=${app.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit config"
                  >
                    <Code2 className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/dashboard/data?app=${app.id}`}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                    title="Browse data"
                  >
                    <Database className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleExport(app)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="Export config"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(app.id, app.name)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete app"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/dashboard/${app.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                      bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-1"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Launch
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
