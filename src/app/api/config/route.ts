// src/app/api/config/route.ts
// CRUD for AppConfiguration (save, list, load app configs)

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  withErrorHandler,
  successResponse,
  errorResponse,
  safeParseBody,
  getUserId,
} from '@/lib/api-helpers';
import { repairAppConfig } from '@/lib/runtime/config-repair';
import { SaveConfigRequestSchema } from '@/lib/validators/config.validator';

// GET /api/config - list all apps for user
export const GET = withErrorHandler(async (req: NextRequest) => {
  const userId = getUserId(req);

  const configs = await prisma.appConfiguration.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, slug: true, description: true,
      version: true, isPublished: true, createdAt: true, updatedAt: true,
    },
  });

  return successResponse(configs);
});

// POST /api/config - create or update app config
export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = getUserId(req);
  const rawBody = await safeParseBody(req);
  if (!rawBody) return errorResponse('Invalid request body', 400);

  const request = SaveConfigRequestSchema.parse(rawBody);
  const rawSchema = (rawBody as any).schema;

  // Repair the schema - never store a broken config
  const { config: repairedConfig, wasRepaired, repairs } = repairAppConfig(rawSchema);

  // Upsert by userId + slug
  const result = await prisma.appConfiguration.upsert({
    where: {
      userId_slug: { userId, slug: request.slug },
    },
    create: {
      userId,
      name: request.name,
      slug: request.slug,
      description: request.description,
      schema: repairedConfig as any,
      rawSchema: rawSchema ?? null,
      version: 1,
    },
    update: {
      name: request.name,
      description: request.description,
      schema: repairedConfig as any,
      rawSchema: rawSchema ?? null,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  });

  return successResponse({
    id: result.id,
    slug: result.slug,
    version: result.version,
    wasRepaired,
    repairs,
  }, 201);
});
