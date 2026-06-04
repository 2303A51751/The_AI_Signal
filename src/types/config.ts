// src/types/config.ts
// Central type definitions for the metadata-driven runtime.
// All JSON configs are validated against these shapes via Zod before use.

// ─────────────────────────────────────────────
// FIELD TYPES
// ─────────────────────────────────────────────
export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'date'
  | 'boolean'
  | 'select'
  | 'textarea'
  | 'currency';

export interface FieldOption {
  label: string;
  value: string | number;
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: unknown;
  options?: FieldOption[];   // For `select` type
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// ─────────────────────────────────────────────
// ENTITY DEFINITION (Database table equivalent)
// ─────────────────────────────────────────────
export interface EntityDefinition {
  name: string;           // e.g. "employees"
  label: string;          // e.g. "Employees"
  labelSingular?: string; // e.g. "Employee"
  fields: FieldDefinition[];
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

// ─────────────────────────────────────────────
// COMPONENT REGISTRY TYPES
// These map to registered React components in the component registry.
// ─────────────────────────────────────────────
export type ComponentType =
  | 'DataTable'
  | 'Form'
  | 'MetricCard'
  | 'MetricCardGroup'
  | 'Layout'
  | 'TabLayout'
  | 'SidebarLayout'
  | 'Heading'
  | 'Text'
  | 'Divider'
  | 'CSVImport'
  | 'WorkflowPanel';

export interface ComponentConfig {
  id: string;
  type: ComponentType;
  props?: Record<string, unknown>;
  children?: ComponentConfig[];
  // For entity-bound components
  entity?: string;
  // For metric cards
  metric?: {
    entity: string;
    field: string;
    aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
    label: string;
    icon?: string;
    prefix?: string;
    suffix?: string;
  };
  // Workflow triggers attached to this component
  triggers?: WorkflowTrigger[];
}

// ─────────────────────────────────────────────
// WORKFLOW ENGINE
// ─────────────────────────────────────────────
export type TriggerEvent = 'form_submit' | 'record_create' | 'record_update' | 'record_delete' | 'csv_import';
export type ActionType = 'webhook' | 'notification' | 'log' | 'email';

export interface WorkflowAction {
  type: ActionType;
  label?: string;
  config?: Record<string, unknown>;
}

export interface WorkflowTrigger {
  event: TriggerEvent;
  entity?: string;
  conditions?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
    value: unknown;
  }>;
  actions: WorkflowAction[];
}

// ─────────────────────────────────────────────
// TOP-LEVEL APP CONFIGURATION
// This is the root JSON blob that drives the entire application.
// ─────────────────────────────────────────────
export interface AppConfig {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  version?: number;
  theme?: {
    primaryColor?: string;
    mode?: 'light' | 'dark';
  };
  entities: EntityDefinition[];
  layout: ComponentConfig;
  workflows?: WorkflowTrigger[];
}

// ─────────────────────────────────────────────
// RUNTIME CONTEXT
// Passed down through the rendering tree.
// ─────────────────────────────────────────────
export interface RuntimeContext {
  appId: string;
  config: AppConfig;
  userId: string;
}

// ─────────────────────────────────────────────
// API RESPONSE SHAPES
// ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
