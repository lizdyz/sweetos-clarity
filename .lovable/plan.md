

# Wave 16 — Workflow execution adapters: native, n8n, and make.com under one roof

You're asking the right architectural question early. The answer is: **you don't embed n8n or Make. You wrap them.** Workflows in this system are already a first-class entity (`workflows` + `workflow_steps` + `workflow_runs`). External tools become *execution adapters* behind that same surface — the user never sees "this is n8n" unless they want to.

## The model

A `workflow` has an `execution_kind`:

| kind | What runs the steps | Where it lives |
|---|---|---|
| `native` | Your own `workflow_step_runs` engine (today's default) | In-app |
| `n8n` | An n8n workflow, triggered via webhook | External n8n instance |
| `make` | A Make.com scenario, triggered via webhook | External Make scenario |
| `zapier` | A Zap, triggered via webhook | External Zapier |

All four feel identical to the user: same `<WorkflowRunTracker>`, same step cards, same approval gates, same Sparks on regression. The difference is *who executes* — and that's a config detail on the workflow, not a different page.

## Part 1 — `workflow_execution_bindings` (the port layer)

One new table — the "port" you mentioned:

```sql
create table public.workflow_execution_bindings (
  workflow_id uuid primary key references workflows(id) on delete cascade,
  execution_kind text not null default 'native',  -- native | n8n | make | zapier
  trigger_url text,                                -- webhook URL we POST to start a run
  callback_secret text,                            -- HMAC secret they POST back with
  external_id text,                                -- n8n workflow id / Make scenario id (display only)
  field_map jsonb default '{}',                    -- map our fields → their input shape
  status_map jsonb default '{}',                   -- map their states → ours (planned/running/done/failed)
  last_synced_at timestamptz,
  notes text
);
```

Plus a tiny extension to existing tables:
- `workflows.execution_kind text default 'native'` (denormalized for fast filtering)
- `workflow_runs.external_run_id text` (so callbacks can find the run)
- `workflow_step_runs.external_step_id text` (so per-step callbacks land correctly)

## Part 2 — Outbound: starting an external run

When a user clicks "Run workflow" and `execution_kind != 'native'`:

1. `activateWorkflow` server function (already exists in `src/utils/workflows.functions.ts`) checks the binding
2. Builds a payload from `field_map` (relationship name, project context, etc.)
3. POSTs to `trigger_url` with HMAC-signed body
4. Stores returned `external_run_id` on `workflow_runs`
5. Marks run as `running`, polls UI shows "Executing in n8n…" with the external link visible

No SDK. No embed. Just signed webhooks — works with n8n, Make, Zapier, anything that accepts HTTP.

## Part 3 — Inbound: callbacks update the run

New public route — one endpoint, all providers:

`src/routes/api/public/hooks/workflow-callback.ts`

Accepts POSTs with HMAC signature. Body shape:
```json
{
  "external_run_id": "...",
  "step": "Send intro email",
  "status": "succeeded",
  "output": { "any": "json" }
}
```

Looks up the binding, verifies signature, updates `workflow_step_runs`, fires Sparks if a step fails. The same endpoint serves all three providers — the binding tells us which secret to verify against.

## Part 4 — UI: one workflow detail page, three execution badges

On `src/routes/_app.workflows.$id.tsx`:

- Header gets an **Execution chip**: `Native · runs in-app` / `n8n · {external_id} ↗` / `Make · {scenario_name} ↗`
- New tab "Execution" on the workflow detail — edits the binding (URL, secret, field map, status map)
- Step cards show external state alongside ours: "succeeded in n8n at 14:02"
- `<WorkflowRunTracker>` is unchanged — it just renders whatever `workflow_step_runs` says

The user experience: they author intent here, they see results here, they audit here. Where it ran is metadata.

## Part 5 — Authoring helpers

For each external kind, a one-time setup helper on the Execution tab:

- **n8n**: "Paste your n8n webhook URL. We'll generate a callback URL + secret to drop into your final n8n node." Copy buttons for both.
- **Make**: Same flow — paste scenario webhook, copy callback URL into a Make HTTP module at the end.
- **Zapier**: Same — paste webhook, copy callback into a final Webhooks-by-Zapier step.

A "Test connection" button POSTs a ping payload and waits for the callback. Green check or red error inline. No leaving the app.

## Part 6 — Field map editor (the only mildly hard UI)

Small JSON-driven form that lets the user say "when this workflow fires, send these fields":

```text
Our field            →  Their input key
─────────────────────────────────────
relationship.name    →  customer_name
relationship.email   →  to
project.name         →  project
trigger.notes        →  context
```

Stored as `field_map` JSON. Rendered in a chip-pair editor (no raw JSON shown to user). Defaults are sensible per provider.

## Files

**Migration:**
- `workflow_execution_bindings` table
- `workflows.execution_kind`, `workflow_runs.external_run_id`, `workflow_step_runs.external_step_id` columns
- Backfill: every existing workflow gets `execution_kind='native'`

**New server route:**
- `src/routes/api/public/hooks/workflow-callback.ts` — HMAC-verified callback receiver

**New components:**
- `src/components/workflow-execution-chip.tsx` — header badge + popover with external link
- `src/components/workflow-execution-tab.tsx` — binding editor (URL, secret reveal, field map, status map, test button)
- `src/components/workflow-field-map-editor.tsx` — chip-pair mapping UI

**Edited:**
- `src/utils/workflows.functions.ts` — `activateWorkflow` branches on `execution_kind`; new `triggerExternalWorkflow` helper
- `src/routes/_app.workflows.$id.tsx` — mount execution chip + new tab
- `src/components/workflow-run-tracker.tsx` — show external state next to native state
- `src/routes/_app.settings.canon.tsx` — add note about execution kinds in workflow canon

**Memory:**
- `mem://design/workflow-execution-adapters.md` — the rule: external tools are adapters behind one workflow surface, never embedded UIs

## Sequencing

1. Migration + binding table + execution_kind columns (~15%)
2. Outbound trigger: HMAC-signed POST from `activateWorkflow` (~20%)
3. Inbound callback route + signature verification + step-state updates (~20%)
4. Execution tab UI: URL/secret/test button (~15%)
5. Field map editor + status map editor (~15%)
6. Execution chip on header + external state on step cards (~15%)

## Not in this wave

- No embedded n8n/Make iframes — explicitly rejected
- No outbound SDK installs (n8n-client, etc.) — webhooks only, keeps Worker bundle clean
- No automatic conversion of existing native workflows to external (manual opt-in per workflow)
- No new sidebar entry — execution is a workflow property, not a destination

## After Wave 16

- Any workflow can be marked `native`, `n8n`, `make`, or `zapier` — the rest of the app doesn't care
- Users paste a webhook URL once, copy a callback URL once, and the external tool is "in" the system
- Run history, step status, approvals, Sparks, and audit trail all flow through your existing surfaces regardless of where execution happens
- Adding a new provider later (Inngest, Temporal, custom) = one new entry in the `execution_kind` enum + a setup helper, nothing else

Reply **"Run Wave 16"** to ship in this order, or **"Just n8n adapter first"** to land one provider end-to-end before generalizing.

