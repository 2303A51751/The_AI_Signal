'use client';
// src/components/ui/CSVImportPanel.tsx
//
// Drag-and-drop CSV import panel. Uploads file to /api/csv-import,
// displays a per-row results report (imported vs skipped + errors).

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { EntityDefinition, AppConfig } from '@/types/config';

interface CSVImportPanelProps {
  appId: string;
  userId: string;
  entity?: string;
  entityDef?: EntityDefinition;
  appConfig?: AppConfig;
  props?: { title?: string };
}

interface ImportResult {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  results: Array<{
    row: number;
    status: 'imported' | 'skipped';
    errors?: Record<string, string>;
    data?: Record<string, unknown>;
  }>;
}

export function CSVImportPanel({ appId, entity, entityDef, appConfig, props: panelProps }: CSVImportPanelProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState(entity ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const entities = appConfig?.entities ?? [];
  const title = panelProps?.title ?? 'CSV Import';

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleImport = async () => {
    if (!file || !appId || !selectedEntity) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('appId', appId);
      formData.append('entity', selectedEntity);

      const res = await fetch('/api/csv-import', { method: 'POST', body: formData });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Import failed');
        return;
      }

      setResult(json.data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Upload a CSV file to bulk-import records. Invalid rows are skipped; valid rows always commit.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Entity selector (if not pre-specified) */}
        {!entity && entities.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Target Entity</label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select entity...</option>
              {entities.map((e) => (
                <option key={e.name} value={e.name}>{e.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Column guide */}
        {selectedEntity && appConfig && (
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <p className="text-xs font-medium text-gray-600 mb-1">Expected columns:</p>
            <p className="text-xs font-mono text-gray-500">
              {(appConfig.entities.find(e => e.name === selectedEntity)?.fields ?? [])
                .map(f => f.name)
                .join(', ')}
            </p>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center gap-3
            border-2 border-dashed rounded-xl p-8 cursor-pointer
            transition-colors
            ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload className={`h-8 w-8 ${dragging ? 'text-blue-500' : 'text-gray-300'}`} />
          {file ? (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{file.name}</span>
              <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-500">Drop a CSV file here, or <span className="text-blue-600 font-medium">browse</span></p>
              <p className="text-xs text-gray-400 mt-1">Maximum file size: 5MB</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={!file || !selectedEntity || loading}
          className="
            w-full flex items-center justify-center gap-2
            px-4 py-2 text-sm font-medium
            bg-blue-600 text-white rounded-lg hover:bg-blue-700
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500
          "
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
          ) : (
            <><Upload className="h-4 w-4" /> Import CSV</>
          )}
        </button>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Rows', value: result.totalRows, color: 'text-gray-900' },
                { label: 'Imported', value: result.importedCount, color: 'text-green-600' },
                { label: 'Skipped', value: result.skippedCount, color: 'text-amber-600' },
              ].map((stat) => (
                <div key={stat.label} className="text-center rounded-lg bg-gray-50 p-3">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Row-level report */}
            {result.skippedCount > 0 && (
              <div className="rounded-lg border border-amber-100 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-sm font-medium text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  Skipped rows
                </div>
                <div className="divide-y divide-gray-50 max-h-48 overflow-auto">
                  {result.results
                    .filter((r) => r.status === 'skipped')
                    .map((r) => (
                      <div key={r.row} className="flex items-start gap-3 px-3 py-2 text-xs">
                        <span className="text-gray-400 font-mono w-12 flex-shrink-0">Row {r.row}</span>
                        <div>
                          {Object.entries(r.errors ?? {}).map(([field, msg]) => (
                            <p key={field} className="text-red-600">
                              <span className="font-medium">{field}:</span> {msg}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {result.importedCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                {result.importedCount} records imported successfully.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
