// src/lib/runtime/config-repair.ts
//
// The Config Repair Engine: Takes raw user-submitted JSON,
// runs it through Zod's resilient validators, and produces a
// guaranteed-safe config + a diff report of what was repaired.
//
// Design decision: We NEVER throw here. We return a result object
// so callers can decide how to surface the repair info to users.

import { AppConfigSchema, ValidatedAppConfig } from '@/lib/validators/config.validator';
import { AppConfig } from '@/types/config';

export interface RepairResult {
  config: ValidatedAppConfig;
  wasRepaired: boolean;
  repairs: RepairEntry[];
  originalSlug?: string;
}

export interface RepairEntry {
  path: string;
  issue: string;
  originalValue?: unknown;
  repairedValue?: unknown;
}

/**
 * Validates and repairs an arbitrary JSON blob into a valid AppConfig.
 * This is the ONLY way configs should enter the system.
 */
export function repairAppConfig(raw: unknown): RepairResult {
  const repairs: RepairEntry[] = [];

  // First pass: check what Zod would reject, to generate repair log
  const parseResult = AppConfigSchema.safeParse(raw);

  if (parseResult.success) {
    return {
      config: parseResult.data,
      wasRepaired: false,
      repairs: [],
    };
  }

  // Second pass: use .parse() which applies all .catch() fallbacks
  // This always succeeds (that's the guarantee of .catch())
  const repairedConfig = AppConfigSchema.parse(raw ?? {});

  // Build repair log from Zod errors
  if (parseResult.error) {
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join('.') || 'root';
      repairs.push({
        path,
        issue: issue.message,
        originalValue: getNestedValue(raw, issue.path),
        repairedValue: getNestedValue(repairedConfig, issue.path),
      });
    }
  }

  return {
    config: repairedConfig,
    wasRepaired: repairs.length > 0,
    repairs,
    originalSlug: (raw as any)?.slug,
  };
}

/**
 * Deeply validates entity data against its field definitions.
 * Returns validated data + per-field validation errors for UI display.
 */
export function validateEntityData(
  data: Record<string, unknown>,
  entityName: string,
  config: ValidatedAppConfig
): {
  data: Record<string, unknown>;
  errors: Record<string, string>;
  hasErrors: boolean;
} {
  const entity = config.entities.find((e) => e.name === entityName);
  if (!entity) {
    return { data, errors: {}, hasErrors: false };
  }

  const errors: Record<string, string> = {};

  // Check required fields
  for (const field of entity.fields) {
    const value = data[field.name];
    const isEmpty = value === undefined || value === null || value === '';

    if (field.required && isEmpty) {
      errors[field.name] = `${field.label} is required`;
    }

    if (field.type === 'email' && value && typeof value === 'string') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field.name] = `${field.label} must be a valid email`;
      }
    }

    if ((field.type === 'number' || field.type === 'currency') && value !== undefined && value !== '') {
      const num = Number(value);
      if (isNaN(num)) {
        errors[field.name] = `${field.label} must be a number`;
      } else {
        if (field.validation?.min !== undefined && num < field.validation.min) {
          errors[field.name] = `${field.label} must be at least ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          errors[field.name] = `${field.label} must be at most ${field.validation.max}`;
        }
      }
    }
  }

  return {
    data,
    errors,
    hasErrors: Object.keys(errors).length > 0,
  };
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────

function getNestedValue(obj: unknown, path: (string | number)[]): unknown {
  if (!path.length) return obj;
  let current: unknown = obj;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

/**
 * Parses a raw JSON string, returning null on any parse error.
 * Never throws.
 */
export function safeJsonParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
