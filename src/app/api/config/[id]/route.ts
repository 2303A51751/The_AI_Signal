// src/app/api/config/[id]/route.ts
// Load a single AppConfiguration by ID, returning the repaired schema

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import { withErrorHandler, successResponse, errorResponse, getUserId } from '@/lib/api-helpers';
import { repairAppConfig } from '@/lib/runtime/config-repair';

type Params = { params: { id: string } };

export const GET = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const userId = getUserId(req);

  const appConfig = await prisma.appConfiguration.findFirst({
    where: { id: params.id, userId },
  });

  if (!appConfig) return errorResponse('App not found', 404);

  const { config, wasRepaired, repairs } = repairAppConfig(appConfig.schema);

  return successResponse({
    id: appConfig.id,
    name: appConfig.name,
    slug: appConfig.slug,
    description: appConfig.description,
    version: appConfig.version,
    isPublished: appConfig.isPublished,
    config,
    wasRepaired,
    repairs,
  });
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: Params) => {
  const userId = getUserId(req);

  const existing = await prisma.appConfiguration.findFirst({
    where: { id: params.id, userId },
  });
  if (!existing) return errorResponse('App not found', 404);

  await prisma.appConfiguration.delete({ where: { id: params.id } });
  return successResponse({ deleted: true });
});
