// src/app/api/generated/[appId]/[entity]/route.ts
//
// Dynamic catch-all route handling all CRUD for any entity in any app.
// URL pattern: /api/generated/{appId}/{entity}
//
// GET    → list records (paginated, filterable)
// POST   → create record
// PATCH  → update record (id in body)
// DELETE → delete record (id in query param)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  withErrorHandler,
  successResponse,
  errorResponse,
  safeParseBody,
  getUserId,
} from '@/lib/api-helpers';
import { repairAppConfig, validateEntityData } from '@/lib/runtime/config-repair';
import { buildEntityDataSchema, PaginationSchema } from '@/lib/validators/config.validator';
import { executeWorkflows } from '@/lib/runtime/workflow-engine';

type RouteParams = { params: { appId: string; entity: string } };

// ─────────────────────────────────────────────
// HELPER: Load and validate app config
// ─────────────────────────────────────────────
async function loadConfig(appId: string, userId: string) {
  const appConfig = await prisma.appConfiguration.findFirst({
    where: { id: appId, userId },
  });
  if (!appConfig) return null;

  const { config } = repairAppConfig(appConfig.schema);
  return config;
}

// ─────────────────────────────────────────────
// GET /api/generated/[appId]/[entity]
// ─────────────────────────────────────────────
export const GET = withErrorHandler(async (req: NextRequest, { params }: RouteParams) => {
  const { appId, entity } = params;
  const userId = getUserId(req);

  const config = await loadConfig(appId, userId);
  if (!config) return errorResponse('App not found', 404);

  const entityDef = config.entities.find((e) => e.name === entity);
  if (!entityDef) return errorResponse(`Entity '${entity}' not found in this app`, 404);

  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const pagination = PaginationSchema.parse(searchParams);

  const where = {
    appId,
    userId,
    entity,
    ...(pagination.search
      ? {
          data: {
            path: [],
            string_contains: pagination.search,
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.dynamicData.findMany({
      where,
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.dynamicData.count({ where }),
  ]);

  return successResponse({
    items: items.map((item) => ({ id: item.id, ...((item.data as object) ?? {}), _createdAt: item.createdAt })),
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    entityDef, // Return schema so frontend can render columns dynamically
  });
});

// ─────────────────────────────────────────────
// POST /api/generated/[appId]/[entity]
// ─────────────────────────────────────────────
export const POST = withErrorHandler(async (req: NextRequest, { params }: RouteParams) => {
  const { appId, entity } = params;
  const userId = getUserId(req);

  const config = await loadConfig(appId, userId);
  if (!config) return errorResponse('App not found', 404);

  const entityDef = config.entities.find((e) => e.name === entity);
  if (!entityDef) return errorResponse(`Entity '${entity}' not found`, 404);

  const rawBody = await safeParseBody(req);
  if (!rawBody) return errorResponse('Invalid JSON body', 400);

  // Validate with dynamically-built entity schema
  const dataSchema = buildEntityDataSchema(entityDef.fields);
  const validatedData = dataSchema.parse(rawBody);

  // Surface validation errors (required fields, etc.) without crashing
  const { errors, hasErrors } = validateEntityData(
    validatedData as Record<string, unknown>,
    entity,
    config
  );
  if (hasErrors) {
    return errorResponse('Validation failed', 422, errors);
  }

  const record = await prisma.dynamicData.create({
    data: { userId, appId, entity, data: validatedData },
  });

  // Fire workflows asynchronously (don't block response)
  executeWorkflows(config, {
    userId,
    appId,
    trigger: 'record_create',
    entity,
    payload: validatedData as Record<string, unknown>,
  }).catch(console.error);

  return successResponse({ id: record.id, ...((record.data as object) ?? {}) }, 201);
});

// ─────────────────────────────────────────────
// PATCH /api/generated/[appId]/[entity]
// ─────────────────────────────────────────────
export const PATCH = withErrorHandler(async (req: NextRequest, { params }: RouteParams) => {
  const { appId, entity } = params;
  const userId = getUserId(req);

  const config = await loadConfig(appId, userId);
  if (!config) return errorResponse('App not found', 404);

  const rawBody = await safeParseBody(req) as Record<string, unknown>;
  if (!rawBody) return errorResponse('Invalid JSON body', 400);

  const { id, ...updateData } = rawBody;
  if (!id) return errorResponse('Record id is required for updates', 400);

  const existing = await prisma.dynamicData.findFirst({
    where: { id: id as string, appId, userId, entity },
  });
  if (!existing) return errorResponse('Record not found', 404);

  const entityDef = config.entities.find((e) => e.name === entity);
  const dataSchema = buildEntityDataSchema(entityDef?.fields ?? []);
  const merged = dataSchema.parse({ ...(existing.data as object), ...updateData });

  const updated = await prisma.dynamicData.update({
    where: { id: id as string },
    data: { data: merged, updatedAt: new Date() },
  });

  executeWorkflows(config, {
    userId,
    appId,
    trigger: 'record_update',
    entity,
    payload: merged as Record<string, unknown>,
  }).catch(console.error);

  return successResponse({ id: updated.id, ...(updated.data as object) });
});

// ─────────────────────────────────────────────
// DELETE /api/generated/[appId]/[entity]?id=xxx
// ─────────────────────────────────────────────
export const DELETE = withErrorHandler(async (req: NextRequest, { params }: RouteParams) => {
  const { appId, entity } = params;
  const userId = getUserId(req);
  const id = req.nextUrl.searchParams.get('id');

  if (!id) return errorResponse('id query parameter is required', 400);

  const existing = await prisma.dynamicData.findFirst({
    where: { id, appId, userId, entity },
  });
  if (!existing) return errorResponse('Record not found', 404);

  await prisma.dynamicData.delete({ where: { id } });

  return successResponse({ deleted: true, id });
});
