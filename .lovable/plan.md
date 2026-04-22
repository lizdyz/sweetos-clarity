

# Phase 2.10f: Service shape, maturity ladder, decoupled taxonomies, due-date discipline

You're asking for four things at once. They're tightly related, so they ship as one pass.

## What you're asking for (restated)

1. **Service shape clarity** — A contact may have bought *Mirror only*, or *Mirror + Machine*, or be a candidate for one. The system should show, per relationship: which service(s) they have, what stage each is in, what components/capabilities/outcomes we're driving toward, and **what package we'd recommend** if they don't have one yet.
2. **Decouple Domains from Tenets** — Right now they're often co-tagged or shown side-by-side as if interchangeable. Domains are universal (22 across all businesses). Tenets are industry-scoped (22 per industry). They are **independent axes** and the UI should stop conflating them.
3. **L1→L5 thresholds with checklists** — For every Domain, every Tenet, every Component: a defined checklist of what must be true to *pass* each maturity level. Today `excellence_rubric.checklist_items` exists but is sparsely populated and the UI doesn't use it as a pass/fail gate.
4. **Due dates everywhere** — Every actionable record (sessions, tasks, plans, services, components-in-flight, sparks) needs a due date and a "when done" stamp. Many already have date fields; we're not surfacing or enforcing them.

## What lands in 2.10f

### Part A — Service shape per relationship

**Schema (1 small migration):**
- `relationships.service_package` enum: `Mirror Only | Mirror + Machine | Machine Only | Map | None`. Computed default from existing `engagement_services` rows; editable.
- `relationships.recommended_package` enum (same values) — editable hint, not auto-set.
- `relationships.recommendation_rationale text` — short note on *why* we'd recommend it.
- `engagement_services` already has `service_type`, `status`, `sessions_purchased`, `sessions_used`. Add `target_completion_date date`.

**UI on relationship detail (`/_app/relationships/$id`):**
- New top-of-page **"Service Shape"** strip with 3 columns:
  1. **Has** — chips for each `engagement_services` row: type · status · sessions used/purchased · target date.
  2. **Recommended** — `recommended_package` selector + rationale textarea (inline edit).
  3. **Driving toward** — pulls from the relationship's tagged components + open outcomes; shows component name → current maturity level → target level → due date.
- The existing SweetCycle 5-column board stays, but is grouped *per service* when there are multiple services (so Mirror sessions and Machine sessions don't pile into the same Seed column).

**On `/_app/flightdeck`:**
- Each relationship card now shows a service-package badge ("Mirror Only" / "M+M" / "Machine") next to the temperature dot.
- New filter chip row: `All | Mirror only | Mirror + Machine | Machine | Unscoped`.

### Part B — Decouple Domains from Tenets in the UI

The schema is already correct (independent `tagged_domains` and `tagged_tenets` arrays everywhere). The fix is purely UI/affordance:

- **Two separate chip groups** (never one combined row) on every entity detail page that has both: components, projects, tasks, campaigns, sparks, missions, decisions, delegation, documents, outcomes, personas, playbooks, journeys.
- Group A: **Domains** (universal · 22) — left, with the universal domain color.
- Group B: **Tenets** (industry · 22 per industry) — right, with a category dot (Foundation / Specialization / Advanced / Mastery).
- Each group has its own `+ Add` popover. Removing a chip writes only to its own column.
- Filter rows on every list page split into **two** parallel selects (Domain, Tenet) — already done on `/_app/components`, now extended to: projects, sparks, tasks, campaigns, missions, decisions, delegation, documents, outcomes, personas, playbooks, journeys, sessions.
- Memory: append a Core rule "Domains and Tenets are independent axes — never co-render in a single chip group, never combine in a single filter."

### Part C — L1→L5 maturity ladder with checklists

The `excellence_rubric` table already supports per-(subject, level, perspective) `checklist_items`. We make it usable end-to-end.

**Settings tool (`/_app/settings/excellence` already exists):**
- Already supports editing checklist items per cell. Add a **"Seed defaults"** button per subject that pre-fills L1→L5 across the 5 Ps with starter checklists (one per row, editable). Starter content is generated from a per-subject template — sensible for Foundation tenets (e.g. F1 Strategic Vision: L3 = "Vision document exists", L4 = "Vision drives quarterly OKRs", etc.).

**Maturity Map on relationship detail (`excellence-matrix.tsx`):**
- Each cell stays click-to-cycle for the *current* level (already shipped).
- Click the cell's **info icon** → opens a side sheet showing:
  - Current level (e.g. L3 Launching).
  - **Checklist for current level** — items from `excellence_rubric.checklist_items`, each rendered as a checkbox.
  - **What's needed to reach L4** — checklist for the next level, also as checkboxes.
  - Each checked item writes to a new lightweight table `excellence_checklist_progress (relationship_id, rubric_id, checklist_item_index, checked, checked_at, checked_by)` — so we capture *which specific items* are passed, not just the level.
- A cell only auto-advances to the next level when **all checklist items at the current level are checked** (with a manual override toggle for ops).

**Component detail (`/_app/components/$id`):**
- Same checklist sheet, scoped to `subject_kind='component'`. Each component now has an explicit "what makes this an L5 component" definition.

**New view `maturity_threshold_progress`** for dashboards:
`(subject_kind, subject_id, relationship_id, current_level, items_passed_at_level, items_total_at_level, ready_to_advance bool)`.

### Part D — Due dates, "done", and timeline

**Audit of date fields (already in schema):**
- `tasks.due_date`, `sessions.scheduled_at`, `engagement_plans.start_date/end_date`, `engagement_services.start_date/end_date`, `projects.deadline / next_action_due`, `campaigns.deadline`. All already exist; many are unused.

**New fields where missing:**
- `sparks` → add `due_date date` + `done_at timestamptz`.
- `outcomes` → already has `measured_date`; add `target_date date` (when we're aiming to hit it) and `done_at timestamptz`.
- `engagement_services` → add `target_completion_date date` (covered in Part A).
- `excellence_checklist_progress.checked_at` covers "done" for checklist items.

**UI additions:**
- Every entity detail page gets a small **"Timeline"** strip under the title: `Created · Started · Due · Done`. Empty fields render as inline date pickers.
- Every list/board view shows a due-date chip on cards (color-coded: gray=no date, green=on track, amber=≤7 days, red=overdue).
- New `/_app/flightdeck` panel: **"Due this week"** — every record across the system with `due_date BETWEEN today AND today+7`, grouped by entity type, ordered by date.
- **"Done log"** panel on Flightdeck — last 14 days of records that flipped to a done state (status='Done' OR `done_at IS NOT NULL`), grouped by day.

### Part E — "Every entity works" sweep

You said *"please make sure every entity works."* Quick verification pass + fixes:

- Every list page (`/_app/<entity>`): create button works, filters work, search works, row click navigates to detail.
- Every detail page (`/_app/<entity>/$id`): all editable fields actually save; tag chips (domains, tenets, components) all save; relationship-back-links navigate correctly.
- Every entity participates in the proposal/queue flow (it does in schema; verify the Capture → Queue → Confirm path actually creates the record for each `entity_type`).
- Operator picker (shipped in 2.10e) replaces every legacy assignee dropdown — sweep `tasks`, `projects`, `sessions`, `campaigns`, `delegation` detail pages.
- Fix any `<Select>` empty-state crashes (TanStack route loaders that fail when a list is empty).

This is targeted cleanup, not a rewrite — ~1 fix per entity on average.

## Files touched (high-level)

- 1 migration: `<ts>_service_shape_and_maturity_thresholds.sql` — adds `relationships.service_package / recommended_package / recommendation_rationale`, `engagement_services.target_completion_date`, `sparks.due_date / done_at`, `outcomes.target_date / done_at`, new table `excellence_checklist_progress`, new view `maturity_threshold_progress`, RLS for the new table.
- New: `src/components/service-shape-strip.tsx`, `src/components/maturity-threshold-sheet.tsx`, `src/components/timeline-strip.tsx`, `src/components/due-date-chip.tsx`, `src/components/domain-tenet-chips.tsx` (the canonical "two separate groups" widget).
- Edits: `src/routes/_app.relationships.$id.tsx` (Service Shape strip + per-service SweetCycle grouping + Maturity sheet wiring), `src/routes/_app.flightdeck.tsx` (service badge + filter + Due-this-week + Done-log panels), `src/routes/_app.components.$id.tsx` (threshold sheet + timeline strip), `src/routes/_app.settings.excellence.tsx` (Seed defaults button), and 12-ish list/detail pages getting the dual filter row + timeline strip + due-date chip.
- Memory:
  - New `mem://features/service-shape.md` — package taxonomy, recommendation rationale, per-service SweetCycle grouping rule.
  - New `mem://features/maturity-thresholds.md` — checklist-driven L1→L5 advancement, `excellence_checklist_progress` table, auto-advance gate.
  - Append `mem://index.md` Core: "Domains and Tenets are independent axes — never co-render in a single chip group; filters are always two parallel selects."
  - Append `mem://index.md` Core: "Every actionable record carries a due date and a done stamp; surface both on detail pages and lists."

## What I'm NOT doing in 2.10f

- Auto-recommending the best package via AI heuristics — `recommended_package` is editable now, AI suggestion is a follow-up.
- Backfilling `excellence_checklist_progress` from old `excellence_scores` notes — checklist progress starts fresh.
- Building per-tenet starter checklists for all 22 industry tenets — Seed defaults ships content for the 8 Foundation tenets + 22 universal Domains + the 8 components seeded in 2.10d. Specialization/Advanced/Mastery tenets get an empty-but-editable shell.
- Calendar view for due dates — list/chip view first; calendar is a follow-up.
- Touching `journeys` Library entity (separate concept).

## Suggested order after this

1. **2.10f (this plan)** — service shape + thresholds + decouple + due dates.
2. **AI package recommender** — auto-suggest `recommended_package` based on intelligence_summary + maturity gaps.
3. **Best-Practice Catalog** (still queued).
4. **Agent runtime** + skill-based routing.
5. **Notion sync**.

