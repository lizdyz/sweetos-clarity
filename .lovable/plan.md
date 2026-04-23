# Wave 15 — Page-by-page audit to 10/10, run by the system itself

You already have the auditor. It's at `/settings/ux-audit`, it scores routes against canon, and it's the headline KPI surface. The problem isn't capability — it's **coverage, criteria, and follow-through.** This wave turns the auditor from a tool you remember to use into a campaign that walks every page to 10/10.

## The core idea

Every route gets a **canonical purpose**, a **clarity score**, and a **next action** — stored, not implied. The auditor already produces findings; we make those findings *the actual to-do list* with assignees, due dates, and a visible cockpit that ranks every page from worst to best until the whole app sits at 10/10.

## Part 1 — Give every page a canonical purpose (`route_canon`)

New table — one row per route, the canon for what that page is *for*:

```sql
create table public.route_canon (
  route_path text primary key,            -- '/tasks', '/relationships/$id'
  display_name text not null,             -- 'My Tasks'
  classifier text not null,               -- entity_detail | actionable_detail | index | operate | library | settings | other
  one_liner text not null,                -- "Triage and execute work assigned to me"
  primary_job text not null,              -- "Move a task from inbox to done in <60s"
  what_good_looks_like text[] default '{}',
  must_have_components text[] default '{}', -- ['CanonGuardrail','TimeControls','MeasuresPanel']
  must_not_have text[] default '{}',
  related_canon_kinds text[] default '{}',
  status text default 'draft'             -- draft | defined | needs_review
);
```

The existing `ROUTE_CLASSIFIER` and `PRESENCE_RULES` constants in the ux-audit edge function get **migrated into this table** so they're editable from the admin UI, not buried in code. Every new route requires a `route_canon` row before it can ship — the auditor refuses to score a route without one (forces intentionality).

## Part 2 — Auditor v2: clarity, ease, purpose-fit (3 new axes)

Current axes: hierarchy · density · states · a11y · canon. We add three:


| Axis          | What it measures                                                        | How                                                      |
| ------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| `purpose_fit` | Does the page deliver its `primary_job` in <3 clicks from landing?      | AI judges against `route_canon.primary_job`              |
| `clarity`     | Can a new user explain what this page is for in one sentence after 10s? | AI scores headline + sub-copy + first-screen affordances |
| `ease`        | Number of clicks/fields to complete the primary job                     | AI counts; deterministic floor                           |


The 10/10 target = **all 8 axes at 5/5 + 0 canon misses**. Stored as `total_score = sum(axes) + (5 if canon_misses=0 else -10)`. Easy ranking.

## Part 3 — Findings become tasks (the follow-through loop)

Right now `ux_audit_runs.findings[]` is a JSON blob you read once and forget. Change:

- New table `ux_audit_findings` — one row per finding, with `status` (open · acknowledged · in_progress · fixed · wont_fix), `assignee_operator_id`, `due_date`, `fixed_by_run_id`.
- When a run inserts findings, dedupe against open findings on the same route — same `rule_name` + `axis` + similar `description` collapses to existing row, bumps `last_seen_at`.
- A finding fixed in a later run auto-closes (by absence). Resurfaces if it comes back.
- Each finding can be promoted to a real `task` with one click — `task_provenance` records `audit_finding_id`.

Now the auditor isn't a report — it's a backlog that closes itself when fixes ship.

## Part 4 — `/settings/ux-audit` becomes the "Path to 10/10" cockpit

Redesigned cockpit, three sections:

```text
┌─ PATH TO 10/10 ────────────────────────────────────────┐
│ App score: 6.4 / 10   ▲ +0.3 vs last week              │
│ Routes at 10/10: 4 / 47                                │
│ Open findings: 138 (24 high · 71 med · 43 low)         │
│ Canon misses: 19  ← headline KPI                       │
└─────────────────────────────────────────────────────────┘

┌─ WORST FIRST (sortable) ────────────────────────────────┐
│ /flightdeck       3.2  18 findings  ▶ Run audit · Open │
│ /sweetcycle       3.8  14 findings                     │
│ /library/jtbd/$id 4.1  11 findings                     │
│ ...                                                    │
└─────────────────────────────────────────────────────────┘

┌─ BULK RUNNER ──────────────────────────────────────────┐
│ [ Run all stale (>7d) ]   [ Run all <8.0 ]   [ Run all ]│
│ Concurrency: 3  ETA: ~4 min                            │
└─────────────────────────────────────────────────────────┘
```

Click any route → existing per-route detail card, now with the finding list as an **interactive backlog** (assign, due-date, promote-to-task).

## Part 5 — Auditor runs itself (Gap-Closer for pages)

The Gap-Closer cron from Wave 14 already runs every 6h. Hook into it:

- Each pass picks the **5 stalest routes** (no audit in >7d OR score <8.0) and queues them.
- New server route `api/public/hooks/ux-audit-batch.ts` — accepts an array of route paths, runs the existing edge function in parallel (concurrency 3, AI-rate-limit-aware).
- Results flow into `ux_audit_runs` + `ux_audit_findings` like any manual run.
- A new `agent` Spark fires when a route regresses (score drops by >0.5 between runs) — surfaces in your existing triage gesture.

So the audit doesn't depend on remembering to click "Run."

## Part 6 — Per-page Canon Guardrail upgrade

`<CanonGuardrail>` already shows the entity canon checklist on detail pages. Extend it to also show the **route canon**:

- Tiny chip on every page header: `Page score: 7.2/10 · 4 open findings ·  ▶ Audit`
- Click → opens a slide-over with the page's `route_canon`, the latest audit, and the open findings.
- For admins only — invisible to end users.

Now the cockpit isn't a destination; the score follows you onto the page being scored.

## Files

**Migration (one):**

- `route_canon` table + seed all ~95 routes from `src/routes/` (script reads the file tree, classifies each, assigns sensible defaults; admin curates from there).
- `ux_audit_findings` table + backfill from existing `ux_audit_runs.findings` JSON.
- `total_score` generated column on `ux_audit_runs`.
- Three new prompt rows in `system_prompts`: `ux.audit.purpose_fit`, `ux.audit.clarity`, `ux.audit.ease`.

**Edge function:**

- `supabase/functions/ux-audit/index.ts` — read `route_canon` for the target route, score new axes, write findings to `ux_audit_findings` with dedup.

**New server route:**

- `src/routes/api/public/hooks/ux-audit-batch.ts` — HMAC-protected, runs N audits in parallel, called by gap-scanner.

**New components:**

- `src/components/audit-cockpit.tsx` — Path-to-10/10 overview (replaces top of `/settings/ux-audit`).
- `src/components/audit-finding-row.tsx` — interactive finding (status, assign, promote-to-task).
- `src/components/route-score-chip.tsx` — page-header chip showing live score + drawer.

**Edited:**

- `src/routes/_app.settings.ux-audit.tsx` — new cockpit layout, finding backlog UI, bulk runner.
- `src/components/canon-guardrail.tsx` — mount `<RouteScoreChip>` for admins.
- `src/routes/api/public/hooks/gap-scan.ts` — call `ux-audit-batch` for stale routes.
- `src/routes/_app.settings.canon.tsx` — add a "Routes" tab editing `route_canon` rows.

**Memory:**

- `mem://design/route-canon.md` — every route has a row in `route_canon` before it ships. The auditor refuses to score routes without canon.
- `mem://features/path-to-10.md` — the 8-axis scoring model + finding lifecycle + auto-run cadence.

## Sequencing

1. Migration: `route_canon` + seed all routes + `ux_audit_findings` + 3 new prompts (~20%)
2. Edge function v2: read route_canon, score 3 new axes, dedup findings (~20%)
3. Cockpit redesign: Path-to-10/10 overview + worst-first table + bulk runner (~20%)
4. Finding backlog UI: status, assign, due, promote-to-task (~15%)
5. `<RouteScoreChip>` in CanonGuardrail + Routes tab in `/settings/canon` (~10%)
6. `ux-audit-batch` server route + Gap-Closer hookup + regression Spark (~15%)

## Not in this wave

- No new top-level routes
- No sidebar changes
- No automatic *fixes* — auditor proposes, humans/agents execute (existing task pipeline)
- No A/B testing or analytics integration (separate wave)
- No edits to auto-generated files

## After Wave 15

- Every route has a stated purpose, primary job, and 10/10 criteria — visible to admins on the page itself.
- The auditor scores 8 axes including clarity, ease, and purpose-fit — not just canon presence.
- Every finding is a tracked, assignable, closable backlog item with task-promotion.
- Stale and low-scoring routes get re-audited every 6h automatically. Regressions fire Sparks.
- One screen — `/settings/ux-audit` — tells you exactly which page to fix next and ranks the whole app from worst to best until everything sits at 10/10.

Reply **"Run Wave 15"** to ship in this order, or **"Just route_canon + the new cockpit first"** to land the foundation before the auto-run loop.  
  
  
can you create the ability to have the control panel do this without me wasting tokens to talk to you to do it - i am very confused with the new additions at the top of the page i wanted that which page you were on you over index to help that page collect info more as its likely relevant to that page