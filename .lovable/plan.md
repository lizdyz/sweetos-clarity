

# Phase 2.10h: Quality gates (OKRs/KPIs/CSFs), workflow sequencing with human-in-loop, session catalog

You're naming three connected gaps. Let me map each one to a clean structure, then say where the fuzzy parts (Playbook vs Workflow vs Session) actually land.

## 1. Quality gates — a polymorphic Measure object

You want to attach **objectives, key results, KPIs, and CSFs** to anything: operators, projects, tasks, campaigns, workflows, components, relationships. One generic "Measure" object that polymorphs across entities.

**Schema (1 migration):**

- `measures` table:
  - `id`, `kind` enum (`Objective | KeyResult | KPI | CSF`)
  - `subject_type` enum (`operator | project | task | campaign | workflow | component | relationship | mission | engagement_service`)
  - `subject_id uuid`
  - `name text`, `description text`
  - `target_value numeric`, `target_unit text` (e.g. `%`, `$`, `count`, `days`)
  - `baseline_value numeric`
  - `current_value numeric` (last reading)
  - `direction` enum (`higher_is_better | lower_is_better | hit_target`)
  - `cadence` enum (`daily | weekly | monthly | quarterly | per_event`)
  - `parent_measure_id uuid` — KRs hang under Objectives, CSFs can group KPIs
  - `due_date date`, `done_at timestamptz`, `status text`
  - `tagged_domains[]`, `tagged_tenets[]` (already-canonical dual axes)
- `measure_readings` table — append-only journal:
  - `measure_id`, `value numeric`, `recorded_at timestamptz`, `recorded_by uuid`, `notes text`, `source` (`manual | session | workflow_run | agent`)
- View `measure_health (measure_id, latest_value, pct_to_target, status_color, last_reading_at)` — drives chip colour everywhere.

**UI:**
- New shared `<MeasuresPanel subjectType subjectId />` — dropped into every detail page. Shows nested Objectives → Key Results, and a flat list of KPIs/CSFs. Each row: sparkline + current vs target + cadence + last-recorded chip.
- Quick "+ reading" inline on each row writes to `measure_readings`.
- New `/_app/measures` index — global pivot view (filter by subject type, kind, status_color, cadence). Lets you see "all red KPIs across all relationships" in one place.
- Flightdeck gets a **"Measures due for reading"** panel (cadence-driven; surfaces any measure whose `last_reading_at + cadence < now`).

## 2. Workflows as sequential, components-aware, human-gated flows

Today `workflows` is a flat row. You want a real DAG with:
- **Steps in order** (with branches optional later)
- **Component contributions** per step (a workflow step builds/refines a component)
- **Human-in-the-loop gates** that pause the run for confirmation
- **Operator assignment** per step (human, agent, or sub-workflow)

**Schema:**

- `workflow_steps` table:
  - `id`, `workflow_id`, `position int` (order), `name`, `description`
  - `step_type` enum (`action | gate | branch | sub_workflow`)
  - `default_operator_id uuid` (operators table — human/agent/workflow)
  - `requires_human_approval bool`
  - `approval_role` enum (`owner | admin | any_team_member | named_operator`)
  - `tagged_components[]` — components this step builds/refines
  - `produces_document_type text` — names the deliverable (links to `documents.type`)
  - `expected_duration_minutes int`
  - `success_criteria text` — what "done" means for this step
- `workflow_step_dependencies` (step → depends_on_step) — for non-linear branches
- `workflow_runs` already exists. Add:
  - `current_step_id uuid`, `awaiting_approval_from uuid`, `approval_requested_at timestamptz`
- `workflow_step_runs` table — per-step execution log:
  - `run_id`, `step_id`, `status` (`pending | in_progress | awaiting_approval | approved | rejected | done | skipped`)
  - `started_at`, `completed_at`, `operator_id` (who actually ran it)
  - `output_document_id uuid` (link to `documents` row produced)
  - `notes`, `approval_decision text`, `approval_by uuid`, `approval_at timestamptz`

**UI:**
- Workflow detail (`/_app/workflows/$id`) gets a **vertical step canvas**:
  - Each step is a card showing: position · name · operator chip · component chips · "human gate" badge if applicable · expected duration.
  - Drag to reorder (uses existing `useDragToStatus` pattern adapted for position).
  - Click a step → side sheet to edit (operator picker, components multi-select, approval toggle, success criteria).
  - "+ Step" button at any position.
- Workflow run view (`/_app/workflows/$id/runs/$runId`):
  - Same vertical canvas but each step shows live status (pending/in-progress/awaiting-approval/done) with timestamps.
  - "Approve" / "Reject" buttons appear on the current step when `awaiting_approval` AND current user matches `approval_role`.
  - Approving advances `current_step_id` to next step; rejecting writes notes and stays.
- Flightdeck: new **"Awaiting your approval"** panel — every `workflow_step_runs` row in `awaiting_approval` matching current user's role.

## 3. Session catalog — where Mirror/Machine sessions are *defined*

You're right that this is fuzzy. Let me name it cleanly:

- **Playbook** = a *template* (industry+persona+service combo). It's the "recipe book."
- **Workflow** = the *executable* sequence of steps that runs the playbook. Workflows can be triggered standalone or from a playbook.
- **Session** = a single time-bound human meeting (Mirror/Machine/Map). A session *consumes* one slot of an `engagement_service`.
- **Component** = the reusable knowledge artifact built/refined inside sessions or by projects/tasks/workflows.
- **Document** = the deliverable (a brief, a roadmap, a mirror summary). Documents are produced by workflow steps OR sessions.

Where sessions are decided / catalogued:

**New `session_templates` table** — the catalog:
- `id`, `name` (e.g. "90-min Mirror Discovery"), `service_type` (Mirror/M+M/Machine/Map)
- `default_duration_minutes`, `default_phase_owner` (already exists as enum)
- `default_sweetcycle_phase` (Seed/Synthesize/Session/Sync/Ship — already exists)
- `linked_workflow_id uuid` — the workflow that runs *during* this session type
- `default_components[]` — components typically built/refined in this session
- `default_deliverable_template_ids[]` — document templates produced
- `prep_checklist[]`, `agenda[]`, `closing_checklist[]`
- `typical_position_in_journey int` — first Mirror, first Machine, etc.

`sessions.session_template_id` (new column) — which template this session was scheduled from. Auto-populates phase, duration, expected components, expected deliverables.

**UI:**
- New `/_app/session-templates` route — manage the catalog (Mirror Discovery, Mirror Refinement, Machine Build Sprint, Map Quarterly Review, etc.).
- When scheduling a session on a relationship, picker shows templates filtered by the relationship's `service_package` (if they have Mirror Only, only Mirror templates show).
- Session detail page shows: linked template · linked workflow run · components built · deliverables produced — so the "what does this session do" question has one screen with the whole answer.

## How the three pieces interconnect

```
Industry  →  Persona  →  Playbook (template)  →  spawns  →  Workflow (executable steps)
                                                                ↓
                                                            Workflow Run
                                                                ↓ (steps reference)
                                                            Session(s) ←  scheduled from  →  Session Template
                                                                ↓ (produces)
                                                            Documents + Component updates
                                                                ↓ (measured by)
                                                            Measures (OKRs/KPIs/CSFs)
```

Every layer can have Measures attached. Every actionable layer (workflow step, session, document, component) declares which components it advances.

## Files touched

- 1 migration: `<ts>_measures_workflow_steps_session_templates.sql`
  - new tables: `measures`, `measure_readings`, `workflow_steps`, `workflow_step_dependencies`, `workflow_step_runs`, `session_templates`
  - new enums: `measure_kind`, `measure_subject_type`, `measure_direction`, `measure_cadence`, `workflow_step_type`, `workflow_step_status`, `approval_role`
  - new columns: `workflow_runs.current_step_id / awaiting_approval_from / approval_requested_at`, `sessions.session_template_id`
  - new view: `measure_health`, `workflow_step_pipeline`
  - RLS: team-read / owner-or-admin-write on all new tables
- New components:
  - `src/components/measures-panel.tsx` — drop-in for any detail page
  - `src/components/measure-row.tsx` — sparkline + reading input
  - `src/components/workflow-step-canvas.tsx` — vertical drag-to-reorder
  - `src/components/workflow-step-sheet.tsx` — edit step
  - `src/components/workflow-run-tracker.tsx` — live run view with approve/reject
  - `src/components/session-template-picker.tsx`
- New routes:
  - `src/routes/_app.measures.tsx` — global pivot
  - `src/routes/_app.workflows.$id.runs.$runId.tsx` — run view
  - `src/routes/_app.session-templates.index.tsx` + `_app.session-templates.$id.tsx`
- Edits:
  - `src/routes/_app.workflows.$id.tsx` — add step canvas + measures panel
  - `src/routes/_app.sessions.$id.tsx` — show linked template + workflow run + measures
  - `src/routes/_app.relationships.$id.tsx` — session scheduler uses templates filtered by `service_package`
  - `src/routes/_app.flightdeck.tsx` — "Measures due for reading" + "Awaiting your approval" panels
  - 8 detail pages get `<MeasuresPanel>` drop-in: operators, projects, tasks, campaigns, components, relationships, missions, engagement_services
- Memory:
  - New `mem://features/measures.md` — Measure object model, polymorphic subject, KR↔Objective parent chain, cadence-driven reading reminders.
  - New `mem://features/workflow-sequencing.md` — workflow_steps, human-in-loop gates, approval_role, run tracker, step → component contribution.
  - New `mem://features/session-catalog.md` — session_templates as the canonical place where Mirror/Machine sessions are defined; relationship of Playbook → Workflow → Session Template → Session → Documents/Components.
  - Append `mem://index.md` Core: "Measures (Objective/KR/KPI/CSF) are polymorphic — attach to any subject via measures.subject_type/subject_id. Always shown via `<MeasuresPanel>`."
  - Append `mem://index.md` Core: "Workflows are sequential step DAGs. Steps may require human approval (workflow_step_runs.status='awaiting_approval'). Sessions are defined in session_templates and linked to a workflow."

## What I'm NOT doing in 2.10h

- Auto-computing KPI values from underlying data (e.g. "tasks completed this week" auto-feeding a KPI) — manual readings only this pass; auto-rollup is a follow-up once the schema is settled.
- Branching workflow steps (parallel paths, conditional gates) — linear sequence + dependencies table now; visual branch editor is a follow-up.
- AI-generated workflow steps from a playbook — manual definition this pass.
- Calendar-based session scheduling UX — picker + template selection now; full calendar later.
- Notification/email when an approval is awaiting — Flightdeck panel surfaces it; push later.

## Suggested order after this

1. **2.10h (this plan)** — measures + sequencing + session catalog.
2. **AI auto-rollup** for KPIs (e.g. on-time-completion-rate computed from `time_grid`).
3. **Workflow branching** + visual DAG editor.
4. **AI playbook → workflow generator**.
5. **Notion sync**.

