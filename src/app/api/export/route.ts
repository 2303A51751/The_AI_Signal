// src/app/api/export/route.ts
//
// Export: Returns the validated+repaired app config as a downloadable JSON file.
// Optionally includes the raw (original) schema for diffing.
// Also supports GitHub Gist export (mock - replace with real Octokit in production).

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  withErrorHandler,
  successResponse,
  errorResponse,
  getUserId,
} from '@/lib/api-helpers';
import { repairAppConfig } from '@/lib/runtime/config-repair';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const userId = getUserId(req);
  const appId = req.nextUrl.searchParams.get('appId');
  const format = req.nextUrl.searchParams.get('format') ?? 'json'; // json | gist
  const includeRaw = req.nextUrl.searchParams.get('includeRaw') === 'true';

  if (!appId) return errorResponse('appId is required', 400);

  const appConfig = await prisma.appConfiguration.findFirst({
    where: { id: appId, userId },
  });
  if (!appConfig) return errorResponse('App not found', 404);

  const { config: repairedConfig, wasRepaired, repairs } = repairAppConfig(appConfig.schema);

  const exportPayload = {
    _meta: {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      appId,
      version: appConfig.version,
      wasAutoRepaired: wasRepaired,
      repairs: wasRepaired ? repairs : undefined,
    },
    config: repairedConfig,
    ...(includeRaw && appConfig.rawSchema ? { rawConfig: appConfig.rawSchema } : {}),
  };

  if (format === 'gist') {
    // Mock GitHub Gist export
    // In production: use @octokit/rest with user's GitHub OAuth token
    const mockGistUrl = `https://gist.github.com/mock/${appId.slice(0, 8)}`;
    return successResponse({
      gistUrl: mockGistUrl,
      message: 'In production, this creates a real GitHub Gist via OAuth.',
      payload: exportPayload,
    });
  }

  // Return as downloadable JSON file
  return new Response(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${appConfig.slug}-v${appConfig.version}.json"`,
    },
  });
});
