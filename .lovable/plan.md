

# Phase 2.10g: Interconnectedness — projects build components, recurring time, dual tagging everywhere

You're naming the real shape of the system: **projects and tasks are how components get built**, every actionable thing needs **dual tagging (Domains AND Tenets)**, and **time is multi-dimensional** (due, scheduled-to-work-on, recurring, blocked-until). Let's wire it together end-to-end.

## The four interconnected pieces

### 1. Projects → Components (the build relationship)

Right now `components` exist and `projects` exist, but there's no explicit link saying *"this project is building this component."* That's the missing spine.

**Schema:**
- New table `project_components (project_id, component_id, contribution_type, target_maturity_level, target_date)` — many-to-many with intent.
  - `contribution_type`: `Builds | Refines | Tests | Documents | Retires`.
  - `target_maturity_level`: what level should this component reach when the project is done.
  - `target_date`: when the contribution is expected.
- New table `task_components (task_id, component_id)` — same pattern at the task level so individual tasks ladder up to components too.
- Add `components.in_flight_project_ids` view-derived field (read-only) showing active projects building it.

**UI:**
- **Project detail** (`/_app/projects/$id`): new "Building / Refining" panel — chip list of components this project advances, with target-level and target-date per chip. Click → component detail.
- **Component detail** (`/_app/components/$id`): new "Active build work" panel — projects + tasks currently advancing this component, with their due dates and current status. Plus a **"Path to L5"** strip showing which projects/tasks would need to land to clear each remaining maturity threshold (cross-references `excellence_checklist_progress`).
- **Task detail**: small "Advances component" picker (multi-select, defaults from parent project).

### 2. Dual tagging on **every** taggable entity (the sweep)

Schema is already correct (independent `tagged_domains` + `tagged_tenets` columns). The remaining work is purely UI consistency: drop `<DomainTenetChips>` into every detail page that touches both, and the dual-select filter row into every list page. Same primitive, mechanical sweep across:

- Detail pages: projects, tasks, campaigns, sparks, missions, decisions, delegation, documents, outcomes, personas, playbooks, journeys, sessions, components.
- List pages: same set, dual filter row (Domain · Tenet) above the table/board.

Plus: capture/queue confirmation step shows the two groups separately so the user confirms each axis independently.

### 3. Time, properly — four kinds of "when"

Today we have due dates. You're naming four distinct time concepts:

| Concept | Question it answers | Field |
|---|---|---|
| **Due** | When must this be done? | `due_date` (exists) |
| **Scheduled** | When am I planning to work on it? | NEW `scheduled_for date` |
| **Recurring** | Does this repeat? | NEW `recurrence_rule text` (RRULE) + `recurrence_parent_id` |
| **Blocked-until** | Can't start before? | NEW `not_before date` |
| **Done** | When did it actually finish? | `done_at` (exists) |

**Schema (1 migration):**
- Add `scheduled_for date`, `not_before date`, `recurrence_rule text`, `recurrence_parent_id uuid` to: `tasks`, `projects` (next-action level), `sparks`, `sessions`, `campaigns`, `engagement_services`.
- Add cron-style helper `next_recurrence(rule, anchor)` SQL function (parses simple RRULE: FREQ=DAILY/WEEKLY/MONTHLY, INTERVAL, BYDAY).
- New view `time_grid` — every actionable record across the system in one row shape: `(entity_type, entity_id, name, due_date, scheduled_for, not_before, done_at, relationship_id, recurrence_rule)`. Powers all the time-aware UI below.

**UI:**
- **Timeline strip** gets two more cells: `Scheduled` and `Not before` (inline date pickers like the others).
- **Recurrence editor**: a small popover on every actionable detail page — "Repeats: Never / Daily / Weekly / Monthly / Custom (RRULE)". When set, the system auto-creates the next instance on `done_at` flip.
- **Flightdeck**:
  - **Today** panel — `scheduled_for = today` OR `due_date = today AND not blocked`.
  - **This week** panel (already there) — keep, expand to use `time_grid`.
  - **Recurring** panel — all records with `recurrence_rule IS NOT NULL`, next-occurrence date.
  - **Stuck** panel — `not_before > today` records (so you can see what's parked).
- **Calendar view** (light) on Flightdeck: month grid showing scheduled + due markers. Not a full calendar app — just visual density.
- **List/board cards** show two chips when relevant: `Due` (red/amber/green) and `Scheduled` (blue dot).

### 4. The interconnected "what's this for" lens

A read-side view that ties it all together so any record answers: *"why does this exist, what does it advance, when, and what's blocking it?"*

**New view `work_context`** per actionable record:
- `entity_type`, `entity_id`, `name`
- `building_components[]` (from project_components/task_components)
- `for_relationship` (relationship_id + name)
- `tagged_domains[]`, `tagged_tenets[]`
- `due_date`, `scheduled_for`, `not_before`, `done_at`, `recurrence_rule`
- `blocked_by_tasks[]`, `blocking_tasks[]` (from task_dependencies)
- `parent_project_id`, `parent_campaign_id`

**Renders as** a collapsible "Context" strip at the top of every detail page (under the Timeline strip): one glance shows "This task is part of Project X, advancing Component Y to L4 by Mar 15, tagged D7+F3, scheduled for tomorrow, blocked by Task Z."

## Files touched

- 1 migration: `<ts>_interconnect_time_and_components.sql` —
  - new tables: `project_components`, `task_components`
  - new columns on 6 tables: `scheduled_for`, `not_before`, `recurrence_rule`, `recurrence_parent_id`
  - new SQL function: `next_recurrence(rule, anchor)`
  - new views: `time_grid`, `work_context`, `component_build_pipeline`
  - RLS: team-read / owner-write on the two new tables
  - trigger: on task/project `done_at` flip with `recurrence_rule`, insert next instance
- New components:
  - `src/components/component-link-panel.tsx` — Building/Refining chip list with target level + date
  - `src/components/recurrence-popover.tsx` — repeat rule editor
  - `src/components/work-context-strip.tsx` — the "what's this for" collapsible
  - `src/components/scheduled-chip.tsx` — blue scheduled-for chip
  - `src/components/mini-calendar.tsx` — Flightdeck month grid
- Edits:
  - `src/components/timeline-strip.tsx` — add Scheduled + Not-before cells
  - `src/routes/_app.projects.$id.tsx` — Building panel + work-context strip + recurrence
  - `src/routes/_app.components.$id.tsx` — Active build work panel + Path to L5 strip
  - `src/routes/_app.tasks.$id.tsx` — component picker + recurrence + work-context
  - `src/routes/_app.flightdeck.tsx` — Today / Recurring / Stuck panels + mini-calendar
  - 12 detail pages get `<WorkContextStrip>` drop-in
  - 12 list pages get the dual filter row (finishing the Phase 2.10f sweep)
- Memory:
  - New `mem://features/work-graph-time.md` — the four time concepts, recurrence rule format, time_grid view contract.
  - New `mem://features/component-build-graph.md` — projects/tasks build components; project_components contribution_type taxonomy; Path to L5 derivation.
  - Append `mem://index.md` Core: "Projects and tasks build Components. Use project_components / task_components to declare contribution; never infer from name matching."
  - Append `mem://index.md` Core: "Five time fields per actionable record: created · scheduled_for · not_before · due · done. Recurrence creates the next instance on done."

## What I'm NOT doing in 2.10g

- Full calendar app (drag-to-schedule, week view, day view) — month-grid mini-calendar lands; full calendar is a follow-up.
- Smart auto-scheduling (suggesting `scheduled_for` based on workload + dependencies) — manual now, AI suggestion later.
- Notifications / reminders on due/scheduled dates — surface in UI now, push/email later.
- Auto-creating tasks from component checklist gaps — will land with the AI suggester.

## Suggested order after this

1. **2.10g (this plan)** — interconnect spine + four-dimensional time + dual-tag sweep.
2. **AI package recommender + task suggester** (what tasks would advance this component to L4?).
3. **Best-Practice Catalog**.
4. **Agent runtime + skill-based routing**.
5. **Notion sync**.

