

# Phase 2.10d (continued): Seed the canvas + Component dual filters + Maturity cell-cycle

Picking up where the last pass left off. Drag-everywhere is live; now we fill it with real data and finish the inline-editing surfaces.

## Part B — Seed migration (idempotent)

One migration that uses `ON CONFLICT DO NOTHING` keyed on natural keys (name + relationship_id, or name alone for components) so re-runs are safe.

**Relationships (5)**
- Bedros Sarkissian (SFG) — `pipeline_stage='Pre-Mirror'`, `temperature='Warm'`, `primary_service='Mirror'`.
- DD Humes (Guillaume + Matthew) — `pipeline_stage='Pre-Engagement'`, `temperature='Warm'`, `current_blocker='Awaiting Pathway decision (Mirror vs Mirror+Machine)'`.
- McLeod Financial (Stuart, Katie, Ricardo) — `Pre-Mirror`, `Warm`, `primary_service='Mirror'`, `intelligence_summary` notes succession spine.
- Savoir Wealth (Steven + Jennifer) — `Pre-Mirror`, `Warm`, `intelligence_summary` lists 5 surfaced domains.
- Angela / Recruiter Intelligence — `In-Engagement`, `primary_service='Machine'`, `service_status='Active'`.

**relationship_portals (5)** — one row per uploaded HTML portal, `kind` mapped (Pre-Mirror / Pre-Engagement), `version='v1'`, `url` set to the file name placeholder, `notes` carrying the headline insight from each portal.

**Engagement plans + services + sessions**
- Bedros: Plan "SFG Machine Sprint" → Service `Machine` → 4 sessions (Seed phase) named after the four Machine options.
- Angela: Plan "Recruiter Intelligence Build" → Service `Machine` → 1 session in `Session` phase.

**Components (8)** with `related_domains` + `related_tenets` populated, `current_maturity_level='L3 Launching'`, `quality_status='In Use'`:

| Component | Domain | Tenet |
|---|---|---|
| 22-Domain Mirror Assessment | strategy-positioning | F1 Strategic Vision & Purpose |
| Pathway Decision Worksheet | sales-discovery | S9 Client Discovery & Needs Analysis |
| 4-Option Machine Session Selector | service-delivery | F3 Operational Excellence |
| Succession Spine Map | analytics-ci | S15 Business Succession Planning |
| 5-Domain Quickscan | analytics-ci | A17 Data Intelligence & Analytics |
| SparkPath Clarity Call Interview Map | sales-discovery | S9 Client Discovery & Needs Analysis |
| Pre-Engagement Tools Bundle | onboarding-intake | F7 Client Experience Design |
| Recruiter Intelligence Dashboard | analytics-ci | A17 Data Intelligence & Analytics |

**Sparks (~12)** — every "next idea" mentioned across the 5 portals, each tagged to the correct relationship + domain + tenet, dropped into the Queue at `status='pending'`.

## Part C — Components ↔ Tenets ↔ Domains in the UI

- **`/_app/components` (list)**: add a filter row with two parallel `Select` filters — Domain (22 universal) and Tenet (22 industry, grouped by Foundation/Specialization/Advanced/Mastery). User can stack both. Active filters render as removable chips above the table.
- **`/_app/components/$id` (detail)**: add a top strip with two editable chip groups — Domains (left) and Tenets (right). Click chip to remove; "+ Add" opens a popover picker. Writes to `components.related_domains` / `related_tenets`. Small "Best fit" hint under each group computed from the most-frequent pairing across other components in the catalog.
- **`/_app/journey`**: add a fourth panel **"Components in flight"** — components with `updated_at >= now() - 14 days`, grouped by their first `related_domains[0]`, each row a clickable chip linking to the component detail.

## Part D — Maturity Map cell-cycle

On the relationship detail Maturity Map grid (`excellence-matrix.tsx` cells), make each cell click-to-cycle through `L1 Lacking → L2 Learning → L3 Launching → L4 Leveraging → L5 Leading → (clear)`. Writes to `excellence_scores` via the existing `useDragToStatus`-style mutation pattern, but field is `state` and table is `excellence_scores` keyed by `(relationship_id, rubric_id)` — upsert on conflict.

## Files touched

- 1 seed migration: `supabase/migrations/<ts>_seed_portal_canvas.sql` (idempotent inserts using `ON CONFLICT DO NOTHING` on natural keys; uses `INSERT … SELECT` patterns to look up domain/tenet IDs by slug/code so the migration is portable).
- Edit: `src/routes/_app.components.index.tsx` — dual filter row + chip strip.
- Edit: `src/routes/_app.components.$id.tsx` — domain/tenet chip-group editor + "Best fit" hint.
- Edit: `src/routes/_app.journey.tsx` — add "Components in flight" panel.
- Edit: `src/components/excellence-matrix.tsx` — cell click-to-cycle handler + optimistic update.
- Memory: append `mem://design/stage-as-board.md` capturing "every status field renders as a board where columns are draggable; heatmap cells cycle on click."

## What I'm NOT doing in this pass

- Parsing the HTML portals into structured trees (link + headline only).
- Best-Practice Catalog, Agents, Notion sync — still queued.
- Drag-and-drop on the Maturity Map (cell-cycle is the right gesture for a 5-state heatmap).

## Note on idempotency

The seed migration uses `WHERE NOT EXISTS (SELECT 1 FROM <table> WHERE name = … AND relationship_id = …)` guards rather than unique indexes, so it does not require schema changes and will not break if you've manually added any of these records already.

