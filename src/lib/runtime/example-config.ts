// src/lib/runtime/example-config.ts
//
// A complete example AppConfig demonstrating all features:
// - Multiple entities (employees, deals)
// - All layout types (SidebarLayout, TabLayout, Grid)
// - Metrics, DataTable, Form, CSVImport, WorkflowPanel
// - A workflow trigger with log + notification actions
// - Intentionally has one broken field (unknownComponentType) to demo graceful fallback

import { AppConfig } from '@/types/config';

export const EXAMPLE_CONFIG: AppConfig = {
  name: "Sales CRM",
  slug: "sales-crm",
  description: "A metadata-driven CRM application",
  version: 1,
  theme: {
    primaryColor: "#3b82f6",
    mode: "light"
  },

  entities: [
    {
      name: "employees",
      label: "Employees",
      labelSingular: "Employee",
      fields: [
        { name: "name",       label: "Full Name",    type: "text",     required: true },
        { name: "email",      label: "Email",        type: "email",    required: true },
        { name: "department", label: "Department",   type: "select",   required: true,
          options: [
            { label: "Sales",       value: "sales" },
            { label: "Engineering", value: "engineering" },
            { label: "Marketing",   value: "marketing" }
          ]
        },
        { name: "salary",     label: "Salary",       type: "currency", defaultValue: 0 },
        { name: "active",     label: "Active",       type: "boolean",  defaultValue: true },
        { name: "startDate",  label: "Start Date",   type: "date" }
      ]
    },
    {
      name: "deals",
      label: "Deals",
      labelSingular: "Deal",
      fields: [
        { name: "title",      label: "Deal Title",   type: "text",     required: true },
        { name: "company",    label: "Company",      type: "text",     required: true },
        { name: "value",      label: "Deal Value",   type: "currency", defaultValue: 0 },
        { name: "stage",      label: "Stage",        type: "select",
          options: [
            { label: "Prospecting", value: "prospecting" },
            { label: "Proposal",    value: "proposal" },
            { label: "Negotiation", value: "negotiation" },
            { label: "Closed Won",  value: "closed_won" },
            { label: "Closed Lost", value: "closed_lost" }
          ]
        },
        { name: "notes",      label: "Notes",        type: "textarea" }
      ]
    }
  ],

  workflows: [
    {
      event: "form_submit",
      entity: "deals",
      actions: [
        { type: "log",          label: "Log deal submission" },
        { type: "notification", label: "Notify sales team" }
      ]
    },
    {
      event: "csv_import",
      actions: [
        { type: "log", label: "Log CSV import completion" }
      ]
    }
  ],

  layout: {
    id: "root",
    type: "SidebarLayout",
    props: { sidebarWidth: "w-56" },
    children: [
      // ── SIDEBAR ──
      {
        id: "sidebar-nav",
        type: "Layout",
        props: { variant: "stack", gap: "gap-2" },
        children: [
          { id: "app-title", type: "Heading", props: { text: "Sales CRM", level: 3 } },
          { id: "nav-divider", type: "Divider" },
          { id: "nav-label", type: "Text", props: { content: "Navigate your workspace from the tabs on the right." } }
        ]
      },

      // ── MAIN CONTENT ──
      {
        id: "main-tabs",
        type: "TabLayout",
        props: {
          tabLabels: ["Dashboard", "Employees", "Deals", "Import", "Workflows"]
        },
        children: [
          // Tab 0: Dashboard
          {
            id: "dashboard-tab",
            type: "Layout",
            props: { variant: "stack", gap: "gap-6" },
            children: [
              { id: "dash-heading", type: "Heading", props: { text: "Overview", level: 2 } },
              {
                id: "metrics-group",
                type: "MetricCardGroup",
                props: { cols: 4 },
                children: [
                  {
                    id: "metric-employees",
                    type: "MetricCard",
                    metric: { entity: "employees", field: "id", aggregation: "count", label: "Total Employees", icon: "count" }
                  },
                  {
                    id: "metric-salary",
                    type: "MetricCard",
                    metric: { entity: "employees", field: "salary", aggregation: "sum", label: "Total Payroll", icon: "dollar", prefix: "$" }
                  },
                  {
                    id: "metric-deals",
                    type: "MetricCard",
                    metric: { entity: "deals", field: "id", aggregation: "count", label: "Total Deals", icon: "chart" }
                  },
                  {
                    id: "metric-deal-value",
                    type: "MetricCard",
                    metric: { entity: "deals", field: "value", aggregation: "sum", label: "Pipeline Value", icon: "trending", prefix: "$" }
                  }
                ]
              },
              // Intentionally broken component to demo graceful fallback
              {
                id: "broken-widget",
                type: "SuperWidget3000" as any, // Unknown type
                props: { data: "this will gracefully fallback" }
              }
            ]
          },

          // Tab 1: Employees
          {
            id: "employees-tab",
            type: "Layout",
            props: { variant: "stack", gap: "gap-6" },
            children: [
              {
                id: "employees-table",
                type: "DataTable",
                entity: "employees",
                props: { title: "All Employees", allowCreate: true, allowDelete: true }
              },
              {
                id: "add-employee-form",
                type: "Form",
                entity: "employees",
                props: { title: "Add Employee", submitLabel: "Add Employee" }
              }
            ]
          },

          // Tab 2: Deals
          {
            id: "deals-tab",
            type: "Layout",
            props: { variant: "stack", gap: "gap-6" },
            children: [
              {
                id: "deals-table",
                type: "DataTable",
                entity: "deals",
                props: { title: "Deals Pipeline", allowCreate: true, allowDelete: true }
              },
              {
                id: "add-deal-form",
                type: "Form",
                entity: "deals",
                props: { title: "Add Deal", submitLabel: "Create Deal" },
                triggers: [
                  {
                    event: "form_submit",
                    entity: "deals",
                    actions: [{ type: "notification", label: "Deal created!" }]
                  }
                ]
              }
            ]
          },

          // Tab 3: CSV Import
          {
            id: "import-tab",
            type: "CSVImport",
            props: { title: "Bulk Import Records" }
          },

          // Tab 4: Workflows
          {
            id: "workflows-tab",
            type: "WorkflowPanel",
            props: { title: "Workflow Execution Log" }
          }
        ]
      }
    ]
  }
};
