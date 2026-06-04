// src/lib/validators/config.validator.ts
// 
// ARCHITECTURAL PHILOSOPHY:
// This file is the RESILIENCE CORE of the system. Every JSON config
// passes through here before any component renders or DB write happens.
//
// Rules:
// 1. NEVER throw on bad input - always coerce to a safe default.
// 2. Use .catch() for values that must have a fallback.
// 3. Use .default() for optional-but-expected fields.
// 4. Use .partial() on entity schemas for PATCH-style API calls.
// 5. Invalid configs are REPAIRED, not rejected. The original is preserved.
//
// This approach means the UI never white-screens on a bad config,
// and users can always export the repaired version.

import { z } from 'zod';

// ─────────────────────────────────────────────
// PRIMITIVES WITH SAFE FALLBACKS
// ─────────────────────────────────────────────

const SafeString = z.string().catch('');
const SafeNonEmptyString = (fallback: string | (() => string)) =>
  typeof fallback === 'function'
    ? z.string().min(1).catch(() => fallback())
    : z.string().min(1).catch(fallback);

const SafeNumber = z.number().catch(0);
const SafeBoolean = z.boolean().catch(false);

// ─────────────────────────────────────────────
// FIELD VALIDATORS
// ─────────────────────────────────────────────

export const FieldTypeSchema = z
  .enum(['text', 'number', 'email', 'password', 'date', 'boolean', 'select', 'textarea', 'currency'])
  .catch('text'); // Unknown field types default to text input

export const FieldOptionSchema = z.object({
  label: SafeString,
  value: z.union([z.string(), z.number()]).catch(''),
});

export const FieldValidationSchema = z
  .object({
    min: SafeNumber.optional(),
    max: SafeNumber.optional(),
    pattern: SafeString.optional(),
  })
  .catch({});

export const FieldDefinitionSchema = z.object({
  name: SafeNonEmptyString('unnamed_field'),
  label: SafeNonEmptyString('Unnamed Field'),
  type: FieldTypeSchema,
  required: SafeBoolean.default(false),
  defaultValue: z.unknown().optional(),
  options: z.array(FieldOptionSchema).catch([]),
  placeholder: SafeString.optional(),
  validation: FieldValidationSchema.optional(),
});

// ─────────────────────────────────────────────
// ENTITY VALIDATORS
// ─────────────────────────────────────────────

export const EntityDefinitionSchema = z.object({
  name: SafeNonEmptyString('unnamed_entity'),
  label: SafeNonEmptyString('Unnamed Entity'),
  labelSingular: SafeString.optional(),
  fields: z.array(FieldDefinitionSchema).catch([]),
  defaultSortField: SafeString.optional(),
  defaultSortOrder: z.enum(['asc', 'desc']).catch('asc'),
});

// ─────────────────────────────────────────────
// WORKFLOW VALIDATORS
// ─────────────────────────────────────────────

export const TriggerEventSchema = z
  .enum(['form_submit', 'record_create', 'record_update', 'record_delete', 'csv_import'])
  .catch('form_submit');

export const ActionTypeSchema = z
  .enum(['webhook', 'notification', 'log', 'email'])
  .catch('log');

export const WorkflowActionSchema = z.object({
  type: ActionTypeSchema,
  label: SafeString.optional(),
  config: z.record(z.unknown()).catch({}),
});

export const WorkflowConditionSchema = z.object({
  field: SafeString,
  operator: z.enum(['eq', 'neq', 'gt', 'lt', 'contains']).catch('eq'),
  value: z.unknown(),
});

export const WorkflowTriggerSchema = z.object({
  event: TriggerEventSchema,
  entity: SafeString.optional(),
  conditions: z.array(WorkflowConditionSchema).catch([]),
  actions: z.array(WorkflowActionSchema).catch([]),
});

// ─────────────────────────────────────────────
// COMPONENT CONFIG VALIDATORS
// Note: Recursive schema - children can contain more components.
// z.lazy() is required for the self-referential type.
// ─────────────────────────────────────────────

export const ComponentTypeSchema = z
  .enum([
    'DataTable', 'Form', 'MetricCard', 'MetricCardGroup',
    'Layout', 'TabLayout', 'SidebarLayout',
    'Heading', 'Text', 'Divider', 'CSVImport', 'WorkflowPanel',
  ])
  .catch('Text'); // Unknown component types fall back to Text

export const MetricConfigSchema = z
  .object({
    entity: SafeString,
    field: SafeString,
    aggregation: z.enum(['count', 'sum', 'avg', 'min', 'max']).catch('count'),
    label: SafeNonEmptyString('Metric'),
    icon: SafeString.optional(),
    prefix: SafeString.optional(),
    suffix: SafeString.optional(),
  })
  .catch({ entity: '', field: '', aggregation: 'count', label: 'Metric' });

// Use z.lazy for recursive children
export type ComponentConfigInput = z.input<typeof ComponentConfigSchema>;

export const ComponentConfigSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: SafeNonEmptyString(() => `component_${Math.random().toString(36).slice(2)}`),
    type: ComponentTypeSchema,
    props: z.record(z.unknown()).catch({}),
    children: z.array(ComponentConfigSchema).catch([]),
    entity: SafeString.optional(),
    metric: MetricConfigSchema.optional(),
    triggers: z.array(WorkflowTriggerSchema).catch([]),
  })
);

// ─────────────────────────────────────────────
// APP CONFIG (ROOT VALIDATOR)
// This is the top-level validator. All configs pass through here.
// ─────────────────────────────────────────────

export const ThemeSchema = z
  .object({
    primaryColor: SafeString.default('#3b82f6'),
    mode: z.enum(['light', 'dark']).catch('light'),
  })
  .catch({ primaryColor: '#3b82f6', mode: 'light' });

export const AppConfigSchema = z.object({
  id: SafeString.optional(),
  name: SafeNonEmptyString('Untitled App'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .catch('untitled-app'),
  description: SafeString.optional(),
  version: z.number().int().positive().catch(1),
  theme: ThemeSchema.default({ primaryColor: '#3b82f6', mode: 'light' }),
  entities: z.array(EntityDefinitionSchema).catch([]),
  layout: ComponentConfigSchema,
  workflows: z.array(WorkflowTriggerSchema).catch([]),
});

export type ValidatedAppConfig = z.infer<typeof AppConfigSchema>;

// ─────────────────────────────────────────────
// DYNAMIC DATA VALIDATORS
// Built at runtime from entity field definitions.
// ─────────────────────────────────────────────

/**
 * Builds a Zod schema dynamically from an EntityDefinition's fields.
 * Numbers default to 0, strings default to '', booleans to false.
 * This ensures no record write ever fails due to missing/null fields.
 */
export function buildEntityDataSchema(fields: z.infer<typeof FieldDefinitionSchema>[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case 'number':
      case 'currency':
        // Architectural decision: coerce strings to numbers for CSV imports
        fieldSchema = z.coerce.number().catch(0);
        break;
      case 'boolean':
        fieldSchema = z.coerce.boolean().catch(false);
        break;
      case 'email':
        fieldSchema = z.string().email().catch('');
        break;
      case 'date':
        fieldSchema = z.string().datetime({ offset: true }).or(z.string()).catch('');
        break;
      default:
        fieldSchema = z.string().catch('');
    }

    // Apply default value from field definition if provided
    if (field.defaultValue !== undefined) {
      fieldSchema = fieldSchema.default(field.defaultValue as any);
    }

    // Required fields still get .catch() so they never break the system -
    // but we track validation errors separately to surface in the UI.
    shape[field.name] = fieldSchema;
  }

  return z.object(shape).partial().passthrough();
}

// ─────────────────────────────────────────────
// API REQUEST VALIDATORS
// ─────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  sortField: SafeString.optional(),
  sortOrder: z.enum(['asc', 'desc']).catch('asc'),
  search: SafeString.optional(),
});

export const SaveConfigRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  schema: z.unknown(), // Raw schema - we'll validate/repair separately
});

export const CSVImportRequestSchema = z.object({
  entity: z.string().min(1),
  appId: z.string().min(1),
  overwrite: z.boolean().catch(false),
});
