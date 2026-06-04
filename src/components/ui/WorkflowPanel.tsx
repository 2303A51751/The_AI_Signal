'use client';
// src/components/ui/WorkflowPanel.tsx
//
// Displays workflow execution logs and allows manual trigger of test actions.

import React, { useState, useEffect, useCallback } from 'react';
import { Zap, CheckCircle, XCircle, Clock, RefreshCw, SkipForward } from 'lucide-react';
import { AppConfig } from '@/types/config';

interface WorkflowLog {
  id: string;
  trigger: string;
  entity?: string;
  payload?: Record<string, unknown>;
  actions?: Array<{ type: string; label?: string; status: string; error?: string }>;
  status: string;
  createdAt: string;
}

interface WorkflowPanelProps {
  appId: string;
  userId: string;
  appConfig?: AppConfig;
  props?: { title?: string; showTrigger?: boolean };
}

export function WorkflowPanel({ appId, appConfig, props: panelProps }: WorkflowPanelProps) {
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const title = panelProps?.title ?? 'Workflow Logs';
  const workflows = appConfig?.workflows ?? [];

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workflow/logs?appId=${appId}`);
      const json = await res.json();
      if (res.ok) setLogs(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':  return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped': return <SkipForward className="h-4 w-4 text-gray-400" />;
      default:        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {workflows.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {workflows.length} rule{workflows.length !== 1 ? 's' : ''} active
            </span>
          )}
        </div>
        <button
          onClick={fetchLogs}
          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          title="Refresh logs"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Active Workflows Summary */}
      {workflows.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs font-medium text-amber-800 mb-2">Active Rules</p>
          <div className="space-y-1">
            {workflows.map((wf, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-amber-700">
                <Zap className="h-3 w-3 flex-shrink-0" />
                <span className="font-mono capitalize">{wf.event}</span>
                {wf.entity && <span className="text-amber-500">on {wf.entity}</span>}
                <span className="text-amber-400">→</span>
                <span>{wf.actions.map(a => a.label ?? a.type).join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="divide-y divide-gray-50 max-h-80 overflow-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mx-auto mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No workflow executions yet.
            <p className="text-xs mt-1">Logs appear here when triggers fire.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="p-3">
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full flex items-center gap-3 text-left"
              >
                {statusIcon(log.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 capitalize">
                      {log.trigger.replace('_', ' ')}
                    </span>
                    {log.entity && (
                      <span className="text-xs text-gray-400">· {log.entity}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-gray-400">{expanded === log.id ? '▲' : '▼'}</span>
              </button>

              {/* Expanded detail */}
              {expanded === log.id && (
                <div className="mt-3 ml-7 space-y-2">
                  {(log.actions ?? []).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {statusIcon(action.status)}
                      <div>
                        <span className="font-medium text-gray-700">
                          {action.label ?? action.type}
                        </span>
                        {action.error && (
                          <p className="text-red-500 mt-0.5">{action.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {log.payload && (
                    <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-24 text-gray-500">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
