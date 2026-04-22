# Phase 2.10c: SweetCycle Dashboards — make the journey legible

## What I learned from your portals

Each portal you uploaded tells the same story in a different voice:

- **Bedros (SFG)** — Pre-Mirror. Four "Machine session options" on the table waiting on Mirror to pick three.
- **DD Humes (Guillaume/Matthew)** — Pre-Engagement. Tools shipped, awaiting "Pathway" decision (Mirror vs. Mirror + Machine).
- **McLeod Financial (Stuart/Katie/Ricardo)** — Pre-Mirror. Built tools delivered; succession is the spine.
- **Savoir Wealth (Steven/Jennifer)** — Pre-Mirror. Five domains surfaced; needs the full 22-domain Mirror.
- **Angela / Recruiter Intelligence** — In-Engagement (build). make sense of the different builds
- **SparkPath Clarity Call** — Internal session template. Create the interview map as a workflow -

The pattern: every relationship has **a current Engagement stage**, **a current/next Service** (Mirror/Map/Machine/Sync/Connect), **a current SweetCycle phase per session** (Seed→Synthesize→Session→Sync→Ship), and **a portal artifact** that captures the moment. Today the app stores all of this but doesn't render it as a journey — the user has to mentally stitch it together.

## What's broken (audit)

1. **No "Where am I?" view.** Relationship detail shows funnel + maturity + plans as flat panels but never as a **timeline**: Pre-Engagement → Mirror → Map → Machine → Sync. There's no "you are here" marker.
2. **SweetCycle is buried.** The 5-phase ladder (`SweetCycleLadder`) only renders inside the generic entity workspace. There's no per-session board, no "next phase action", no Seed→Ship progress at the relationship level.
3. **Portal artifacts are orphaned.** Your portals are HTML deliverables sitting outside the app. `relationships.portal_link` exists but isn't surfaced as the prominent CTA it should be, and there's no portal version history or "delivered/viewed" state beyond a single boolean.
4. **No cross-cutting dashboard.** `/_app/today` shows tasks + sessions in flat lists. There's no **journey view** answering: "Of my 5 active relationships, who is in which stage, what session is next, what's blocking the next ship?"
5. **Owner ambiguity per phase.** A SweetCycle phase has a natural owner (Seed = client, Synthesize = us, Session = both, Sync = us, Ship = us → client). Today nothing models that, so no one knows who's holding the baton.
6. **Service ↔ Session linkage is loose.** Sessions can have a `service` text and an `engagement_plan_id`, but not an explicit `engagement_service_id`. So a Map Service with 4 sessions can't roll up "2 of 4 shipped."

## Phase 2.10c — what lands

### Migration 1 — Make the journey queryable

- Add `sessions.engagement_service_id` (FK→engagement_services). Every session ladders Plan → Service → Session.
- Add `sessions.phase_owner` enum (`client | us | both`) defaulting from `sweetcycle_phase` (Seed=client, Synthesize=us, Session=both, Sync=us, Ship=us).
- Add `sessions.phase_due_date` (date) and `sessions.phase_blocker` (text). Drives a "what's the next baton handoff" surface.
- Add `relationship_portals` table: `id, relationship_id, version, kind (Pre-Mirror|Pre-Map|Pre-Machine|Mirror Output|Map Output|Machine Output|Sync), url, delivered_at, viewed_at, notes, created_by, created_at`. Replaces single `portal_link` with a real history. Existing `portal_link` stays for back-compat read.
- View `relationship_journey`: returns `(relationship_id, current_stage, current_service_id, current_session_id, next_action_owner, next_action_due, ship_count, total_session_count, latest_portal_url)`. One query powers every dashboard card.

### Migration 2 — Service rollup

- View `engagement_service_rollup`: `(service_id, plan_id, relationship_id, service_type, status, sessions_total, sessions_shipped, sessions_in_flight, next_session_date, completion_pct)`.

### New route — `/_app/journey` (the hub you've been asking for)

The "where is everyone, what's next" board. Three stacked panels, premium card style:

1. **Stage swimlanes.** Six lanes left-to-right: Awareness · Pre-Engagement · Mirror · Map · Machine · Sync. Each relationship is a card in its current lane showing: name · primary service · next session date · phase-owner chip (client/us/both) · portal CTA.
2. **This week's batons.** Flat list of every session whose `phase_owner` change is due in the next 7 days, sorted by date. "Steven & Jennifer · Mirror · Sync due Apr 24 · owned by us."
3. **At risk.** Sessions stuck > 7 days in the same phase, or relationships with `drift_risk` set. One-click open.

### Relationship detail — add **Journey strip + SweetCycle board**

On `_app.relationships.$id.tsx`, prepend two panels above the existing six:

- **Journey strip** (top of page, sticky): horizontal stage tracker (Pre-Engagement → Mirror → Map → Machine → Sync) with the current stage glowing, plus a "Latest portal" pill that links to the most recent `relationship_portals` row, plus delivered/viewed badges.
- **SweetCycle board** (per active service): for each `engagement_service` with `status=Active`, a 5-column board (Seed/Synthesize/Session/Sync/Ship) where each session appears in its current column. Cards show owner chip, due date, and a red dot if `phase_blocker` is set. Drag-to-advance writes a new `sweetcycle_phase` value.

### Session detail — add **Phase timeline + handoff control**

On `_app.sessions.$id.tsx`:

- **Phase timeline** at top: visual 5-step ladder with checkmarks for completed phases, current phase highlighted, owner chip per phase.
- **Advance phase** action: button "Mark Seed complete → hand off to us for Synthesize" that updates `sweetcycle_phase` and `phase_owner`, recomputes `phase_due_date` (configurable per service), and writes an audit row.
- **Linked artifacts**: list of `documents` with `related_session_id = this.id` grouped by `session_phase` (Pre-Engagement / Deliverable / Follow-up) — this is where portal HTML files attach.

### Client-facing portal page — `/_app/portals/$relationshipId` (read-mostly)

A trimmed view a client could be linked to (still gated behind auth for now): the journey strip + their current SweetCycle board + their open tasks (filtered by `relationship_id` via projects) + the latest portal link. This is the in-app version of the HTML portals you've been hand-crafting — same shape, populated from live data.

### Sidebar

Add **Journey** at the very top of the **Pipeline** group (above Relationships). It's the new daily start screen for client-facing work, the way `/my-tasks` is the daily start for execution.

### Memory

- `mem://features/sweetcycle-journey` — Stage taxonomy (Awareness→Pre-Engagement→Mirror→Map→Machine→Sync), per-phase ownership map, relationship_journey view contract, portal-version semantics.
- Append index Core: "Every relationship has a current Stage and every active Service has a SweetCycle board (Seed→Synthesize→Session→Sync→Ship). Phase owner is explicit (client/us/both); the baton is never ambiguous."

## What I'm NOT doing in 2.10c

- Importing the four uploaded HTML portals as data. They stay as artifacts — but I'll add a **"Import portal as relationship_portals row"** quick action that asks for URL + kind + version and stores the link. Full HTML→structured ingestion is its own pass.
- Best-Practice Catalog (Step 2 of original 2.10) — still queued.
- Agents — still queued after Best Practices.
- Notion sync — still last.
- A public unauthenticated portal URL. Client-portal page lives behind auth this pass; public sharing is a follow-up.

## Files touched

- 2 migrations under `supabase/migrations/`.
- New routes: `src/routes/_app.journey.tsx`, `src/routes/_app.portals.$relationshipId.tsx`.
- Edits: `src/routes/_app.relationships.$id.tsx` (add Journey strip + SweetCycle board), `src/routes/_app.sessions.$id.tsx` (phase timeline + advance control + artifacts), `src/components/app-sidebar.tsx` (add Journey), `src/lib/entities.ts` (add `engagement_service_id`, `phase_owner`, `phase_due_date`, `phase_blocker` on sessions; add `relationship_portals` entity), `src/lib/enums.ts` (PHASE_OWNER, PORTAL_KIND).
- New component: `src/components/sweetcycle-board.tsx` (the 5-column board, reusable for relationship detail and the journey route).

## Suggested order after this

1. **2.10c (this plan)** — Journey + SweetCycle dashboards.
2. **2.10b leftover polish** — return to Best-Practice Catalog (Step 2 of original 2.10).
3. **Agents** (Step 3).
4. **Notion sync** (Step 4).

Approve and I'll build 2.10c end-to-end in one pass. If you'd rather see the **client-facing portal page** built first and the team Journey board second, say "portal first" and I'll re-cut.