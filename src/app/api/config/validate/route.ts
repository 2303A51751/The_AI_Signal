// src/app/api/config/validate/route.ts
//
// Lightweight endpoint for client-side live validation in the editor.
// Accepts a raw schema blob, runs repairAppConfig, returns repair diff.
// Does NOT write to the database.

import { NextRequest } from 'next/server';
import {
  withErrorHandler, successResponse, errorResponse, safeParseBody,
} from '@/lib/api-helpers';
import { repairAppConfig } from '@/lib/runtime/config-repair';

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await safeParseBody(req);
  if (!body) return errorResponse('Invalid request body', 400);

  const rawSchema = (body as any).schema;
  if (rawSchema === undefined) return errorResponse('schema field is required', 400);

  const { config, wasRepaired, repairs } = repairAppConfig(rawSchema);

  return successResponse({
    valid: true,
    wasRepaired,
    repairs,
    // Return the repaired config so the editor can show a preview
    repairedConfig: config,
  });
});
