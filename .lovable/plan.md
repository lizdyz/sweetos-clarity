

# Phase 2.10i: Audit findings + cleanup pass

I went through every promised wiring against what's actually in the codebase. Here's the honest report.

## What's truly wired and working

- ✅ Schema: `measures`, `measure_readings`, `workflow_steps`, `workflow_step_runs`, `session_templates`, `project_components`, `task_components`, time fields on 6 tables, `next_recurrence`, recurrence-spawn trigger, `measure_health` view — all present in DB.
- ✅ `WorkContextStrip` mounted on projects + tasks.
- ✅ `ComponentLinkPanel` on projects, `ActiveBuildPanel` on components.
- ✅ `MeasuresPanel` mounted on 8 detail pages.
- ✅ Flightdeck `ApprovalsPanel` and `MeasuresDuePanel` exist and query the right tables.
- ✅ Workflow run tracker route + component exist.

## Gaps, drift, and rough edges (what I claimed shipped but didn't, or shipped half-wired)

### A. Sidebar navigation is missing 3 first-class destinations
- No link to `/measures` (the global pivot route exists but is unreachable from nav).
- No link to `/session-templates` (the catalog route exists but unreachable).
- No link to `/flightdeck` is fine — it's there. But `/journey` (singular) route exists alongside `/journeys` plural, with no link and unclear purpose. **Decision needed**: keep, fold into `/flightdeck`, or delete.

### B. TimelineStrip is built but mounted on **zero** pages
The component supports due/scheduled/not-before/done inline editing, but no detail page renders it. Promised drop-in across actionable detail pages never happened.

### C. RecurrencePopover is built but mounted on **zero** pages
Same story — exists, never rendered. Tasks/projects/sparks/sessions/campaigns can't actually set a recurrence rule from the UI.

### D. Sessions detail uses the wrong `subject_type` for measures
Currently passes `subject_type="engagement_service"` for sessions. There's no `session` enum value in `measure_subject_type` (the enum is operator/project/task/campaign/workflow/component/relationship/mission/engagement_service). Either: (a) add `session` to the enum, or (b) accept that sessions roll up to the parent engagement_service. The plan promised a session subject_type — pick one path and commit.

### E. Sessions index `serviceType` filter doesn't actually filter
The state and chip row exist, but the filter value is never passed into `EntityListPage`. UI looks functional but does nothing.

### F. Relationship session scheduler doesn't use SessionTemplatePicker
Promised. Not wired. `_app.relationships.$id.tsx` has no reference to `SessionTemplatePicker` or any template-aware scheduling.

### G. Workflow detail page has no "Recent runs" / "Start new run" UI
The query for `workflow_runs` exists but no list rendering and no mutation to create a new run + first step run row. The run-tracker route is unreachable from the workflow detail page.

### H. Capture/Queue measure suggestion never landed
Promised in 2.10h sweep. Zero references to `measure` in capture/queue routes.

### I. WorkContextStrip is on tasks/projects only
Plan promised "12 detail pages get WorkContextStrip drop-in." Missing on: campaigns, sparks, missions, decisions, delegation, documents, outcomes, personas, playbooks, journeys, sessions, components.

### J. Naming/IA confusion to resolve
- **Sessions** lives under "Library" in the sidebar but it's an *operational* entity (scheduled meetings), not a library template. Move to "Operate" group.
- **Session Templates** belongs in "Library" — it IS the catalog.
- **Measures** belongs in "Operate" alongside Flightdeck.
- **Quests / Sparks / Missions / Outcomes / Decisions / Delegation** — 6 library entries with overlapping vibes. Keep as-is for now (separate plan to consolidate later) but add small descriptors on hover so users know which is which.

### K. Two separate journey routes (`_app.journey.tsx` singular and `_app.journeys.*` plural)
`/journey` is the SweetCycle visualization for the active relationship; `/journeys` is the Library entity. Confusing. Rename `/journey` → `/sweetcycle` to match the canonical name in memory.

### L. No surfaces show "what advances this component" on the component list page
Component list has no maturity progress chip or "active build work" indicator — has to be drilled into.

## Cleanup pass — what I'll do

### 1. Sidebar IA fix
- Add **Measures** to "Operate" (Gauge icon).
- Add **Session Templates** to "Library" (Layers icon).
- Move **Sessions** from "Library" to "Operate".
- Rename `/journey` route file to `/sweetcycle` and add to "Operate" with Map icon. Keep redirect.
- Add subtle one-line tooltip on each Library item explaining its purpose.

### 2. Mount the orphan primitives
- `<TimelineStrip>` on detail pages: tasks, projects, campaigns, sparks, sessions, engagement-services, missions, outcomes — wired to `due_date / scheduled_for / not_before / done_at`.
- `<RecurrencePopover>` on the same set — writes to `recurrence_rule`.
- `<WorkContextStrip>` drop-in on the remaining 10 detail pages (mechanical sweep).

### 3. Fix sessions wiring
- Add `session` to `measure_subject_type` enum (1-line migration). Switch `_app.sessions.$id.tsx` to use `subject_type="session"`.
- Pass `serviceType` filter into `EntityListPage` as a where clause (extend EntityListPage to accept an optional `extraFilters` prop, or filter client-side via `session_template_id IN (...)`).
- Wire `<SessionTemplatePicker>` into the relationship detail page session scheduler with a "Schedule session" button. Filtering by relationship `service_package` so a Mirror-Only client only sees Mirror templates.

### 4. Workflow detail page
- Add "Recent runs" panel above the step canvas: list of `workflow_runs` (status + started_at + current_step_id name) → click navigates to run tracker.
- Add **"Start new run"** button → creates `workflow_runs` row + first `workflow_step_runs` row in `pending` → navigates to run tracker.

### 5. Capture/Queue measure suggestion
- In `_app.queue.tsx` confirmation, when proposal kind is `measure` (or AI-extracted target metric is detected), render a `<SuggestedMeasureCard>` showing inferred kind/target/unit/cadence/subject. Confirm → insert into `measures`.
- Update `proposals.functions.ts` to accept the new `measure` proposal type.

### 6. Component list page enhancement
- Add a `MaturityChip` (current_maturity_level color-coded) and an `ActiveBuildBadge` (count of in-flight `project_components` rows) to each component card.

### 7. Memory updates
- Append `mem://index.md` Core: "Sessions are operational, not library — sidebar group 'Operate'. Session Templates are the library catalog."
- Append `mem://features/measures.md`: `session` is a valid `subject_type`.
- Append `mem://features/work-graph-time.md`: TimelineStrip + RecurrencePopover are drop-ins for every actionable detail page; mounting is mandatory, not optional.

## Files touched

- 1 migration: `<ts>_session_subject_type_and_polish.sql` — `ALTER TYPE measure_subject_type ADD VALUE 'session';`
- Edited: `src/components/app-sidebar.tsx` (IA reshuffle).
- Edited: `src/routes/_app.sessions.index.tsx` (filter actually applied), `_app.sessions.$id.tsx` (subject_type fix).
- Edited: `src/routes/_app.relationships.$id.tsx` (template picker scheduler).
- Edited: `src/routes/_app.workflows.$id.tsx` (Recent runs + Start new run).
- Edited: `src/routes/_app.queue.tsx` + `src/utils/proposals.functions.ts` (measure suggestion).
- Edited: `src/routes/_app.components.index.tsx` (maturity + active build chips).
- Edited (mechanical drop-in sweep — TimelineStrip + RecurrencePopover + WorkContextStrip): tasks, projects, campaigns, sparks, sessions, engagement-services, missions, outcomes, decisions, delegation, documents, personas, playbooks, journeys, components.
- New file: `src/components/suggested-measure-card.tsx`.
- Renamed file: `src/routes/_app.journey.tsx` → `src/routes/_app.sweetcycle.tsx` (with redirect from old path).

## What I'm NOT doing this pass

- Consolidating overlapping library entities (Quests/Sparks/Missions/Outcomes) — separate planning conversation.
- Auto-rollup KPIs from underlying data — still queued.
- Branching workflow steps — still queued.
- Notifications/email — still queued.

## Suggested order after this

1. **2.10i (this plan)** — close gaps and tidy IA so what we said exists actually exists.
2. **AI auto-rollup** for KPIs.
3. **Consolidation review** of library entities (do we really need 6 outcome-shaped objects?).
4. **Branching workflows** + visual DAG editor.
5. **Notion sync**.

