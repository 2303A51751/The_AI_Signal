// src/middleware.ts
//
// Auth middleware scaffold. Currently allows all requests through
// with a demo user header injected. Replace the body with your
// real auth provider (NextAuth, Clerk, etc.) before production.
//
// NextAuth example:
//   import { withAuth } from 'next-auth/middleware';
//   export default withAuth({ pages: { signIn: '/login' } });
//
// Clerk example:
//   import { authMiddleware } from '@clerk/nextjs';
//   export default authMiddleware({ publicRoutes: ['/'] });

import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ── DEMO MODE ─────────────────────────────────────────────────────
  // Inject a stable demo userId so API routes have something to work with.
  // REMOVE THIS in production and use a real auth token instead.
  if (!req.headers.get('x-user-id')) {
    res.headers.set('x-user-id', 'demo-user-id');
  }

  // ── SECURITY HEADERS ──────────────────────────────────────────────
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return res;
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
