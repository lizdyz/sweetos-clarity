

# Phase 2.10: Audit of unaddressed instructions + decoupling Domains/Tenets + Best-Practice Catalog with evolving Agents

You asked me to look back over everything you've told me and surface what I've missed. I went through the prior turns and the live schema. Here's the honest accounting, then a focused build plan.

## What I missed or got wrong

### 1. Domains and Tenets are still coupled in code
- The DB has them right: `domains` (22, universal), `industries`, `tenets` (industry-scoped), `domain_tenets` join. Independent taxonomies.
- But many tables still carry both `tagged_domains` AND `tagged_tenets` as parallel `text[]` arrays on the same record (`campaigns`, `decisions`, `delegation`, `documents`, `missions`, `outcomes`, `personas`, `playbooks`, `projects`, `proposals`, `quests`, `relationships`, `components`). The UI treats them as a single "tag" surface (see `tag-picker.tsx`, `chips.tsx`).
- Result: at the tagging UI they feel like one thing. They are not. **Domains = universal lens. Tenets = industry-specific best-practice anchors.** They should be tagged in separate UI sections, displayed in separate chip rows, and filtered independently.

### 2. There is no Best-Practice Catalog
- You said: *"have the catalog of best practices and then having agents be able to evolve the best practices."*
- Today's `tenets` table is just `(industry, name, description, sort_order)`. No best-practice statements, no maturity-tied guidance, no versioning, no evolution history, no "an agent improved this on date X" trail.
- The `excellence_rubric` (5L × 5P × subject) is the closest thing, but it's anchored to Domain/Tenet **subjects**, not to a Tenet's body of best practices. There is no `tenet_best_practices` table.

### 3. Agents were never built
- You approved Agents as Phase 2.9 ("standalone prompt + workflow-bound, attachable to Task/Project/Workflow"). I planned 2.8 first and never came back. No `agents`, `agent_attachments`, `agent_runs` tables exist. No edge function. No UI.
- The "agents evolve best practices" loop you just described requires Agents to exist first.

### 4. Notion MCP runtime sync was deferred and never picked back up
- You wanted the app to read Notion through MCP so you don't double-update. The `mcp-tanstack-start` doc is loaded but no `/api/mcp` route exists, no `notion_links` table, no sync function. Still owed.

### 5. Programmable agents attachable to a Task or Project
- Your exact words: *"have programmable agents in a sense — so I can tag in onto task or project a workflow or an agent."* Not built. `tasks` and `projects` have no `attached_agent_ids`, no run history surfaced on the detail page.

### 6. 8 Frameworks + 9 BizzyBots as queryable lenses
- I flagged this in the 2.7.1 plan and dropped it. `playbooks.bizzybot_signals` is a loose `text[]` and `quests.framework_lens` is free text. No `frameworks` table, no `bizzybots` table, no consistent lens tagging across `quests`/`sparks`/`components`.

### 7. Audit gaps still partially open after Phase 2.8
- Per-relationship Maturity Map panel on the relationship detail page: view exists, **panel was not added**.
- Funnel cards (Awareness / Temperature / Drift) and Proposal card on relationship detail: **not added**.
- Engagement Plans list filtered by relationship on the relationship detail page: **not added**.
- Sessions linkage to `engagement_plan_id`: column added, **no UI to set or display it**.

### 8. Capture → Queue → Confirm tag flow for the Domain/Tenet split
- Memory says: *"At capture, AI infers tags (domains/tenets/components). User confirms in Queue."* The Queue UI currently shows them merged. Needs separate "Suggested Domains" vs "Suggested Tenets" sections with independent confirm.

### 9. Light-first SweetBot premium feel
- Your design rules ("light-first, luminous, dimensional, calm") are partially honored. New routes I created (`engagement-plans`) lean on `EntityListPage` defaults — no Funnel-style premium card treatment. Acceptable for list views, but the Relationship detail panels above need to land with the premium card pattern, not a stock table.

---

## Phase 2.10 — what to build now

### Part A — Decouple Domains from Tenets in the UI (no schema change)
- `tag-picker.tsx`: split into two distinct pickers — **Domains picker** (always available, all 22) and **Tenets picker** (filtered by the record's `industry_id` if present, otherwise by the related relationship's industry).
- `chips.tsx`: render Domain chips and Tenet chips in two separate rows with distinct colors and labels ("Domains" / "Tenets").
- Entity detail pages: two sections — "Domains (universal lens)" and "Tenets (industry best practices)".
- Queue confirm step: separate "Confirm domains" and "Confirm tenets" blocks, each with its own accept-all toggle.

### Part B — Best-Practice Catalog (new schema)
New tables:
- `tenet_best_practices`: `id, tenet_id, statement (text), maturity_level (L1–L5), rationale, sort_order, current_version_id, created_at, updated_by`.
- `best_practice_versions`: `id, best_practice_id, version_number, statement, rationale, source (manual|agent_run|session), source_ref (uuid), changed_by (uuid), changed_at, summary_of_change`. Append-only history. `tenet_best_practices.current_version_id` points at the live version.
- `best_practice_evidence`: `id, best_practice_id, evidence_type (session|outcome|document|spark|external), evidence_ref, note, captured_at`. So when an Agent or a Session produces a refinement, the evidence trail is preserved.

UI:
- New route `/_app/tenets/$slug` already exists for tenet detail — extend it with a **Best Practices** panel: list current statements grouped by maturity level, with a "View history" drawer showing the version diffs.
- New route `/_app/best-practices` (catalog browser): filterable by industry → tenet → maturity.

### Part C — Agents (Phase 2.9 finally landing, scoped tight)
Schema:
- `agents`: `id, name, kind (prompt|workflow), system_prompt, model (default google/gemini-2.5-pro), input_schema (jsonb), tools (text[]), workflow_id (nullable, FK→workflows for kind=workflow), enabled, created_by, created_at, updated_at`.
- `agent_attachments`: `id, agent_id, attached_to_table (tasks|projects|workflows|relationships|engagement_plans), attached_to_id, created_by, created_at`. Polymorphic by table+id.
- `agent_runs`: `id, agent_id, attachment_id (nullable), input (jsonb), output (jsonb), status (queued|running|succeeded|failed), error, started_at, finished_at, run_by, proposal_id (nullable, FK→proposals)`. Outputs that suggest data writes feed the existing **Queue** as a `proposal` for human confirmation — preserves your trust layer.

Edge function:
- `agents-run`: takes `{agent_id, attachment_id?, input}`, calls Lovable AI Gateway with the agent's `system_prompt + model`, persists `agent_runs` row, and (for prompt agents producing structured suggestions) creates a `proposals` row.

UI:
- `/_app/agents/index` and `/_app/agents/$id` (CRUD with prompt editor, model picker, tool list).
- "Attach Agent" button on Task and Project detail pages → modal picker → writes `agent_attachments`.
- "Runs" tab on Agent detail showing recent `agent_runs` with input/output.
- "Run agent" action on attached entity → drops a job, shows result in Queue for confirm.

### Part D — Agents evolve Best Practices (the loop you asked for)
- Built-in agent template: **"Best-Practice Refiner"** (kind=prompt). Input: `tenet_id` + recent evidence (session outcomes, sparks, documents tagged with that tenet). Output: proposed edits to one or more `tenet_best_practices` statements with rationale.
- When run, the agent produces a `proposals` row of `entity_type='best_practice_revision'`. Approving it writes a new `best_practice_versions` row and updates `current_version_id`. Audit trail preserved end-to-end.
- "Refine with agent" button on the tenet detail Best Practices panel.

### Part E — Finish Phase 2.8 leftover UI
- Relationship detail page (`_app.relationships.$id.tsx`):
  - **Funnel card**: awareness_tier · temperature · drift_risk (all editable).
  - **Proposal card**: linked document, sent/expires dates, version.
  - **Maturity Map panel**: reads `relationship_domain_maturity` view, renders 22-domain grid colored by L1–L5.
  - **Engagement Plans list**: filtered by `relationship_id`, with quick "New plan" CTA.
- Sessions detail: add `engagement_plan_id` selector and display.

### Part F — Notion MCP runtime sync (lightweight cut)
- Install `mcp-tanstack-start`, `@modelcontextprotocol/sdk`, `zod`.
- Create `/api/mcp` route exposing read-only tools: `search_relationships`, `get_relationship`, `get_engagement_plans`, `get_best_practices_for_tenet`. Auth via a single `MCP_SECRET` you'll set.
- `notion_links` table (`id, internal_table, internal_id, notion_page_id, last_synced_at`) so we don't double-write.
- One-way **push** edge function `notion-push` that mirrors a single relationship to a Notion page on save (behind a per-relationship "Sync to Notion" toggle). Two-way pull deferred.

### What I am NOT doing in 2.10
- 8 Frameworks / 9 BizzyBots as first-class lens tables. Flagged again, deferred to 2.11.
- Two-way Notion pull (conflict resolution is its own design).
- Workflow agent runner that walks workflow steps end-to-end (kind=workflow agents will exist as records but the executor is a 2.11 follow-up; prompt agents fully work).

### Files / migrations
- 3 migrations: best-practice catalog (Part B), agents tables (Part C), notion_links (Part F).
- New routes: `/_app/agents/index.tsx`, `/_app/agents/$id.tsx`, `/_app/best-practices.tsx`, `/api/mcp.ts`.
- Edge functions: `agents-run`, `notion-push`.
- Edits: `tag-picker.tsx`, `chips.tsx`, `_app.relationships.$id.tsx`, `_app.tenets.$slug.tsx`, `_app.tasks.$id.tsx`, `_app.projects.$id.tsx`, `_app.sessions.$id.tsx`, `app-sidebar.tsx` (add Agents + Best Practices), `entities.ts`, `enums.ts`.
- Memory: `mem://features/best-practice-catalog`, `mem://features/agents`, `mem://design/domains-vs-tenets-ui`, append Core lines.

### Suggested order of delivery (so review stays sane)
1. Part A (decouple UI) + Part E (finish 2.8 panels) — same migration-free batch, immediate visible win.
2. Part B (best-practice catalog) + tenet detail panel.
3. Part C (agents core) + Part D (best-practice refiner agent loop).
4. Part F (Notion MCP push) — last, gated by you providing the Notion API token + MCP secret.

Approve all four sub-phases as one Phase 2.10, or tell me to do steps 1–2 first and pause before Agents. If you say nothing about ordering, I'll do 1 → 2 → 3 → 4 in sequence and check in after step 2.

