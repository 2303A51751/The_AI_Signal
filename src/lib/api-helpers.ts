// src/lib/api-helpers.ts
// Centralized response formatting and error handling for API routes.
// All routes use these helpers to ensure consistent response shapes.

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/types/config';

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, { status });
}

export function errorResponse(error: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json(
    { success: false, error, details } satisfies ApiResponse,
    { status }
  );
}

/**
 * Wraps an async route handler with global error catching.
 * Converts ZodErrors into structured 422 responses.
 * Prevents any 500 from leaking unformatted stack traces.
 */
export function withErrorHandler(
  handler: (req: Request, ctx?: any) => Promise<NextResponse>
) {
  return async (req: Request, ctx?: any): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        return errorResponse('Validation failed', 422, err.flatten().fieldErrors);
      }

      // Duplicate key (Prisma P2002)
      if ((err as any)?.code === 'P2002') {
        return errorResponse('A record with this identifier already exists', 409);
      }

      // Record not found (Prisma P2025)
      if ((err as any)?.code === 'P2025') {
        return errorResponse('Record not found', 404);
      }

      console.error('[API_ERROR]', err);
      return errorResponse('An unexpected error occurred', 500);
    }
  };
}

/**
 * Parses request body safely. Returns null on any parse failure.
 */
export async function safeParseBody(req: Request): Promise<unknown> {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Gets a mock userId from headers. Replace with real auth (next-auth, Clerk, etc.)
 */
export function getUserId(req: Request): string {
  // In production: extract from JWT/session
  return req.headers.get('x-user-id') ?? 'demo-user-id';
}
