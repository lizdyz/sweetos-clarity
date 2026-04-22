

# Phase 2.10v — Surface the views that already know things. Stop asking the same question twice.

You're right. There are **13 database views** quietly doing serious work, and most of the app ignores them. We've been re-querying raw tables and re-deriving in JS what the database already pre-sorts. Here's the audit and what to change.

---

## What's hiding in plain sight (database views, today usage)

| View | What it pre-sorts | Used by | Missed value |
|---|---|---|---|
| `time_grid` | All actionable records (task/project/session/campaign/spark/decision) unified by date axis | **nothing** | Today + Planner + Calendar should *all* feed from this. Currently each re-derives from raw tables, missing sessions/sparks/decisions. |
| `work_context` | Per-entity tagging + relationships + blockers + which components it's building | **nothing** | Detail pages, Components, Domains all want this. Blocker chains visible nowhere. |
| `task_blockers` | What's blocking what (resolved names, not IDs) | **nothing** | "Why is this stuck?" answered in zero clicks instead of three. |
| `recent_done_log` | Unified 14-day "what shipped" feed across tasks/projects/sessions | Flightdeck only | Today's "Wins this week", Relationship detail "Recent activity", weekly review. |
| `operator_workload` | Open/blocked/overdue per operator + next due | Operators, People | Flightdeck operator view, Project owners, Today "team status." |
| `component_build_pipeline` | Active projects + tasks per component | **nothing** | Components index = a dead list today. Should show "what's actively moving this." |
| `workflow_step_pipeline` | Step DAG + run status + approvals waiting | Flightdeck only | Today's "needs your approval", Workflow detail. |
| `maturity_threshold_progress` | "ready_to_advance" boolean per rubric | **nothing** | Domain detail + SweetCycle should highlight thresholds you've earned. |
| `engagement_service_rollup` | Sessions total/shipped/in-flight + completion % per service | **nothing** | Engagement Plan detail, Relationship subscription card. |
| `project_rollup` | Total/open/blocked/overdue per project + next due | **nothing** | Projects index = dead list. Should show heat. |
| `relationship_journey` | Stage + temperature + drift + primary service in one row | **nothing** | Relationships index, Pipeline cards, SweetCycle header. |
| `measure_health` | Status colour per measure | MeasuresPanel | (already good) |
| `relationship_domain_maturity` | L1–L5 per (relationship, domain) | (already good) | (already good) |

**The pattern:** ~70% of the intelligence is already computed. The UI just isn't reading it.

---

## What to build (one cohesive pass)

### 1. Fix Today and Planner to feed from `time_grid` + `recent_done_log`

**Today** currently shows tasks only. After: tasks · sessions · sparks · decisions · campaigns, all unified by date, with **Wins this week** (from `recent_done_log`) and **Awaiting your approval** (from `workflow_step_pipeline` where `run_status = 'awaiting_approval'`) as new sections. One query replaces four.

**Planner** currently lanes only tasks/projects/campaigns. After: same lanes, but populated from `time_grid` so sessions and sparks land where they belong on the week.

### 2. Two new "pre-sorted" surfaces nobody knew were possible

**`/think/blockers`** — *"What's stuck and why."* Reads `task_blockers` joined to `tasks`. Lists every open task with its blocker chain resolved (names, not IDs), grouped by relationship. One click to open either side. This is the page that answers "why isn't this moving?" — currently invisible.

**`/think/wins`** — *"Recent done."* Reads `recent_done_log` (last 14 days, all entity types). Filterable by relationship, operator, kind. The weekly-review surface that doesn't exist today. Lives under THINK group next to Decisions.

### 3. Make dead index pages alive (zero new tables, just join the views)

- **`/components`** — join `component_build_pipeline` so each row shows *active projects · active tasks · current maturity*. Sort by "most-moved this week."
- **`/projects`** — join `project_rollup` so each row shows *open · blocked · overdue · next due · owners*. Surface a "Stuck" filter chip (overdue > 0 OR blocked > 0).
- **`/relationships`** — join `relationship_journey` so each row shows *stage · temperature · drift · primary service · current SweetCycle stage* without N+1 queries.
- **`/operators`** — already uses `operator_workload` (good); add the same workload chips to **People** and **Flightdeck operator cards** so the heatmap reads everywhere.

### 4. Surface "ready_to_advance" — the maturity moment

`maturity_threshold_progress.ready_to_advance` is computed and ignored. Add:
- A pulsing **"Ready to advance"** badge on Domain detail, SweetCycle journey card, and Today (a new section "Maturity wins ready to claim"). One click → opens the rubric so Liz checks the box and the level moves.

### 5. Engagement Plan + Subscription get the rollup they need

- **`/engagement-plans/$id`** — render each service with `engagement_service_rollup` (sessions total/shipped/in-flight, completion %, next session date). The "is this delivery on track?" question answers itself.
- **`<SubscriptionCard>`** (already on relationship detail) — add the rollup so subscription = *tier + sessions remaining (from rollup, not just the manual counter) + next session date + completion %*.

### 6. Sidebar: small reorg to surface the new surfaces

Add to **THINK** group:
- **Blockers** (new — `/think/blockers`)
- **Recent wins** (new — `/think/wins`)

Rename the group caption from "Registers & analysis" to "Patterns & blockers" so the verb-first IA holds.

### 7. Memory updates so this doesn't regress

- `mem://design/views-as-truth.md` *(new)* — Hard rule: list/detail pages prefer views over re-deriving from raw tables. List the 13 views and their canonical use sites.
- Update `mem://design/sidebar-ia.md` — add Blockers + Recent wins under THINK.

---

## What this builds

**No migration.** Zero new tables. Zero new views. Just consume what's already there.

**New routes (2)**
- `src/routes/_app.think.blockers.tsx`
- `src/routes/_app.think.wins.tsx`

**New components (3)**
- `src/components/blocker-chain.tsx` — renders a task's blocker chain inline.
- `src/components/wins-feed.tsx` — `recent_done_log` rendered as a timeline.
- `src/components/ready-to-advance-badge.tsx` — pulsing chip with one-click open.

**Edited**
- `src/routes/_app.today.tsx` — switch to `time_grid` + add Wins + Awaiting approval + Ready-to-advance sections.
- `src/routes/_app.planner.tsx` — switch to `time_grid`; sessions/sparks land on lanes.
- `src/routes/_app.components.index.tsx` — join `component_build_pipeline`; add "most-moved" sort.
- `src/routes/_app.projects.index.tsx` — currently 5 lines, build it out using `project_rollup`.
- `src/routes/_app.relationships.index.tsx` — currently 5 lines, build using `relationship_journey`.
- `src/routes/_app.tasks.index.tsx` — currently 5 lines, build using `work_context` + `task_blockers`.
- `src/routes/_app.operators.index.tsx` — keep workload, add overdue chip.
- `src/routes/_app.people.tsx` — add workload chips per operator.
- `src/routes/_app.engagement-plans.$id.tsx` — render `engagement_service_rollup` per service.
- `src/routes/_app.relationships.$id.tsx` — `<SubscriptionCard>` reads rollup; `<ReadyToAdvanceBadge>` per domain.
- `src/routes/_app.domains.$slug.tsx` — `<ReadyToAdvanceBadge>` per active rubric row.
- `src/routes/_app.sweetcycle.tsx` — `<ReadyToAdvanceBadge>` on stage cards where applicable.
- `src/components/app-sidebar.tsx` — add Blockers + Recent wins under THINK.

**Memory**
- `mem://design/views-as-truth.md` *(new)* — the 13 views and where each must be used.
- `mem://design/sidebar-ia.md` — add the two new entries.

---

## Why this is the right pass

You said: *"there's already pre-sorted views that are gonna help us in ways we never knew were possible."* Exactly right. The intelligence is in the database. Every screen that re-derives blocker logic, due-grouping, or rollups in JS is **slower, less consistent, and missing entities** because raw-table queries forget about sessions/sparks/decisions. Switching to views fixes correctness *and* unlocks two surfaces (Blockers, Wins) that genuinely don't exist anywhere yet.

It's also a cheap pass — no migration, no new tables, no AI cost. Pure UI plumbing into work already done.

## Suggested order

1. **Today + Planner switch to `time_grid`** + add Wins / Awaiting approval / Ready-to-advance. *Highest daily-value win.*
2. **Build out the three skeletal index pages** (`/projects`, `/relationships`, `/tasks`) using rollup views.
3. **Components index reads `component_build_pipeline`** + new "most-moved" sort.
4. **New `/think/blockers` + `/think/wins`** routes + sidebar entries.
5. **Engagement plan + subscription rollups + Ready-to-advance badges** across Domain / SweetCycle / Relationship detail.

Each step is independently shippable. Approve and I start at #1.

