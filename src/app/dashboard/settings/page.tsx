'use client';
// src/app/dashboard/settings/page.tsx
import React from 'react';
import { Settings, User, Database, Shield, Bell } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Account',
    icon: User,
    items: [
      { label: 'Email', value: 'demo@metaruntime.dev', editable: false },
      { label: 'Display Name', value: 'Demo User', editable: true },
      { label: 'User ID', value: 'demo-user-id', editable: false, mono: true },
    ],
  },
  {
    title: 'Database',
    icon: Database,
    items: [
      { label: 'Provider', value: 'PostgreSQL (Neon)', editable: false },
      { label: 'Max JSONB record size', value: '5MB', editable: false },
      { label: 'Max CSV import size', value: '5MB', editable: false },
    ],
  },
  {
    title: 'Security',
    icon: Shield,
    items: [
      { label: 'Auth Provider', value: 'Demo mode (no auth)', editable: false },
      { label: 'Session timeout', value: 'N/A', editable: false },
    ],
  },
  {
    title: 'Notifications',
    icon: Bell,
    items: [
      { label: 'Workflow failure alerts', value: 'Disabled (configure webhook)', editable: false },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-gray-400" />
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      {SECTIONS.map(section => (
        <div key={section.title} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <section.icon className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">{section.title}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {section.items.map(item => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3 gap-4">
                <span className="text-sm text-gray-600 flex-shrink-0">{item.label}</span>
                <span className={`text-sm text-right truncate ${
                  (item as any).mono ? 'font-mono text-xs text-gray-400' : 'text-gray-900'
                }`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
        <p className="font-medium">Production checklist</p>
        <ul className="mt-2 space-y-1 text-xs text-blue-700 list-disc ml-4">
          <li>Replace demo auth with NextAuth / Clerk in <code className="font-mono">src/middleware.ts</code></li>
          <li>Set a real <code className="font-mono">DATABASE_URL</code> in your environment</li>
          <li>Add a GitHub OAuth token to <code className="font-mono">.env.local</code> for real Gist exports</li>
          <li>Configure webhook URLs in your workflow action configs</li>
          <li>Run <code className="font-mono">npm run db:migrate</code> for production migrations</li>
        </ul>
      </div>
    </div>
  );
}
