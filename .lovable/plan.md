
# Make Quest/Spark Cadence Configurable

You're right — the counts I referenced (e.g. "X quests per week", "Y sparks per journey") were arbitrary placeholders pulled from canon docs, not real product decisions. They shouldn't be hardcoded anywhere. And yes — the prior message was a Notion search query, not a build instruction, so I'm ignoring that part.

Here's how we resolve the cadence-numbers problem properly inside SweetBOS.

## The fix: cadence as tunable settings, not constants

Create a single source of truth for every "how many / how often" number in the transformation system, stored in the database, editable from the Settings page, and read by any UI or future logic that needs them.

### 1. New table: `cadence_settings`
One row per tunable variable. Key/value with type + scope so we can add new knobs without migrations.

Columns:
- `key` (text, unique) — e.g. `sparks_per_journey_target`, `quests_per_mission_target`, `sessions_per_week_target`, `spark_completion_window_days`, `quest_duration_weeks_default`, `mirror_refresh_days`
- `label` (text) — human name shown in Settings
- `description` (text) — what this controls
- `value_number` (numeric) — the tunable value
- `min` / `max` / `step` (numeric, nullable) — for the slider/stepper UI
- `category` (text) — `sparks` | `quests` | `journeys` | `missions` | `sessions` | `mirror` so Settings can group them
- `updated_at`, `updated_by`

Seeded with the full canonical set on first migration so the table is never empty.

### 2. Settings → new "Cadence" tab
Add a third tab next to Profile and Team:
- Grouped by category with section headers
- Each setting renders as a labeled stepper or slider with description underneath
- Inline save on blur; toast on success
- Admin-only edit; everyone can view

### 3. Read path
A small typed hook `useCadence()` returns a memoized map of all settings, fetched once via TanStack Query and cached. Anywhere a number is needed (entity defaults, dashboard targets, future progress bars on Journeys/Missions), components call `useCadence().sparksPerJourneyTarget` instead of hardcoding.

### 4. Strip arbitrary numbers from current code
Sweep `src/lib/entities.ts`, dashboard files, and any chip/badge that currently shows a literal target. Replace with either the cadence value or remove entirely if no real logic depends on it yet. (Most of these don't exist yet in code — this is mostly preventative for the upcoming Phase 2 work.)

### 5. RLS
- SELECT: any authenticated user
- UPDATE: admin only (via `has_role(auth.uid(), 'admin')`)
- No INSERT/DELETE from client — seeded values only; new keys added via migration as we discover them

## What this gives you
- Every "how many" number lives in one place
- Liz can tune cadence per her own practice without a code change
- When Phase 2 ships Capture + dashboards C–H, they'll read these values automatically — no hardcoded targets sneaking in
- Future per-client overrides are a clean extension (add a `relationship_id` nullable column later)

## Build order
1. Migration: `cadence_settings` table + RLS + seed rows
2. `useCadence` hook + query
3. Settings "Cadence" tab UI
4. Sweep existing files for stray hardcoded cadence numbers; replace or remove
