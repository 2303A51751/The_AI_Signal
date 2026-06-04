# MetaRuntime — JSON-driven Application Platform

A production-grade, metadata-driven runtime that converts dynamic JSON configurations into fully working frontend UIs, REST APIs, and database structures. Inspired by low-code platforms like Base44.

---
****Live Demo:  https://the-ai-signal-sax9.vercel.app/dashboard
****## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        JSON CONFIG                              │
│   { entities, layout, workflows, theme }                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Config Repair  │  ← Zod validators + .catch()
                    │    Engine       │    Never throws. Always repairs.
                    └────────┬────────┘
           ┌─────────────────┼──────────────────┐
           │                 │                  │
  ┌────────▼───────┐ ┌───────▼──────┐ ┌────────▼────────┐
  │  Layout Engine │ │  Dynamic API │ │  Workflow Engine │
  │  (recursive)   │ │  /generated/ │ │  (rule-based)   │
  └────────┬───────┘ └───────┬──────┘ └────────┬────────┘
           │                 │                  │
  ┌────────▼───────┐ ┌───────▼──────┐ ┌────────▼────────┐
  │   Component    │ │   Prisma +   │ │  Action Handlers│
  │   Registry     │ │   PostgreSQL │ │  log/webhook/   │
  │  + Error Bndry │ │   (JSONB)    │ │  notification   │
  └────────────────┘ └──────────────┘ └─────────────────┘
```

---

## Project Structure

```
metaruntime/
├── prisma/
│   ├── schema.prisma          # DB schema: User, AppConfiguration, DynamicData, WorkflowLog
│   └── seed.ts                # Seeds demo user + Sales CRM example app
│
├── src/
│   ├── types/
│   │   └── config.ts          # All TypeScript interfaces for the config system
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   └── prisma.ts      # Prisma client singleton (dev hot-reload safe)
│   │   ├── validators/
│   │   │   └── config.validator.ts  # Zod schemas (RESILIENCE CORE)
│   │   ├── runtime/
│   │   │   ├── config-repair.ts     # Config validation + auto-repair engine
│   │   │   ├── workflow-engine.ts   # Trigger evaluation + action dispatch
│   │   │   └── example-config.ts   # Full Sales CRM example config
│   │   └── api-helpers.ts           # Response formatting + error handling
│   │
│   ├── components/
│   │   ├── boundaries/
│   │   │   └── ComponentErrorBoundary.tsx  # React Error Boundary for component isolation
│   │   ├── registry/
│   │   │   └── ComponentRegistry.tsx       # type string → React component mapping
│   │   ├── engine/
│   │   │   └── LayoutEngine.tsx            # Recursive config → React tree renderer
│   │   └── ui/
│   │       ├── DataTable.tsx         # Paginated, sortable, entity-driven table
│   │       ├── DynamicForm.tsx       # Field-type-aware form renderer
│   │       ├── MetricCard.tsx        # Aggregated metric display
│   │       ├── CSVImportPanel.tsx    # Drag-drop CSV upload + row-level reporting
│   │       └── WorkflowPanel.tsx     # Workflow log viewer
│   │
│   └── app/
│       ├── page.tsx                  # Redirects → /dashboard
│       ├── layout.tsx                # Root Next.js layout
│       ├── globals.css
│       ├── dashboard/
│       │   ├── page.tsx              # App list + JSON config editor
│       │   └── [appId]/
│       │       └── page.tsx          # Runtime app renderer
│       └── api/
│           ├── config/
│           │   ├── route.ts          # GET list, POST create/update app config
│           │   └── [id]/route.ts     # GET single, DELETE app config
│           ├── generated/
│           │   └── [appId]/
│           │       └── [entity]/
│           │           └── route.ts  # Dynamic CRUD: GET/POST/PATCH/DELETE
│           ├── csv-import/
│           │   └── route.ts          # Multipart CSV upload + bulk insert
│           ├── export/
│           │   └── route.ts          # JSON/GitHub Gist export
│           └── workflow/
│               └── logs/
│                   └── route.ts      # Workflow execution log reader
```

---

## Key Architectural Decisions

### 1. Resilience-First Zod Validation
Every field in the Zod schema uses `.catch(default)` so the system **never throws on bad input**. Instead:
- Invalid field types fall back to `"text"`
- Invalid component types fall back to `"Text"`  
- Missing numbers default to `0`
- The original raw config is preserved separately for auditing/export

### 2. JSONB Entity Storage (One Table, Infinite Apps)
Rather than running DB migrations per app, all dynamic records are stored in a single `dynamic_data` table with a `data JSONB` column. Constraints that would normally be at the DB level are enforced at the API layer via Zod. This enables instant app creation with zero schema downtime.

**Tradeoff**: No DB-level column constraints or foreign keys within entity data. Complex queries (joins, aggregations) are pushed to the application layer. For production scale, add Prisma `findMany` + client-side aggregation → background job → materialized cache pattern.

### 3. Isolated Component Error Boundaries
Every component rendered by the LayoutEngine is wrapped in a `ComponentErrorBoundary`. A broken component renders a contained amber tile; the rest of the app continues functioning. This is the frontend equivalent of the Zod `.catch()` strategy.

### 4. Workflow Engine Isolation
Each action handler is individually try-caught. A failing webhook doesn't prevent a notification from firing. Logs are persisted non-blocking (fire-and-forget `prisma.create().catch()`), so workflow failures never block API responses.

### 5. Config Repair + Export Round-trip
When a config is saved, the raw blob is stored alongside the repaired version. The export endpoint always returns the **repaired** config (guaranteed valid) with a repair report. This means exported configs are always clean and re-importable.

---

## CSV Import Format

The CSV header row must match the entity's field `name` values exactly. Example for `employees`:

```csv
name,email,department,salary,active
Alice Chen,alice@example.com,engineering,120000,true
Bob Kumar,bob@example.com,sales,85000,true
```

Invalid rows are skipped with per-field error reporting. Valid rows always commit.
