

# Wave 4 — Today as decision surface

Today is currently a wall of 6+ panels with no hierarchy. Wave 4 makes it answer **one question on open**: *"What's the best next thing I can do right now, and why?"* — using the data we already have plus the new `handoff_events` from Wave 3.

## What you'll see when this lands

### 1. Decision Bar — the new top of `/today`

Replaces the current "Today + date" title. One synthesized line + three primary actions:

```text
┌───────────────────────────────────────────────────────────────────┐
│ Tuesday, Apr 23                                                   │
│                                                                   │
│ 3 handoffs waiting on you · 2 overdue · 1 KTI fired in last 24h   │
│                                                                   │
│ [ ▶ Start with: "Review Q1 brief" — handoff from Drafter, 2h ago ]│
│ [ Snooze 1h ]  [ Hand off ]  [ Show me 5 more ]                   │
└───────────────────────────────────────────────────────────────────┘
```

The "Start with" recommendation comes from a deterministic ranker (no AI in Wave 4):
1. Inbound handoffs in `pending` (oldest first)
2. Workflow steps `awaiting_approval` assigned to me
3. Overdue tasks owned by me (most overdue first)
4. KTI fires in last 24h tied to my relationships
5. Today's scheduled tasks

Snooze writes `not_before = now() + 1h` on the subject. Hand off opens the existing `<HandoffSheet>`. "Show me 5 more" expands the Next-Best-Actions list (§3).

### 2. Live Signal Strip — merged

Today already shows `<FiredKtisStrip>` for KTI fires only. Wave 4 swaps it for a **Live Signal Strip** that merges three feeds in one horizontal scroll, sorted by recency:

```text
🔥 KTI: Pipeline drift > 20%   2h     ⚙ Handoff: Q1 brief from Drafter  3h    📡 Signal: New inbound from Acme    5h
```

- **🔥** rows from `kti_scans` where `fired=true` last 24h (existing)
- **⚙** rows from `handoff_events` where `to_operator_id = me` and `status='pending'` (new — Wave 3 data)
- **📡** rows from `inbound_signals` last 24h, status `new` (existing table, never surfaced on Today)

Each chip is a Link to its source. Walk-menu (`<WalkMenu>`) mounts on each chip via long-press / right-click affordance (kept simple: `⋯` button on hover).

### 3. Next-Best-Actions — the new primary panel

Replaces the current 6-panel grid (Overdue/Today/Week/Blocked/Sessions/Wins) as the *first* thing under the decision bar. A single ranked list of the **top 8 things you should consider doing right now**, each with a one-line "why":

```text
┌─ Next best actions ───────────────────────────────────────────────┐
│ 1. ⚙ Review Q1 brief                          ← handoff · 2h ago  │
│    Drafter Agent handed this to you. Reason: ready for review     │
│    [Open] [Accept] [Decline]              [⋯ walk]                │
├───────────────────────────────────────────────────────────────────┤
│ 2. ✓ Approve onboarding step 3                ← workflow · 4h ago │
│    Awaiting your approval in Onboard run #284                     │
│    [Open]                                  [⋯ walk]               │
├───────────────────────────────────────────────────────────────────┤
│ 3. ⏰ Send Acme proposal                       ← overdue · 1d      │
│    Due yesterday · tagged Profit, P3 Process                      │
│    [Open] [Reschedule] [Hand off]          [⋯ walk]               │
└───────────────────────────────────────────────────────────────────┘
```

Each row carries a **walk-menu** trigger (Wave 2 reuse) so you can jump up/down/produces/consumes from Today without leaving.

### 4. Existing 6-panel grid → moved below the fold + collapsed by default

The Overdue/Today/Week/Blocked/Sessions/Wins grid stays — it's still useful for browsing — but moves under a `<Collapsible>` titled "Browse all open work" so it doesn't dominate. Wins panel stays standalone (positive reinforcement).

### 5. OCDA + Decisions + Sandbox tile strip — kept, demoted

Stays where it is, but moves *below* Next-Best-Actions. The decision bar already surfaced what's urgent; the OCDA tiles are for *navigating into* the deeper cockpits, not for daily triage.

## Final page order top-to-bottom

```text
1. Decision Bar (new)
2. Live Signal Strip (replaces FiredKtisStrip)
3. Master Story Trail (kept)
4. Next-Best-Actions (new) — primary
5. Awaiting Approval + Maturity Wins Ready (kept)
6. OCDA + Decision Queue + Sandbox tiles (kept, demoted)
7. <Collapsible> "Browse all open work" → existing 6-panel grid
```

## Files I'll touch

**New:**
- `src/components/today-decision-bar.tsx` — synthesized line + Start-with CTA + Snooze/Hand off/Show more
- `src/components/today-next-actions.tsx` — ranked list of 8 next-best-actions with action buttons + walk-menu
- `src/components/live-signal-strip.tsx` — merged horizontal feed (KTIs + handoffs + inbound_signals)
- `src/lib/today-ranker.ts` — pure function `rankNextActions(handoffs, approvals, overdue, kti_fires, scheduled): RankedAction[]` with explicit priority weights

**Edited:**
- `src/routes/_app.today.tsx` — restructured to the new order; existing grid wrapped in `<Collapsible>`; `FiredKtisStrip` → `LiveSignalStrip`
- `src/components/walk-menu.tsx` — no API change; just gets new mount sites

**Memory:**
- `mem://design/today-as-decision-surface.md` — new file: page order, ranker priority, what NOT to put on Today

## How "current operator = me" is resolved

Today doesn't currently know which operator the logged-in user *is*. Resolution:
- Read `auth.uid()` via `useAuth()` (existing context)
- Lookup `operators` row where `user_id = auth.uid()` and `kind = 'human'`
- Cache via `useQuery(["me-operator"])`
- If no operator row exists yet (new team member), Decision Bar falls back to "All open team work" mode and shows: *"Link your account to an Operator to get personalized next actions."* with a deep link to `/operators`

This same `useMeOperator()` hook will be reused by Flightdeck and any future personalization. No schema change — `operators.user_id` already exists (verified Wave 2/3).

## Triple-check against the UX briefs (v1 + v2)

I cross-checked Wave 4 against every UX update we've discussed. Coverage:

| Brief item | Where it lands in Wave 4 |
|---|---|
| **v1: Today as signal-first surface** | Decision Bar + Live Signal Strip = top of page |
| **v1: walkable graph from anywhere** | Walk-menu mounts on every Next-Best-Action row |
| **v1: triageable interface canon** | Next-Best-Actions rows follow the Triageable shape (id/kind/title/source/state/promote_options) — reuses the contract from `mem://design/triageable-interface.md` |
| **v1: 80% of load from 6 surfaces** | Today is now lean — heavy panels collapsed |
| **v2: operator-as-unit-of-work** | "Me = which operator?" hook resolved; ranker is per-operator |
| **v2: handoffs first-class** | Handoffs surface on Live Signal Strip + are #1 priority in ranker |
| **v2: decision-factory framing** | Decision Bar is literally one decision; OCDA tiles demoted (the cockpit is the deep dive, Today is the trigger) |
| **5 Ps as overlay, not nav** | Ranker exposes P-tags as badge on each row, not as filter pills (matches `mem://design/sidebar-ia.md` rule) |
| **Sparks vs Tasks canon** | Ranker excludes Sparks (system-generated, not actionable by humans directly — they belong in `/sparks`) |
| **Views are truth** | Ranker reads `time_grid`, `operator_handoff_inbox`, `workflow_step_pipeline`, `kti_scans`, `inbound_signals` — never re-derives from raw tables |
| **Walk-menu canon (six verbs only)** | Reused as-is; no new verbs |
| **Wave 3 handoff lifecycle** | Accept/Decline buttons in Next-Best-Actions reuse `respondToHandoff()` server fn — no duplicate logic |

## Risks & what I'm NOT doing

- **Not** building AI synthesis of the decision-bar line — Wave 4 uses deterministic templating ("3 handoffs · 2 overdue · 1 KTI fired"). AI version is Wave 5/6 polish.
- **Not** adding new tables. Reads only.
- **Not** killing the existing 6-panel grid — collapsing it preserves the muscle memory.
- **Not** building Snooze across all entity kinds — Wave 4 implements snooze for tasks only (writes `not_before`); other kinds show a disabled tooltip "Snooze available on tasks for now".
- **Not** changing the Today route path or nav location.
- **Risk: empty-day state** — if nothing is pending, decision bar shows "Inbox zero. Want to plan tomorrow?" with a link to `/planner`. Live Signal Strip and Next-Best-Actions render empty-state copy instead of disappearing.

## Sequencing inside Wave 4

1. `useMeOperator()` hook + `today-ranker.ts` (pure logic, ~20%)
2. `<TodayDecisionBar>` (~25%)
3. `<TodayNextActions>` with walk-menu wiring (~25%)
4. `<LiveSignalStrip>` merging 3 feeds (~15%)
5. Restructure `_app.today.tsx` order + collapse old grid (~10%)
6. Memory canon (~5%)

After Wave 4 lands, opening Today gives Liz one decision in one glance, with the next 8 most-important things ranked underneath — all powered by data we already have plus Wave 3's handoff_events. Wave 5 (`/canon` room) is the only structural piece left.

Reply **"Run Wave 4"** to ship, or push back on the ranker priority order / decision bar wording / what gets demoted before I start.

