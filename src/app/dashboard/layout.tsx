// src/app/dashboard/layout.tsx
// Wraps the entire /dashboard route tree in the AppShell navigation.
// Individual pages can still opt-out by rendering their own layout
// (e.g., the runtime [appId] page renders fullscreen).

import { AppShell } from '@/components/ui/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
