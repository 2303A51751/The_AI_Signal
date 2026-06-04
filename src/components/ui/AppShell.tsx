'use client';
// src/components/ui/AppShell.tsx
//
// The top-level navigation shell for the dashboard area.
// Renders the top bar, collapsible sidebar, and main content area.
// Accepts children for the main content slot.

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Code2, Settings, Menu, X,
  ChevronRight, Zap, Database, FileUp, Download,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Apps',       href: '/dashboard',          icon: LayoutDashboard, exact: true },
  { label: 'Editor',     href: '/dashboard/editor',   icon: Code2 },
  { label: 'Data',       href: '/dashboard/data',     icon: Database },
  { label: 'Imports',    href: '/dashboard/imports',  icon: FileUp },
  { label: 'Workflows',  href: '/dashboard/workflows',icon: Zap },
  { label: 'Export',     href: '/dashboard/export',   icon: Download },
  { label: 'Settings',   href: '/dashboard/settings', icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  /** Current app name shown in the top bar */
  appName?: string;
}

export function AppShell({ children, appName }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ── TOP BAR ────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-4 flex-shrink-0">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Code2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm hidden sm:block">MetaRuntime</span>
        </Link>

        {/* Breadcrumb */}
        {appName && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 min-w-0">
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
            <span className="truncate font-medium text-gray-700">{appName}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center
            text-xs font-semibold text-blue-700 flex-shrink-0">
            D
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR ─────────────────────────────────── */}
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-52 bg-white border-r border-gray-200 py-4 flex-shrink-0">
          <SidebarContent navItems={NAV_ITEMS} isActive={isActive} />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed left-0 top-14 bottom-0 z-40 w-52 bg-white border-r border-gray-200 py-4 md:hidden flex flex-col">
              <SidebarContent
                navItems={NAV_ITEMS}
                isActive={isActive}
                onNavigate={() => setSidebarOpen(false)}
              />
            </aside>
          </>
        )}

        {/* ── MAIN CONTENT ──────────────────────────────── */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR CONTENT
// ─────────────────────────────────────────────
function SidebarContent({
  navItems,
  isActive,
  onNavigate,
}: {
  navItems: NavItem[];
  isActive: (item: NavItem) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {navItems.map(item => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`
              flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
              transition-colors font-medium
              ${active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }
            `}
          >
            <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
