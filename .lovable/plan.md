

# Wave 11 — Make SweetScan intuitive + reclaim Pipeline stages + collapsible SweetCycle peek

You're flagging three real things. All three are about the same instinct: information should appear *where you already are*, not on a separate page you have to remember to visit. Here's the fix.

## 1. SweetScan first surface = the Watchlist Dashboard (not a Forward Radar tab)

Right now `/sweetscan` opens to "Forward Radar" — a raw list of every KTI in the system. That's the *output*, not the dashboard. You should land on **what you've decided to watch** and how each watch is doing.

**New first tab — `Watchlist`:**

```text
┌─ SweetScan / Watchlist ────────────────────────────────────────────┐
│ 5 KTIs watching · 2 fired this week · 3 quiet · 1 needs config    │
│                                                                    │
│ ┌──────────────────────┬──────────────────────┬──────────────────┐│
│ │ 🔥 ACTIVE FIRES (2)  │ 👁 WATCHING (3)      │ ⚠ NEEDS SETUP   ││
│ │                      │                      │                  ││
│ │ • SaaS churn spike   │ • LinkedIn job posts │ • Funding alerts ││
│ │   3 clients hit      │   last scan 2d ago   │   no source set  ││
│ │   [Make Tasks →]     │   [Scan now]         │   [Configure]    ││
│ └──────────────────────┴──────────────────────┴──────────────────┘│
│                                                                    │
│ + Add KTI to watch    + Suggest from recent captures (3)          │
└────────────────────────────────────────────────────────────────────┘
```

**Then below**, the existing tabs as drill-downs: Forward radar (the firehose), Rubric scanner (active scan), World Watch (per-client lens), Signal inbox (results queue). The Watchlist is the *home*; the others are tools you reach for from it.

## 2. Capture → "You should SweetScan this" suggestion

You're right — when you drop a thing into Capture, the AI already classifies it. If it spots a *recurring pattern* or an *external trend signal* in what you dropped, it should propose adding a **new KTI to the Watchlist**, not just route it to a task.

**New flow:**
- Capture submission with content classified as `kind = trend_signal | external_observation` → AI generates a suggested KTI shape (name, search terms, threshold, trigger action).
- Suggestion appears in two places:
  1. **Inline in Capture** as a new chip on the proposal: `[+ Watch this in SweetScan]`
  2. **On the Watchlist dashboard** in the "Suggest from recent captures" pile.
- One click → opens a pre-filled KTI create sheet → confirm → it's now on your Watchlist.

This closes the loop: outside-in captures *become* outside-in scans.

## 3. SweetCycle as a collapsible peek on the Engagement Plan page

You're right that I overthought the tabs. Tabs hide context. **Make it a collapsible section on the same page**, expanded by default, that shows a compact 5-phase strip. Click "Expand →" to get the full board.

**New Engagement Plan detail layout:**

```text
┌─ Engagement Plan: Acme Q1 Map+Machine ─────────────────────────┐
│ [Anatomy current content unchanged]                            │
│ ────────────────────────────────────────────────────────────── │
│ ▼ SweetCycle rhythm                          [Expand to board] │
│ ┌──────┬──────────┬─────────┬──────┬──────┐                   │
│ │ Seed │ Synth    │ Session │ Sync │ Ship │                   │
│ │  2   │    1     │    1    │  3   │  4   │                   │
│ │ ●●   │   ●      │    ●    │ ●●●  │ ●●●● │                   │
│ └──────┴──────────┴─────────┴──────┴──────┘                   │
│ Next due: Sync recap for "Discovery #3" — Thu                  │
│ ────────────────────────────────────────────────────────────── │
│ ▶ Audit trail (collapsed)                                      │
└────────────────────────────────────────────────────────────────┘
```

- **Collapsed peek** = phase counts + next due item. Always visible.
- **Expand** = full SweetCycleBoard inline (no route change), or jump to `/engagement-plans/$id/sweetcycle` for full screen.

Same pattern for Audit (collapse it, since it's reference-only). Removes the tabs entirely → you see the whole engagement at a glance, expand only what you want.

## 4. Reclaim the Pipeline stages — surface them on Relationship + Flightdeck

The Pipeline route is dead, but the *stages* (Awareness → Pre-Engagement → Mirror → Map → Machine → Sync) are alive and powering Flightdeck. Two places they're underused:

**A. Relationship detail header — Stage stepper**

Currently the Relationship detail page doesn't visualize where this client sits in the journey. Add a compact stepper at the top:

```text
Awareness ──▶ Pre-Engagement ──▶ ●Mirror ──▶ Map ──▶ Machine ──▶ Sync
                                  ^ you are here · 14 days in stage
[Advance to Map →]   [Mark stalled]
```

Click any stage to drag/advance. This is the contact-level integration you're asking about — every relationship shows its place on the same shared pipeline that Flightdeck shows in aggregate.

**B. Flightdeck — already has swimlanes, add a sticky stage-health summary**

Above the swimlanes, a one-line health bar:

```text
Awareness 4 · Pre-Eng 3 · Mirror 2 · Map 5 ⚠ (3 stalled >30d) · Machine 4 · Sync 1
```

Click any segment to filter the swimlanes to just that stage. Surfaces "where am I bottlenecked" in one glance.

## Files

**Edited:**
- `src/routes/_app.sweetscan.tsx` — add `Watchlist` as first tab; reorder tabs; add "Suggest from recent captures" pile
- `src/routes/_app.engagement-plans.$id.tsx` — replace tabs with collapsible sections; SweetCycle peek expanded by default
- `src/routes/_app.relationships.$id.tsx` — add `<PipelineStageStepper>` to header
- `src/routes/_app.flightdeck.tsx` — add sticky stage-health summary bar above swimlanes
- `src/routes/_app.capture.tsx` — show "Watch this in SweetScan" chip when AI classifies as trend signal
- `src/components/engagement-plan-sweetcycle-tab.tsx` — add `compact` mode (counts + dots, no full board)

**New:**
- `src/components/sweetscan/watchlist-dashboard.tsx` — Active fires / Watching / Needs setup tri-pile
- `src/components/sweetscan/kti-suggestion-from-capture.tsx` — pre-fill KTI sheet from a capture row
- `src/components/pipeline-stage-stepper.tsx` — compact horizontal stepper (reusable on Relationship + future surfaces)
- `src/components/flightdeck-stage-health-bar.tsx` — clickable stage-count summary
- `mem://design/sweetscan-watchlist-first.md` — codify "Watchlist = home, Forward Radar = drill-down"

**Backend (additive, no migrations):**
- `supabase/functions/scan-signals/index.ts` — extend `classify_inbound` mode to also propose `suggested_kti` JSON when content matches trend-signal patterns. Stored on the existing `inbound_signals.classified_kind = 'trend_signal'` row plus a new `suggested_kti_payload` jsonb column (one tiny migration: `alter table inbound_signals add column suggested_kti_payload jsonb`).

## Sequencing

1. SweetScan Watchlist dashboard + reorder tabs (~25%)
2. Engagement Plan collapsible-peek refactor + compact SweetCycle mode (~20%)
3. Relationship stage stepper + Flightdeck health bar (~25%)
4. Capture → KTI suggestion pipeline (~25%)
5. Memory canon update (~5%)

## Not in this wave

- No sidebar changes (locked)
- No route deletions
- No edits to auto-generated files
- No changes to KTI schema beyond the one additive column
- The full `/sweetcycle` multi-relationship route stays as the "all clients at once" view — unchanged

After Wave 11: SweetScan opens to *what you're watching* (not the firehose), Capture *proposes* what to watch next, the Engagement Plan page shows SweetCycle inline at a glance, and Pipeline stages are visible at both the contact level (stepper) and the cockpit level (health bar). Pipeline becomes a concept you *see everywhere* instead of a route that redirects.

Reply **"Run Wave 11"** to ship in this order, or name the slice you want first (e.g. *"Just the Watchlist + collapsible SweetCycle"*).

