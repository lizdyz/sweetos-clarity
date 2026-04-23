---
name: today-as-decision-surface
description: Today (/today) is a decision surface, not a dashboard — Decision Bar + Live Signals + Next-Best-Actions on top, browse panels collapsed below.
type: design
---

# Today = decision surface

`/today` answers ONE question on open: *"What's the best next thing I can do right now, and why?"*

It is **not** a dashboard. It is the morning trigger that routes Liz into the cockpit she actually needs.

## Final page order (top → bottom)

1. **Decision Bar** (`<TodayDecisionBar>`) — synthesized one-liner ("3 handoffs · 2 overdue · 1 KTI fired") + a single **Start with** CTA pointing at the #1 ranked action + Snooze 1h / Hand off / Show me 5 more
2. **Live Signal Strip** (`<LiveSignalStrip>`) — merged 24h horizontal feed: 🔥 KTI fires · ⚙ inbound handoffs · 📡 inbound_signals
3. **Master Story Trail** — kept (provides the 'where am I in the story' context)
4. **Next-Best-Actions** (`<TodayNextActions>`) — top 8 ranked rows with one-line *why*, action buttons (Open / Accept / Decline / Snooze / Hand off), and walk-menu
5. Awaiting approval + Maturity wins ready (kept, secondary)
6. OCDA + Decision Queue + Sandbox tiles (kept, demoted — these are navigation, not triage)
7. **`<Collapsible>` "Browse all open work"** — the original Overdue/Today/Week/Blocked/Sessions/Wins 6-panel grid, collapsed by default

## Ranker (deterministic, no AI in Wave 4)

`src/lib/today-ranker.ts` — pure function. Priority weights:

| Source | Base score | Boost |
|---|---|---|
| Inbound handoff (`pending`) | 100 | +0.5/hour age, capped 20 |
| Workflow approval (`awaiting_approval`) | 80 | +0.5/hour age, capped 15 |
| Overdue task | 60 | +5/day overdue, capped 30 |
| KTI fire last 24h | 50 | -1/hour age (recency favored) |
| Scheduled today | 30 | none |

Dedupe: same `(subject_kind, subject_id)` across sources keeps the **higher** score.

**Sparks are excluded.** They are system-generated and live in `/sparks` (see `mem://design/canon-sparks-vs-tasks.md`).

## Operator resolution

`useMeOperator()` (in `src/lib/use-me-operator.ts`) reads `auth.uid()` and looks up `operators` where `profile_id = uid AND kind = 'human'`. If no row exists, the Decision Bar shows "Showing all open team work · Link your account to an Operator" with a deep link to `/operators`.

The same hook is the canonical "who am I as an operator" resolver — Flightdeck and any future personalized surface MUST reuse it (no parallel implementations).

## Rules — what NOT to put on Today

- ❌ No Sparks (they belong in `/sparks` — system-generated, not human-actionable from here)
- ❌ No filters / 5 P pills (the page is already filtered to "what's relevant *right now*")
- ❌ No new entity creation surfaces (capture has its own room; Today is for routing existing work)
- ❌ No charts or analytics (those are for Flightdeck)
- ❌ No second decision bar — there is exactly ONE Start-with CTA per open
- ✅ Walk-menu mounts on every Next-Best-Action row (six verbs, never extended)

## Snooze semantics

Wave 4 implements Snooze for **tasks only** — writes `not_before = now() + 1h`. Other subject kinds show a disabled tooltip "Snooze available on tasks for now". Cross-entity snooze is deferred.

## Data sources (views are truth)

- `time_grid` — overdue, scheduled today, browse grid
- `operator_handoff_inbox` — Wave 3 handoff feed
- `workflow_step_pipeline` — awaiting_approval rows
- `kti_scans` joined to `key_trend_indicators` — fired-in-24h
- `inbound_signals` — pending/classified in last 24h
- `recent_done_log` — wins panel
- `maturity_threshold_progress` — wins ready to claim

Never re-derive from raw tables in JS (see `mem://design/views-as-truth.md`).
