

# Phase 2.10v — Step 2: Bring the dead index pages alive

Step 1 (Today + Planner on `time_grid`) is shipped. Continuing with the next shippable slice.

## What this step delivers

Three skeleton index pages (`/projects`, `/relationships`, `/tasks`) get rebuilt to read from the rollup views that already exist. Plus the Components index gets the build-pipeline upgrade. No migration, no new tables — pure UI plumbing into views the database already computes.

## Per-page changes

### `/projects` — from 5-line stub to live heat map
Reads `project_rollup` joined with `projects`. Each row shows:
- Name + relationship
- Stat chips: **open · blocked · overdue · next due**
- Owner avatars
- Visual heat: red ring if `overdue > 0`, amber if `blocked > 0`, neutral otherwise
- Filter chips: *All · Stuck (overdue OR blocked) · Mine · By relationship*
- Sort: *Most overdue · Soonest due · Recently touched*

### `/relationships` — from 5-line stub to journey-aware list
Reads `relationship_journey` (one row per relationship with stage/temperature/drift/primary service pre-joined).
- Card per relationship: name · pipeline stage chip · temperature dot · drift indicator · primary service · current SweetCycle stage
- Filter chips: *Stage · Temperature · Drift risk · Has subscription*
- Sort: *Stage progression · Temperature · Drift risk · Recently touched*
- Empty state with "Add relationship" CTA

### `/tasks` — from 5-line stub to operator workspace
Reads `tasks` joined with `work_context` (tags, relationship, component contributions) + `task_blockers` (resolved blocker names).
- Group-by toggle: *Status · Relationship · Operator · Due bucket*
- Each row: name · status chip · due chip · operator chip · relationship chip · inline blocker chain (when blocked)
- Filter chips: *Mine · Blocked · Overdue · Unscheduled*
- Drag-to-status reusing `<StageSwimlanes>` when grouped by status

### `/components` — pipeline-aware
Reads `components` joined with `component_build_pipeline`. Each row shows:
- Name · current maturity level chip
- Activity chips: **active projects · active tasks · last touched**
- Sort: *Most-moved this week · Maturity · Alphabetical*
- Filter chips: *All · Active · Stalled (no activity 30d) · By domain*

## What this builds

**No migration.** All four views already exist.

**New components**
- `src/components/rollup-stat-chip.tsx` — small numeric chip with tone (neutral/amber/red) used across all four pages.
- `src/components/heat-ring.tsx` — colored border-ring wrapper for cards based on overdue/blocked state.

**Edited routes**
- `src/routes/_app.projects.index.tsx`
- `src/routes/_app.relationships.index.tsx`
- `src/routes/_app.tasks.index.tsx`
- `src/routes/_app.components.index.tsx`

**Memory**
- `mem://design/views-as-truth.md` *(new)* — the hard rule + canonical view→page mapping so this doesn't regress.

## What's NOT in this step
- `/think/blockers` and `/think/wins` routes — Step 4.
- `<ReadyToAdvanceBadge>` — Step 5.
- Engagement plan + subscription rollups — Step 5.
- Sidebar reorg (Blockers + Recent wins entries) — moves to Step 4 when those routes exist.

## Why this order

Index pages are the daily entry point to entities. Today they're empty stubs that force users to click through to find anything useful. After this step, the four busiest list pages tell you *where the heat is* before you click. That's a far bigger daily-quality win than building the two new niche routes first.

Ready to ship Step 2.

