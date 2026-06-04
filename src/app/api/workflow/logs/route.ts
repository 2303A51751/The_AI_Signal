// src/app/api/workflow/logs/route.ts
// Returns workflow execution logs for an app (for the WorkflowPanel component)

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import { withErrorHandler, successResponse, errorResponse, getUserId } from '@/lib/api-helpers';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const userId = getUserId(req);
  const appId = req.nextUrl.searchParams.get('appId');
  if (!appId) return errorResponse('appId is required', 400);

  const logs = await prisma.workflowLog.findMany({
    where: { appId, userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return successResponse(logs);
});
