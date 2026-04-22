

# Phase 2.10f (continued): Wire the new primitives across the app

Part A schema + the 5 shared components shipped. Now wire them in everywhere they belong, plus finish the Settings seeding tool and the Flightdeck Done log.

## What lands in this pass

### 1. Maturity threshold sheet — wired in
- `excellence-matrix.tsx`: each cell gets a small info icon (top-right). Click opens `MaturityThresholdSheet` for that (subject, relationship). Cell click-to-cycle stays as-is.
- `_app.components.$id.tsx`: add a "Maturity ladder" button that opens the same sheet with `subjectKind='component'`.
- Sheet writes to `excellence_checklist_progress` (already created); auto-advance hint shown when all current-level items checked.

### 2. Domain ↔ Tenet decoupling sweep
Replace any combined chip row with `<DomainTenetChips>` on these detail pages:
- components.$id, projects.$id, tasks.$id, campaigns.$id, sparks.$id, missions.$id, decisions.$id, delegation.$id, documents.$id, outcomes.$id, personas.$id, playbooks.$id, journeys.$id, sessions.$id

Add the dual-select filter row (Domain + Tenet) on the matching list pages where it's missing: projects, sparks, tasks, campaigns, missions, decisions, delegation, documents, outcomes, personas, playbooks, journeys, sessions.

### 3. Timeline + due-date chips sweep
- Add `<TimelineStrip>` under the title on every entity detail page (14 pages above + relationships).
- Add `<DueDateChip>` to every card/row on every list/board: tasks, projects, sessions, campaigns, sparks, outcomes, missions, decisions, delegation, components, plus the kanban/swimlane cards.

### 4. Settings → Excellence: "Seed defaults" button
- `_app.settings.excellence.tsx`: per-subject "Seed defaults" button. Opens a confirm dialog, then inserts starter `excellence_rubric` rows for L1→L5 across the 5 Ps using a per-subject template.
- Templates ship for: 22 universal Domains, 8 Foundation tenets (F1–F8), and the 8 seeded Components. Other tenets get an empty editable shell row per (level, perspective).
- Idempotent: skips cells that already exist.

### 5. Flightdeck — Done log panel
- New panel under "Due this week": last 14 days of records flipped to a done state, grouped by day, source-tagged (task / project / session / spark / outcome).
- Pulls from each table's `done_at`/`completed_at`/`status='Done'` column with a `UNION ALL` view `recent_done_log (entity_type, entity_id, name, done_at, relationship_id)`.

### 6. "Every entity works" sweep
Targeted, ~1 fix per entity:
- Verify Capture → Queue → Confirm creates a row for each `entity_type`.
- Replace any remaining legacy assignee dropdowns with `<OperatorPicker>` on tasks, projects, sessions, campaigns, delegation.
- Fix any `<Select>` empty-value crashes (guard `value=""` cases).
- Verify every list page: create button, search, filters, row→detail navigation.

## Files touched

- 1 migration: `<ts>_done_log_view_and_rubric_seed.sql` — creates `recent_done_log` view (UNION ALL across 5 tables) + `seed_excellence_defaults(_subject_kind, _subject_id)` SQL function used by the Settings button.
- Edits: `excellence-matrix.tsx`, `_app.components.$id.tsx`, `_app.settings.excellence.tsx`, `_app.flightdeck.tsx`.
- Edits across ~14 detail pages and ~13 list pages: drop in `DomainTenetChips`, `TimelineStrip`, `DueDateChip`, `OperatorPicker`. Mechanical; no logic rewrites.
- Memory: append `mem://index.md` Core with the two rules from 2.10f (independent axes; due+done on every record).

## What I'm NOT doing this pass

- AI auto-recommend `recommended_package` (next phase).
- Calendar view for due dates (chip + list view first).
- Per-tenet starter checklists for Specialization/Advanced/Mastery (empty shells; seed content lands when you define them).
- Agent runtime wiring.

## Next after this

1. AI package recommender.
2. Best-Practice Catalog.
3. Agent runtime + skill-based routing.
4. Notion sync.

