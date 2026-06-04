// src/lib/runtime/workflow-engine.ts
//
// Workflow Engine: Evaluates triggers and executes actions.
// All action handlers are async and isolated - a failing action
// does not prevent other actions from running.
//
// In production, replace mock handlers with real integrations.

import { WorkflowTrigger, WorkflowAction, TriggerEvent } from '@/types/config';
import { ValidatedAppConfig } from '@/lib/validators/config.validator';
import prisma from '@/lib/db/prisma';

export interface WorkflowExecutionContext {
  userId: string;
  appId: string;
  trigger: TriggerEvent;
  entity?: string;
  payload?: Record<string, unknown>;
}

export interface WorkflowResult {
  triggered: number;
  actionsRun: ActionResult[];
}

export interface ActionResult {
  type: string;
  label?: string;
  status: 'success' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
}

// ─────────────────────────────────────────────
// CONDITION EVALUATOR
// ─────────────────────────────────────────────

function evaluateCondition(
  payload: Record<string, unknown>,
  field: string,
  operator: string,
  value: unknown
): boolean {
  const fieldValue = payload[field];

  switch (operator) {
    case 'eq':    return fieldValue === value;
    case 'neq':   return fieldValue !== value;
    case 'gt':    return Number(fieldValue) > Number(value);
    case 'lt':    return Number(fieldValue) < Number(value);
    case 'contains':
      return typeof fieldValue === 'string' &&
             typeof value === 'string' &&
             fieldValue.toLowerCase().includes(value.toLowerCase());
    default:      return true;
  }
}

function shouldTrigger(
  workflow: WorkflowTrigger,
  ctx: WorkflowExecutionContext
): boolean {
  // Event must match
  if (workflow.event !== ctx.trigger) return false;

  // Entity filter (if specified)
  if (workflow.entity && workflow.entity !== ctx.entity) return false;

  // All conditions must pass
  if (workflow.conditions?.length && ctx.payload) {
    return workflow.conditions.every((cond) =>
      evaluateCondition(ctx.payload!, cond.field, cond.operator, cond.value)
    );
  }

  return true;
}

// ─────────────────────────────────────────────
// ACTION HANDLERS
// Each handler is isolated. Errors are caught per-action.
// ─────────────────────────────────────────────

const actionHandlers: Record<
  string,
  (action: WorkflowAction, ctx: WorkflowExecutionContext) => Promise<unknown>
> = {
  log: async (action, ctx) => {
    // In production: write to a structured logger (Datadog, Axiom, etc.)
    const logEntry = {
      timestamp: new Date().toISOString(),
      trigger: ctx.trigger,
      entity: ctx.entity,
      payload: ctx.payload,
      label: action.label ?? 'Workflow triggered',
    };
    console.log('[WORKFLOW_LOG]', JSON.stringify(logEntry));
    return logEntry;
  },

  notification: async (action, ctx) => {
    // Mock: In production, push to WebSocket, Slack, or push notification service
    const message = `[${ctx.trigger.toUpperCase()}] ${action.label ?? 'Action executed'} on ${ctx.entity ?? 'app'}`;
    console.log('[WORKFLOW_NOTIFICATION]', message);
    return { message, delivered: true };
  },

  webhook: async (action, ctx) => {
    const url = action.config?.url as string;
    if (!url) return { skipped: true, reason: 'No webhook URL configured' };

    // In production: use a queue (BullMQ) to avoid blocking the request
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: ctx.trigger,
          entity: ctx.entity,
          payload: ctx.payload,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });
      return { status: response.status, ok: response.ok };
    } catch (err: any) {
      throw new Error(`Webhook failed: ${err.message}`);
    }
  },

  email: async (action, ctx) => {
    // Mock: In production, use Resend, SendGrid, etc.
    console.log('[WORKFLOW_EMAIL] Would send email:', {
      to: action.config?.to,
      subject: action.config?.subject ?? `${ctx.trigger} notification`,
      body: ctx.payload,
    });
    return { mock: true, delivered: false };
  },
};

// ─────────────────────────────────────────────
// MAIN EXECUTOR
// ─────────────────────────────────────────────

export async function executeWorkflows(
  config: ValidatedAppConfig,
  ctx: WorkflowExecutionContext
): Promise<WorkflowResult> {
  const allWorkflows = [
    ...(config.workflows ?? []),
    // Also check component-level triggers
  ];

  const actionsRun: ActionResult[] = [];
  let triggered = 0;

  for (const workflow of allWorkflows) {
    if (!shouldTrigger(workflow as WorkflowTrigger, ctx)) continue;
    triggered++;

    for (const action of workflow.actions) {
      const handler = actionHandlers[action.type];
      if (!handler) {
        actionsRun.push({
          type: action.type,
          label: action.label,
          status: 'skipped',
          error: `No handler registered for action type: ${action.type}`,
        });
        continue;
      }

      try {
        const output = await handler(action, ctx);
        actionsRun.push({ type: action.type, label: action.label, status: 'success', output });
      } catch (err: any) {
        // Isolated failure: log but don't crash the workflow
        actionsRun.push({
          type: action.type,
          label: action.label,
          status: 'failed',
          error: err.message,
        });
      }
    }
  }

  // Persist execution log (non-blocking)
  prisma.workflowLog
    .create({
      data: {
        userId: ctx.userId,
        appId: ctx.appId,
        trigger: ctx.trigger,
        entity: ctx.entity,
        payload: (ctx.payload ?? {}) as any,
        actions: actionsRun as any,
        status: actionsRun.some((a) => a.status === 'failed') ? 'failed' : 'success',
      },
    })
    .catch((err) => console.error('[WORKFLOW_LOG_PERSIST_ERROR]', err));

  return { triggered, actionsRun };
}
