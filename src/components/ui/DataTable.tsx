'use client';
// src/components/ui/DataTable.tsx
//
// Fully wired DataTable: pagination, sort, search, create, edit, delete.
// Uses useEntityData hook for all data operations.
// RecordModal handles create/edit in an accessible overlay.

import React, { useState } from 'react';
import { EntityDefinition } from '@/types/config';
import { useEntityData } from '@/hooks/useEntityData';
import { RecordModal } from '@/components/ui/RecordModal';
import {
  Plus, Trash2, Edit2, Search,
  ChevronUp, ChevronDown, ChevronsUpDown,
  RefreshCw, AlertCircle,
} from 'lucide-react';

interface DataTableProps {
  appId: string;
  userId: string;
  entity?: string;
  entityDef?: EntityDefinition;
  props?: {
    title?: string;
    pageSize?: number;
    allowCreate?: boolean;
    allowEdit?: boolean;
    allowDelete?: boolean;
  };
}

type SortState = { field: string; order: 'asc' | 'desc' } | null;
type ModalState =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; record: Record<string, unknown> };

export function DataTable({ appId, entity, entityDef, props: tableProps }: DataTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [modal, setModal] = useState<ModalState>({ mode: 'closed' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const pageSize = tableProps?.pageSize ?? 10;
  const title = tableProps?.title ?? entityDef?.label ?? entity ?? 'Data';
  const allowCreate = tableProps?.allowCreate !== false;
  const allowEdit   = tableProps?.allowEdit   !== false;
  const allowDelete = tableProps?.allowDelete !== false;

  const {
    records, total, loading, error,
    refetch, createRecord, updateRecord, deleteRecord,
  } = useEntityData(appId, entity, {
    page, pageSize, search,
    sortField: sort?.field,
    sortOrder: sort?.order,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fields = entityDef?.fields ?? [];

  // ── HANDLERS ─────────────────────────────────

  const handleSort = (field: string) => {
    setSort(prev => {
      if (prev?.field === field) return prev.order === 'asc' ? { field, order: 'desc' } : null;
      return { field, order: 'asc' };
    });
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCreate = async (data: Record<string, unknown>) => {
    const result = await createRecord(data);
    return { ok: result.ok, error: result.error, details: (result as any).details };
  };

  const handleEdit = async (data: Record<string, unknown>) => {
    if (modal.mode !== 'edit') return { ok: false };
    const result = await updateRecord(modal.record.id as string, data);
    return result;
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    await deleteRecord(id);
  };

  // ── RENDER ───────────────────────────────────
  return (
    <>
      <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* ── TOOLBAR ── */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            {title}
            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full tabular-nums">
              {total}
            </span>
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>

            <button
              onClick={refetch}
              title="Refresh"
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {allowCreate && entityDef && (
              <button
                onClick={() => setModal({ mode: 'create' })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                  bg-blue-600 text-white rounded-lg hover:bg-blue-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            )}
          </div>
        </div>

        {/* ── TABLE BODY ── */}
        <div className="overflow-x-auto flex-1">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={refetch} className="text-xs text-blue-600 underline">Retry</button>
            </div>
          ) : loading ? (
            <div className="p-6 space-y-2">
              {[...Array(pageSize > 5 ? 5 : pageSize)].map((_, i) => (
                <div key={i} className="h-9 bg-gray-100 rounded animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm space-y-1">
              <p className="text-base">No records found</p>
              {search && <p className="text-xs">Try clearing the search filter</p>}
              {!search && allowCreate && <p className="text-xs">Click "Add" to create the first one</p>}
            </div>
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {fields.map(field => (
                    <th
                      key={field.name}
                      onClick={() => handleSort(field.name)}
                      className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase
                        tracking-wide cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        {field.label}
                        {sort?.field === field.name
                          ? sort.order === 'asc'
                            ? <ChevronUp className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            : <ChevronDown className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          : <ChevronsUpDown className="h-3 w-3 text-gray-300 flex-shrink-0" />
                        }
                      </div>
                    </th>
                  ))}
                  {(allowEdit || allowDelete) && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-24">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {records.map(record => (
                  <tr
                    key={record.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    {fields.map(field => (
                      <td
                        key={field.name}
                        className="px-4 py-3 text-gray-700 max-w-[220px] truncate"
                        title={String(record[field.name] ?? '')}
                      >
                        {formatCellValue(record[field.name], field.type)}
                      </td>
                    ))}

                    {(allowEdit || allowDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {allowEdit && entityDef && (
                            <button
                              onClick={() => setModal({ mode: 'edit', record })}
                              title="Edit"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {allowDelete && (
                            <button
                              onClick={() => setDeleteConfirm(record.id as string)}
                              title="Delete"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>
              Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <PaginationButton onClick={() => setPage(1)} disabled={page === 1} label="««" />
              <PaginationButton onClick={() => setPage(p => p - 1)} disabled={page === 1} label="‹ Prev" />
              <span className="px-2 py-1 font-medium text-gray-700">
                {page} / {totalPages}
              </span>
              <PaginationButton onClick={() => setPage(p => p + 1)} disabled={page === totalPages} label="Next ›" />
              <PaginationButton onClick={() => setPage(totalPages)} disabled={page === totalPages} label="»»" />
            </div>
          </div>
        )}
      </div>

      {/* ── DELETE CONFIRMATION ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete record?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {entityDef && modal.mode !== 'closed' && (
        <RecordModal
          isOpen
          mode={modal.mode}
          entityDef={entityDef}
          initialData={modal.mode === 'edit' ? modal.record : undefined}
          onClose={() => setModal({ mode: 'closed' })}
          onSubmit={modal.mode === 'create' ? handleCreate : handleEdit}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function PaginationButton({
  onClick, disabled, label,
}: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-mono"
    >
      {label}
    </button>
  );
}

function formatCellValue(value: unknown, type: string): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-300 italic">—</span>;
  }
  switch (type) {
    case 'boolean':
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
          ${value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
        .format(Number(value));
    case 'date':
      try { return new Date(String(value)).toLocaleDateString(); }
      catch { return String(value); }
    case 'email':
      return (
        <a href={`mailto:${value}`} className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
          {String(value)}
        </a>
      );
    default:
      return String(value);
  }
}
