---
name: Workflow execution adapters
description: External tools (n8n, Make, Zapier) are adapters behind one workflow surface, never embedded UIs.
type: design
---

Workflows are first-class entities in this app. Where they execute is metadata, not a separate page.

- `execution_kind` on `workflows` and `workflow_execution_bindings` is one of `native | n8n | make | zapier`.
- External execution is wired via signed webhooks only — no SDKs, no iframes, no embedded provider UIs.
- Outbound: `activateWorkflow` POSTs an HMAC-signed payload (built from `field_map`) to the binding's `trigger_url`.
- Inbound: a single endpoint `/api/public/hooks/workflow-callback` receives status updates from any provider, verifies HMAC against the binding's `callback_secret`, and updates `workflow_step_runs` + `workflow_runs`.
- The user always sees the same `<WorkflowRunTracker>`, the same step cards, the same approval gates. The execution chip in the header is the only place that surfaces "this runs in n8n."
- Adding a new provider = one new value in the kind enum + a setup helper. Never a new sidebar entry.
