// src/app/api/csv-import/route.ts
//
// CSV Import: Accepts multipart form upload, parses CSV,
// validates each row against entity schema, bulk-inserts valid rows,
// returns per-row validation report.
//
// Design: Never fails silently. Invalid rows are skipped with error details.
// Valid rows are always committed, even if some rows fail.

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/prisma';
import {
  withErrorHandler,
  successResponse,
  errorResponse,
  getUserId,
} from '@/lib/api-helpers';
import { repairAppConfig, validateEntityData } from '@/lib/runtime/config-repair';
import { buildEntityDataSchema } from '@/lib/validators/config.validator';
import { executeWorkflows } from '@/lib/runtime/workflow-engine';

interface CsvRowResult {
  row: number;
  status: 'imported' | 'skipped';
  errors?: Record<string, string>;
  data?: Record<string, unknown>;
}

// Minimal CSV parser - no deps required. Handles quoted fields.
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const userId = getUserId(req);

  const formData = await req.formData().catch(() => null);
  if (!formData) return errorResponse('Invalid multipart form data', 400);

  const file = formData.get('file') as File | null;
  const appId = formData.get('appId') as string | null;
  const entityName = formData.get('entity') as string | null;

  if (!file) return errorResponse('No file uploaded', 400);
  if (!appId) return errorResponse('appId is required', 400);
  if (!entityName) return errorResponse('entity is required', 400);

  // Validate file type
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    return errorResponse('Only CSV files are supported', 400);
  }

  // Size limit: 5MB
  if (file.size > 5 * 1024 * 1024) {
    return errorResponse('File too large. Maximum size is 5MB', 400);
  }

  // Load app config
  const appConfig = await prisma.appConfiguration.findFirst({
    where: { id: appId, userId },
  });
  if (!appConfig) return errorResponse('App not found', 404);

  const { config } = repairAppConfig(appConfig.schema);
  const entityDef = config.entities.find((e) => e.name === entityName);
  if (!entityDef) return errorResponse(`Entity '${entityName}' not found`, 404);

  // Parse CSV
  const csvText = await file.text();
  const rows = parseCSV(csvText);

  if (rows.length === 0) {
    return errorResponse('CSV file is empty or has no data rows', 400);
  }

  const dataSchema = buildEntityDataSchema(entityDef.fields);
  const results: CsvRowResult[] = [];
  const validRecords: Array<{ userId: string; appId: string; entity: string; data: object }> = [];

  for (let i = 0; i < rows.length; i++) {
    const rawRow = rows[i];
    const rowNumber = i + 2; // 1-indexed, skip header

    try {
      const coerced = dataSchema.parse(rawRow);
      const { errors, hasErrors } = validateEntityData(
        coerced as Record<string, unknown>,
        entityName,
        config
      );

      if (hasErrors) {
        results.push({ row: rowNumber, status: 'skipped', errors, data: rawRow });
      } else {
        validRecords.push({ userId, appId, entity: entityName, data: coerced as object });
        results.push({ row: rowNumber, status: 'imported', data: coerced as Record<string, unknown> });
      }
    } catch {
      results.push({
        row: rowNumber,
        status: 'skipped',
        errors: { _row: 'Row could not be parsed' },
        data: rawRow,
      });
    }
  }

  // Bulk insert valid records
  let importedCount = 0;
  if (validRecords.length > 0) {
    const created = await prisma.dynamicData.createMany({
      data: validRecords,
      skipDuplicates: true,
    });
    importedCount = created.count;
  }

  // Fire csv_import workflow
  if (importedCount > 0) {
    executeWorkflows(config, {
      userId,
      appId,
      trigger: 'csv_import',
      entity: entityName,
      payload: { importedCount, totalRows: rows.length },
    }).catch(console.error);
  }

  return successResponse({
    totalRows: rows.length,
    importedCount,
    skippedCount: rows.length - importedCount,
    results,
  });
});
