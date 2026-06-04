'use client';
// src/components/ui/RecordModal.tsx
//
// Modal dialog for creating and editing entity records.
// Reuses the same field-renderer logic as DynamicForm
// but operates in a controlled overlay pattern.

import React, { useState, useEffect, useCallback } from 'react';
import { EntityDefinition, FieldDefinition } from '@/types/config';
import { X, Loader2, CheckCircle } from 'lucide-react';

interface RecordModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  entityDef: EntityDefinition;
  initialData?: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; details?: any }>;
}

type FormData = Record<string, string | number | boolean>;

export function RecordModal({
  isOpen, mode, entityDef, initialData, onClose, onSubmit
}: RecordModalProps) {
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialise form when modal opens or mode changes
  useEffect(() => {
    if (!isOpen) return;
    const init: FormData = {};
    for (const field of entityDef.fields) {
      const val = initialData?.[field.name];
      if (val !== undefined && val !== null) {
        init[field.name] = val as string | number | boolean;
      } else if (field.defaultValue !== undefined) {
        init[field.name] = field.defaultValue as string | number | boolean;
      } else if (field.type === 'boolean') {
        init[field.name] = false;
      } else if (field.type === 'number' || field.type === 'currency') {
        init[field.name] = 0;
      } else {
        init[field.name] = '';
      }
    }
    setFormData(init);
    setErrors({});
    setSuccess(false);
  }, [isOpen, mode, entityDef, initialData]);

  const handleChange = (name: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    const result = await onSubmit(formData);
    setSubmitting(false);

    if (!result.ok) {
      if (result.details && typeof result.details === 'object') {
        setErrors(result.details as Record<string, string>);
      } else {
        setErrors({ _form: result.error ?? 'Failed to save record' });
      }
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onClose();
      setSuccess(false);
    }, 800);
  };

  // Close on backdrop click or Escape
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = mode === 'create'
    ? `Add ${entityDef.labelSingular ?? entityDef.label}`
    : `Edit ${entityDef.labelSingular ?? entityDef.label}`;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Panel */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden" noValidate>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entityDef.fields.map(field => (
                <ModalField
                  key={field.name}
                  field={field}
                  value={formData[field.name] ?? ''}
                  error={errors[field.name]}
                  onChange={val => handleChange(field.name, val)}
                />
              ))}
            </div>

            {errors._form && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {errors._form}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || success}
              className="
                flex items-center gap-2 px-4 py-2 text-sm font-medium
                bg-blue-600 text-white rounded-lg hover:bg-blue-700
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            >
              {success ? (
                <><CheckCircle className="h-4 w-4" /> Saved!</>
              ) : submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                mode === 'create' ? 'Create Record' : 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// FIELD COMPONENT (shared with DynamicForm)
// ─────────────────────────────────────────────
interface ModalFieldProps {
  field: FieldDefinition;
  value: string | number | boolean;
  error?: string;
  onChange: (value: string | number | boolean) => void;
}

function ModalField({ field, value, error, onChange }: ModalFieldProps) {
  const isFullWidth = field.type === 'textarea';
  const inputCls = `
    w-full px-3 py-2 text-sm border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-blue-500
    placeholder:text-gray-300
    ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}
  `;

  return (
    <div className={isFullWidth ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {field.type === 'select' ? (
        <select value={String(value)} onChange={e => onChange(e.target.value)} className={inputCls}>
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
          ))}
        </select>

      ) : field.type === 'boolean' ? (
        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={e => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{field.placeholder ?? field.label}</span>
        </label>

      ) : field.type === 'textarea' ? (
        <textarea
          value={String(value)}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={3}
          className={inputCls}
        />

      ) : (
        <input
          type={mapType(field.type)}
          value={String(value)}
          onChange={e => onChange(
            field.type === 'number' || field.type === 'currency'
              ? (isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)
              : e.target.value
          )}
          placeholder={field.placeholder}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
          className={inputCls}
        />
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function mapType(t: string): string {
  const m: Record<string, string> = {
    text: 'text', email: 'email', password: 'password',
    date: 'date', number: 'number', currency: 'number',
  };
  return m[t] ?? 'text';
}
