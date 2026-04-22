

# Phase 2.10e: Operators (humans, workflows, agents) + rename Journey → Flightdeck

Two related moves: introduce a real **Operator** concept (the thing that can do work — human teammate, workflow, or AI agent) with skills and preferences, and rename the cross-relationship dashboard so it stops colliding with your named system parts.

## Why this matters

- Today **People** lists `profiles` (human teammates only). Tasks have `assignee_id` pointing only at humans. There's no way to assign work to a workflow run or an agent, even though SweetBOS treats them as equivalent doers.
- **Skills / what they like doing** isn't captured anywhere — so we can't route the right work to the right operator (human or AI) or surface "Liz is the only one who can do this" as a delegation signal.
- "**Journey**" is overloaded: you already have a `journeys` Library entity, plus the SweetBOS doc names Story Trail, SweetSync, Map, Machine, Mirror as first-class surfaces. The dashboard route needs a name that doesn't compete.

## Rename: Journey → **Flightdeck**

Flightdeck is the operator's daily hub: who's flying which engagement, what handoffs are due, what's at risk. It's not a SweetBOS-named noun, so it stays out of the way of Journey/Story Trail/SweetSync.

- Route: `/_app/journey` → `/_app/flightdeck`.
- Sidebar label "Journey" → "Flightdeck", icon stays `Map`, position stays at the top of **Operate**.
- Component file `_app.journey.tsx` → `_app.flightdeck.tsx` (page-level identifiers + headings updated).
- The `relationship_journey` SQL view keeps its name (it's a data contract, not a UI label), but the page consuming it talks about "Flightdeck" everywhere user-visible.
- Add a redirect: `/_app/journey` → `/_app/flightdeck` so any bookmarks survive.

## Operators — new first-class concept

### Schema (1 migration)

- New table `operators`:
  - `id uuid pk`, `name text not null`, `kind operator_kind not null` (`human | workflow | agent`)
  - `profile_id uuid` (set when kind=human, links to `profiles.id`)
  - `workflow_id uuid` (set when kind=workflow, links to `workflows.id`)
  - `agent_model text` (e.g. `google/gemini-2.5-pro`, `openai/gpt-5`) — set when kind=agent
  - `agent_system_prompt text` — set when kind=agent
  - `skills text[]` — free-form skill tags (e.g. "copywriting", "SQL", "client-facing", "data viz")
  - `likes text[]` — what they enjoy doing (drives routing affinity)
  - `dislikes text[]` — what to avoid sending them
  - `availability text` — `available | busy | offline | async-only`
  - `notes text`, `avatar_url text`, `enabled bool default true`
  - `created_by`, `created_at`, `updated_at`
- New enum `operator_kind` (`human | workflow | agent`)
- Backfill: one `operators` row per existing `profiles` row (kind=human, name=display_name, profile_id=that profile, skills/likes/dislikes empty arrays).
- Add `tasks.operator_id uuid` (nullable) — new canonical assignee. Keep `assignee_id` for back-compat read; new writes go to `operator_id`.
- View `operator_workload`: `(operator_id, name, kind, open_tasks, blocked_tasks, overdue_tasks, next_due)` — single source for People/Flightdeck panels.
- RLS: same `is_team_member` read / `created_by` owner-update pattern as other tables.

### Routes

- `/_app/operators` — list page (replaces what People shows for assignment data, but People stays as the workload card view).
  - Filter by kind chips (Humans / Workflows / Agents / All).
  - Each card: name, kind badge, top 3 skills, availability dot, open-task count, "next due".
  - "+ New operator" → modal with kind selector that progressively reveals the right fields (human → pick profile; workflow → pick workflow; agent → model + prompt).
- `/_app/operators/$id` — detail page:
  - Editable strip: skills (chip group with add/remove), likes (chip group), dislikes (chip group), availability (select).
  - For agents: model picker (Lovable AI supported list), system prompt textarea, "Test prompt" button (queues a test run — stub now, wire later).
  - For workflows: link to the underlying workflow definition + recent runs.
  - For humans: shows linked profile + role label.
  - Their open tasks (board grouped by status) and recent activity.

### People page (keep, upgrade)

Keep `/_app/people` as the workload heatmap. Source it from the `operator_workload` view so it covers humans + workflows + agents in one grid. Add a kind filter at the top.

### Task assignment everywhere

- Anywhere tasks render an "assignee" picker, change the picker to read from `operators` (filtered to enabled) instead of `profiles`. Show kind badge in the dropdown so "@Liz (human)" vs "@Pre-Mirror Workflow" vs "@Drafter Agent" is unambiguous.
- Tasks list and My Tasks display the operator name + kind chip.

## Files touched

- 1 migration: `<ts>_operators_and_skills.sql` (new enum, table, backfill, view, RLS, `tasks.operator_id` column).
- New: `src/routes/_app.operators.index.tsx`, `src/routes/_app.operators.$id.tsx`, `src/components/operator-picker.tsx` (reusable assignee dropdown).
- Renamed/edited: `src/routes/_app.journey.tsx` → `src/routes/_app.flightdeck.tsx` (page rewritten with new label; data fetching unchanged).
- New: `src/routes/_app.journey.tsx` becomes a 1-line redirect to `/flightdeck` for back-compat.
- Edited: `src/components/app-sidebar.tsx` (rename Journey → Flightdeck; add Operators under Work).
- Edited: `src/routes/_app.people.tsx` (source from `operator_workload`; add kind filter).
- Edited: `src/routes/_app.tasks.$id.tsx`, `src/routes/_app.my-tasks.tsx`, kanban/task cards (operator picker + kind chip).
- Memory updates:
  - New `mem://features/operators.md` — what an operator is, the three kinds, skills/likes/dislikes routing intent, that tasks assign to operators not profiles.
  - Append `mem://index.md` Core: "An Operator is the unit that does work — human, workflow, or agent. All three carry skills, likes, dislikes. Tasks assign to operators."
  - Append `mem://index.md` Core: "Cross-relationship operator dashboard is named Flightdeck. 'Journey' is reserved for the SweetCycle journey concept + the Library Journeys entity."

## What I'm NOT doing in 2.10e

- Building the actual agent execution runtime (running the system prompt against Lovable AI). The schema + UI lands now; wiring `Test prompt` to a real call is a follow-up.
- Skill-based auto-routing (suggesting the best operator for a task based on skills/likes). Schema supports it; the suggestion logic lands later.
- Migrating every legacy `tasks.owner` text value into operators automatically — those keep showing as "legacy owner" buckets on People until the user reassigns.
- Touching the `journeys` Library entity (different concept; stays).

## Suggested order after this

1. **2.10e (this plan)** — Operators + Flightdeck rename.
2. **Best-Practice Catalog** (still queued from original 2.10).
3. **Agent runtime** — wire operator agents to Lovable AI for real execution.
4. **Skill-based task routing**.
5. **Notion sync**.

