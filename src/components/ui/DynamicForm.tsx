'use client';
// src/components/ui/DynamicForm.tsx
//
// Renders a fully dynamic form from an EntityDefinition.
// Fields are generated from field definitions at runtime.
// Validation errors come from the API (Zod) and are displayed inline.

import React, { useState } from 'react';
import { EntityDefinition, FieldDefinition } from '@/types/config';
import { CheckCircle, Loader2 } from 'lucide-react';

interface DynamicFormProps {
  appId: string;
  userId: string;
  entity?: string;
  entityDef?: EntityDefinition;
  props?: {
    title?: string;
    submitLabel?: string;
    successMessage?: string;
    onSuccess?: () => void;
  };
}

type FormData = Record<string, string | number | boolean>;
type FormErrors = Record<string, string>;

export function DynamicForm({ appId, entity, entityDef, props: formProps }: DynamicFormProps) {
  const [formData, setFormData] = useState<FormData>(() => buildInitialData(entityDef));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fields = entityDef?.fields ?? [];
  const title = formProps?.title ?? `Add ${entityDef?.labelSingular ?? entityDef?.label ?? 'Record'}`;
  const submitLabel = formProps?.submitLabel ?? 'Submit';
  const successMessage = formProps?.successMessage ?? 'Record saved successfully!';

  const handleChange = (name: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entity || !appId) return;

    setSubmitting(true);
    setErrors({});

    try {
      const res = await fetch(`/api/generated/${appId}/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        // Surface field-level validation errors from API
        if (res.status === 422 && json.details) {
          setErrors(json.details as FormErrors);
        } else {
          setErrors({ _form: json.error ?? 'Submission failed' });
        }
        return;
      }

      setSuccess(true);
      setFormData(buildInitialData(entityDef));
      formProps?.onSuccess?.();

      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setErrors({ _form: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      noValidate
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>

      {/* Fields */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <FieldRenderer
            key={field.name}
            field={field}
            value={formData[field.name] ?? ''}
            error={errors[field.name]}
            onChange={(val) => handleChange(field.name, val)}
          />
        ))}
      </div>

      {/* Form-level error */}
      {errors._form && (
        <div className="mx-4 mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {errors._form}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mx-4 mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="
            flex items-center gap-2 px-4 py-2 text-sm font-medium
            bg-blue-600 text-white rounded-lg hover:bg-blue-700
            disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────
// FIELD RENDERER
// Renders a single field based on its type.
// Unknown types default to text input (via Zod's .catch('text')).
// ─────────────────────────────────────────────
interface FieldRendererProps {
  field: FieldDefinition;
  value: string | number | boolean;
  error?: string;
  onChange: (value: string | number | boolean) => void;
}

function FieldRenderer({ field, value, error, onChange }: FieldRendererProps) {
  const labelEl = (
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {field.label}
      {field.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const inputClass = `
    w-full px-3 py-2 text-sm border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500
    disabled:bg-gray-50 placeholder:text-gray-300
    ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'}
  `;

  const errorEl = error ? (
    <p className="mt-1 text-xs text-red-600">{error}</p>
  ) : null;

  // Full-width fields
  const fullWidth = field.type === 'textarea';

  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      {labelEl}

      {field.type === 'select' ? (
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          required={field.required}
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>

      ) : field.type === 'boolean' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{field.placeholder ?? field.label}</span>
        </label>

      ) : field.type === 'textarea' ? (
        <textarea
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={3}
          className={inputClass}
        />

      ) : (
        <input
          type={mapInputType(field.type)}
          value={String(value)}
          onChange={(e) => onChange(
            field.type === 'number' || field.type === 'currency'
              ? e.target.valueAsNumber
              : e.target.value
          )}
          placeholder={field.placeholder}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
          pattern={field.validation?.pattern}
          className={inputClass}
        />
      )}

      {errorEl}
    </div>
  );
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function mapInputType(fieldType: string): string {
  const map: Record<string, string> = {
    text: 'text', email: 'email', password: 'password',
    date: 'date', number: 'number', currency: 'number',
  };
  return map[fieldType] ?? 'text';
}

function buildInitialData(entityDef?: EntityDefinition): FormData {
  if (!entityDef) return {};
  const data: FormData = {};
  for (const field of entityDef.fields) {
    if (field.defaultValue !== undefined) {
      data[field.name] = field.defaultValue as string | number | boolean;
    } else if (field.type === 'boolean') {
      data[field.name] = false;
    } else if (field.type === 'number' || field.type === 'currency') {
      data[field.name] = 0;
    } else {
      data[field.name] = '';
    }
  }
  return data;
}
