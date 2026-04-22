

# Phase 2.10h (continued): Drop MeasuresPanel everywhere + live workflow run tracker

The schema and shared primitives shipped. Now wire them into the rest of the app and add the missing live-run experience.

## What lands in this pass

### 1. MeasuresPanel sweep — drop into 8 detail pages
Mechanical drop-in (`<MeasuresPanel subjectType="..." subjectId={id} />`) under the existing content on:
- `_app.operators.$id.tsx` (subject_type: `operator`)
- `_app.projects.$id.tsx` (`project`)
- `_app.tasks.$id.tsx` (`task`)
- `_app.campaigns.$id.tsx` (`campaign`)
- `_app.components.$id.tsx` (`component`)
- `_app.relationships.$id.tsx` (`relationship`)
- `_app.missions.$id.tsx` (`mission`)
- `_app.engagement-plans.$id.tsx` (engagement_service rows in the plan)

Each sits under the WorkContextStrip / TimelineStrip in a consistent slot.

### 2. Workflow run tracker — the live execution view
- New route `_app.workflows.$id.runs.$runId.tsx`:
  - Vertical canvas of `workflow_steps` for the workflow.
  - Each step shows live status from `workflow_step_runs` (pending / in-progress / awaiting-approval / done / rejected / skipped) with timestamps and operator chip.
  - Current step is highlighted; completed steps collapse; future steps dimmed.
  - **Approve / Reject** buttons appear on the current step when status is `awaiting_approval` AND current user matches `approval_role` (owner/admin/any_team_member/named_operator).
  - Approving writes `approval_decision`, `approval_by`, `approval_at`, flips step to `done`, advances `workflow_runs.current_step_id` to next step, inserts next `workflow_step_runs` row as `pending`.
  - Rejecting writes notes, keeps step in `awaiting_approval`, surfaces the note for revision.
- New small component `src/components/workflow-run-tracker.tsx` to encapsulate the canvas + approve/reject logic (re-usable from the workflow detail page too as a "Latest run" panel).
- Workflow detail page (`_app.workflows.$id.tsx`) gets a "Recent runs" list above the step canvas with click → run view, plus a "Start new run" button that creates a `workflow_runs` row + the first `workflow_step_runs` row.

### 3. Flightdeck — two new panels
- **Awaiting your approval**: pulls `workflow_step_runs` where `status = 'awaiting_approval'` and approval_role matches current user (admin / owner / any_team_member / named operator). Each row links to the run view. Approve/Reject inline.
- **Measures due for reading**: pulls from `measure_health` where `last_reading_at + cadence_interval < now()` (or never recorded). Inline "+reading" mini-form per row.

### 4. Sessions wiring — link templates + measures
- `_app.sessions.$id.tsx`:
  - Show `session_template_id` chip with template name (clickable → template detail).
  - Show linked `workflow_run` if the template has `linked_workflow_id` (auto-created when session is scheduled from a template).
  - Drop in `<MeasuresPanel subjectType="session" subjectId={id} />` (extends the existing 8 — sessions count as the 9th).
  - "Components built in this session" chip list (from `tagged_components` / step contributions).
- `_app.sessions.index.tsx`: filter chip for service_type derived from `session_templates.service_type`.
- `_app.relationships.$id.tsx` session scheduler: use `<SessionTemplatePicker>` filtered by relationship's `service_package`.

### 5. Capture/queue: confirmation supports measures suggestion
- When AI extracts something that looks like a metric ("we want to hit 50 demos this quarter"), the queue confirmation shows a suggested Measure (kind=KPI, target_value=50, target_unit=count, cadence=quarterly, subject inferred from context).
- User confirms → row created in `measures`. No new schema; just wires the existing extractor to `measures` insert.

## Files touched

- New route: `src/routes/_app.workflows.$id.runs.$runId.tsx`
- New component: `src/components/workflow-run-tracker.tsx`
- Edited components: `src/components/measures-panel.tsx` (already exists — verify props), `src/components/session-template-picker.tsx` (verify filter prop)
- Edited routes (drop-ins, mechanical):
  - `src/routes/_app.operators.$id.tsx`
  - `src/routes/_app.projects.$id.tsx`
  - `src/routes/_app.tasks.$id.tsx`
  - `src/routes/_app.campaigns.$id.tsx`
  - `src/routes/_app.components.$id.tsx`
  - `src/routes/_app.relationships.$id.tsx` (MeasuresPanel + scheduler picker swap)
  - `src/routes/_app.missions.$id.tsx`
  - `src/routes/_app.engagement-plans.$id.tsx`
  - `src/routes/_app.sessions.$id.tsx` (template chip + linked run + measures + components)
  - `src/routes/_app.sessions.index.tsx` (service_type filter)
  - `src/routes/_app.workflows.$id.tsx` (Recent runs + Start new run)
  - `src/routes/_app.flightdeck.tsx` (Awaiting approval + Measures due panels)
  - `src/routes/_app.capture.tsx` + `src/routes/_app.queue.tsx` (suggested-measure card in confirmation)
- Memory:
  - Append `mem://features/measures.md`: capture-time KPI suggestion flow.
  - Append `mem://features/workflow-sequencing.md`: run tracker UI contract, approval flip logic, next-step spawn.

## What I'm NOT doing in this pass

- Auto-rollup KPIs from underlying data (next phase).
- Branching workflow steps / parallel paths (linear only for now).
- Email/push notifications for awaiting approvals (Flightdeck panel only).
- AI-generated suggested measures from `intelligence_summary` (manual + capture-derived only).

## Suggested order after this

1. **2.10h drop-in sweep (this plan)** — finish wiring measures + run tracker.
2. **AI auto-rollup** for KPIs computed from `time_grid` / `excellence_scores`.
3. **Workflow branching** + visual DAG editor.
4. **AI playbook → workflow generator**.
5. **Notion sync**.

