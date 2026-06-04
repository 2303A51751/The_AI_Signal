# MetaRuntime — JSON-driven Application Platform

A production-grade, metadata-driven runtime that converts dynamic JSON configurations into fully working frontend UIs, REST APIs, and database structures. Inspired by low-code platforms like Base44.

---

## Architecture Overview

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

## Setup & Deployment

### Prerequisites
- Node.js 20+
- PostgreSQL database (Neon, Railway, or Supabase recommended)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local and set DATABASE_URL

# 3. Push schema to database
npm run db:push

# 4. Seed demo data
npm run db:seed

# 5. Start development server
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### Vercel Deployment

```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard:
# DATABASE_URL = your Neon/Railway PostgreSQL URL
```

### Railway Deployment

```bash
# Connect your repo to Railway
# Railway auto-detects Next.js and runs npm run build
# Add DATABASE_URL in Railway environment variables
```

---

## Integrating Real Authentication

Replace the mock `getUserId()` in `src/lib/api-helpers.ts` with your auth provider:

```typescript
// NextAuth example
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getUserId(req: Request): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}
```

---

## Adding New Component Types

1. Create your component in `src/components/ui/YourComponent.tsx`
2. Register it in `src/components/registry/ComponentRegistry.tsx`:
   ```typescript
   YourComponent: { component: YourComponent, displayName: 'Your Component' }
   ```
3. Add the type to the `ComponentType` union in `src/types/config.ts`
4. Add it to the `ComponentTypeSchema` enum in `src/lib/validators/config.validator.ts`

The LayoutEngine will automatically route to it. Unknown types still fail gracefully.

---

## Adding New Workflow Actions

In `src/lib/runtime/workflow-engine.ts`, add to `actionHandlers`:

```typescript
myAction: async (action, ctx) => {
  // Your integration (Slack, email, CRM webhook, etc.)
  return { delivered: true };
},
```

Then add `'myAction'` to the `ActionTypeSchema` enum in `config.validator.ts`.

---

## CSV Import Format

The CSV header row must match the entity's field `name` values exactly. Example for `employees`:

```csv
name,email,department,salary,active
Alice Chen,alice@example.com,engineering,120000,true
Bob Kumar,bob@example.com,sales,85000,true
```

Invalid rows are skipped with per-field error reporting. Valid rows always commit.
