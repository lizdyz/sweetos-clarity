

# Phase 2.10u — Calendar that actually works · honest sidebar · external calendar bridge · pipeline that earns its place

You raised four things. I'll address each with the UX framework you shared (Clarity → Load → Feedback → Flow → Polish) front of mind.

---

## 1. Calendar — make days clickable and useful (Phase 1, 3, 4 fix)

**Today's failure:** day cells render events but **clicking a cell does nothing**. Only the tiny event chips inside are clickable. That violates your Phase 3 (no feedback) and Phase 1 (no affordance) tests.

**Fix:**
- Every day cell becomes a button → opens the existing `<CalendarDaySheet>` (already built, just unwired) on the right.
- Sheet shows: full event list for that day, status chips, links to detail pages, **Quick Add** (task / session / decision) prefilled to that date.
- Add hover state on cells (subtle ring) + cursor pointer so affordance is obvious.
- Empty days are still clickable → opens the sheet pre-set to "add something."
- Today cell keeps the iris ring; **selected** day gets a stronger fill so the active state reads.

**Also pulled in:** include **Sparks** and **Decisions** in the event feed (currently only tasks/sessions/campaigns) — they have dates and matter for daily planning.

---

## 2. External calendar connection — Google + Outlook (one-way read first)

**Why:** you said *"connect with my external calendar to decide times."* The use case is conflict-checking when scheduling sessions/tasks, not full two-way sync (which is a much bigger build).

**Approach (pragmatic, shippable):**
- New `/settings/integrations` page with two cards: **Google Calendar** and **Microsoft Outlook**.
- Outlook uses the existing `microsoft_outlook` connector (already documented in your useful-context). Google uses standard OAuth via a small Lovable Cloud edge function.
- Tokens stored in a new `external_calendar_connections` table (per user_id, provider, access/refresh token, scope='read').
- Edge function `fetch-external-events` pulls the next 30 days of busy blocks → cached in `external_calendar_events`.
- Calendar grid shows external events as **muted grey ghost chips** clearly differentiated from native events ("📅 Google" / "📅 Outlook" chip with reduced opacity).
- Quick Add and the Day Sheet show **"⚠ conflicts with: [external event]"** when a chosen time overlaps.

**Out of scope this pass:** writing back to Google/Outlook, two-way sync, recurring-event expansion.

---

## 3. Sidebar — fight for every tab, name what's missing (Phase 1, 2, 4)

You asked me to **fight for why every tab should exist**. Honest audit, with verdicts:

| Tab | Verdict | Why / what changes |
|---|---|---|
| **Today** | ✅ keep | One-screen "what now". Core to the product. |
| **Planner** | ✅ keep | Week/next/backlog; different mental model from Today. |
| **Calendar** | ✅ keep | Time-grid view. With day-click fix, becomes essential. |
| **Capture** | ✅ keep | The single front door for raw input. |
| **Queue** | ⚠ **merge into Capture** as a tab | Two separate tabs for "drop in" and "approve drops" splits one mental flow. Unify under `/capture` with tabs *Drop · Review (n) · History*. -1 sidebar item. |
| **My tasks** | ✅ keep | High-frequency personal lens. |
| **OCDA Cockpit** | ✅ keep | Distinct thinking surface. |
| **Sessions Bank** | ✅ keep (renamed last pass) | Clear after rename. |
| **SweetCycle** | ✅ keep | Per-client journey board. |
| **Flightdeck** | ✅ keep | Cross-client cockpit. Different from SweetCycle. |
| **Engagement Plans** | ✅ keep | Contract shape — a node clients land on. |
| **Pipeline** | ⚠ **rebuild** | See section 4 below. |
| **Campaigns** | ⚠ **move to Library** | It's a *catalog of orchestrated touch sequences*, not a daily delivery surface. -1 from Deliver. |
| **BizzyBots** | ✅ keep | The 9-lens index. |
| **Decisions** | ✅ keep | Audit trail of choices. |
| **Delegation Register** | ✅ keep | Systematize list. |
| **Measures** | ✅ keep | Polymorphic objectives — has nowhere else to live. |
| **Documents** | ⚠ **fold into Vault** | Today these are two windows on the same data. Delete `/documents` route, redirect → `/vault?type=document`. -1 sidebar item. |
| **SweetSync (per client)** | ✅ keep | The self-paced board. |
| **Missions / Journeys / Quests / Sparks** | ✅ keep, but **nest visually** under SweetSync header | They're the SweetSync hierarchy — render as indented sub-items so the relationship reads. |
| **Domain Assessments** | ⚠ **move to Library** | It's a tool over Domains; lives better next to them. |
| **Relationships / People / Operators / Projects / Tasks** | ✅ keep | All canonical entities. |
| **Library entities** (Workflows, Session Templates, Playbooks, Components, Personas, Outcomes, JTBD, Vault, Domains, Tenets) | ✅ keep, group already collapsible | Good as-is. |
| **Settings** | ✅ keep | Already collapsible. |

**New tabs to add:**
- **SweetSync Subscriptions** (under SweetSync) — per-relationship subscription view: tier, sessions remaining, SweetConnect credits, billing cycle, what's included. Reads from existing `relationships.sessions_purchased / sessions_used / sweetconnect_credits` columns (already in schema). This is what makes SweetSync feel like a real subscription product.
- **SweetConnect** (under SweetSync) — credit-based ad-hoc engagement surface: list of past/upcoming SweetConnect uses per relationship, credit balance, "use a credit" CTA. Backed by existing `sweetconnect_credits` columns + a tiny new `sweetconnect_uses` table.
- **Settings → Integrations** — the Google/Outlook card pair from section 2.

**Net result:** sidebar drops from 7 visible groups (~52 items) to 6 visible groups (~48 items). Three absorptions (Queue→Capture, Documents→Vault, Domain Assessments→Library). Two strategic adds (SweetSync Subscriptions, SweetConnect). One framework add (Integrations).

---

## 4. Pipeline — fight for it or rebuild it (Phase 1, 4)

**Honest read:** today's `/pipeline` is a thin Kanban of `relationships.pipeline_stage` with a confidence chip and a next-action line. It duplicates information already on `/relationships` and adds little a sorted relationship list doesn't.

**Two options — pick one:**

### Option A (recommended) — **Rebuild Pipeline as a true sales-and-engagement funnel**
What it actually adds over `/relationships`:
- **Lanes = funnel stages** with **WIP limits** (visual warning when a stage is bloated).
- **Drag-to-stage** with audit trail (writes a `pipeline_stage_changes` row so you see velocity).
- **Per-card metrics**: revenue potential, days in stage, last touch date (already in schema).
- **Header row of conversion KPIs**: % advanced last 30 days per stage, average days-in-stage, stuck-deal count.
- **Filters**: by intelligence_confidence, drift risk, awareness tier, package recommended.
- **"Stuck" surface** at top: relationships that haven't moved in >30 days flagged red.

This gives Pipeline a **distinct job no other page does**: *"where is revenue actually moving and what's stuck?"*

### Option B — **Delete `/pipeline`** and add a `?view=pipeline` mode to `/relationships`.
Cleaner, less duplication, but loses the dedicated funnel-velocity dashboard.

**My pick:** Option A. The funnel-velocity layer is real, and it's the page Liz opens on Monday morning to triage the week.

---

## What this builds

### Migration
- `external_calendar_connections` table (user_id, provider, access_token, refresh_token, scope, expires_at).
- `external_calendar_events` table (connection_id, external_id, title, start_at, end_at, all_day).
- `pipeline_stage_changes` table (relationship_id, from_stage, to_stage, changed_by, changed_at) + trigger on relationships.pipeline_stage update.
- `sweetconnect_uses` table (relationship_id, used_at, used_by, purpose, credits_consumed default 1, linked_session_id nullable).

### New routes
- `src/routes/_app.settings.integrations.tsx` — Google + Outlook cards.
- `src/routes/_app.sweetsync.subscriptions.tsx` — per-client subscription board.
- `src/routes/_app.sweetconnect.tsx` — credit-based ad-hoc surface.

### Edge functions
- `supabase/functions/oauth-google-calendar/index.ts` — OAuth start + callback.
- `supabase/functions/fetch-external-events/index.ts` — pull 30 days, upsert into cache.

### New components
- `src/components/external-event-chip.tsx` — muted ghost chip for external events.
- `src/components/calendar-conflict-warning.tsx` — used in day sheet + quick add.
- `src/components/pipeline-funnel-kpis.tsx` — header strip on rebuilt Pipeline.
- `src/components/pipeline-stuck-banner.tsx` — top-of-Pipeline alert for stuck deals.
- `src/components/subscription-card.tsx` — per-relationship subscription summary.
- `src/components/sweetconnect-credit-meter.tsx` — credits remaining + use button.

### Edited
- `src/routes/_app.calendar.tsx` — wire day-cell click → `<CalendarDaySheet>`; include sparks + decisions; render external ghost events.
- `src/components/calendar-day-sheet.tsx` — wire `onQuickAdd` to actual mutations (currently just a callback prop).
- `src/routes/_app.capture.tsx` — add tabs *Drop · Review · History* (absorbs `/queue`).
- `src/routes/_app.queue.tsx` — keep route as alias that redirects to `/capture?tab=review` (no broken bookmarks).
- `src/routes/_app.documents.index.tsx` — redirect to `/vault?type=document`.
- `src/routes/_app.pipeline.tsx` — rebuild per Option A.
- `src/routes/_app.relationships.$id.tsx` — mount `<SubscriptionCard>` + `<SweetConnectCreditMeter>`.
- `src/components/app-sidebar.tsx` — apply audit: nest SweetSync children, move Domain Assessments + Campaigns to Library, drop Queue + Documents, add SweetSync Subscriptions, SweetConnect, Settings → Integrations.

### Memory
- `mem://design/sidebar-ia.md` — rewrite to the trimmed IA.
- `mem://features/external-calendar.md` — read-only sync, ghost events, conflict warnings.
- `mem://features/sweetsync-subscriptions.md` — subscription = tier + sessions + SweetConnect credits per relationship.
- `mem://features/pipeline-velocity.md` — funnel KPIs, stuck-deal rule, stage-change audit.

---

## What I'm NOT doing this pass
- Two-way calendar sync (write back to Google/Outlook).
- Billing integration for subscriptions (Stripe wiring is a later, opt-in pass).
- Auto-decrementing SweetConnect credits on session creation (manual "use credit" first; automation once we see the pattern).
- Renaming any tables.

## Suggested order
1. **Calendar day-click + day sheet wiring** + include sparks/decisions. *Single-session win, immediately usable.*
2. **Sidebar audit pass** — absorptions, nesting, new SweetSync Subscriptions + SweetConnect entries (empty shells first).
3. **External calendar connection** — Google + Outlook OAuth + ghost events + conflict warnings.
4. **Pipeline rebuild** — funnel KPIs, stuck banner, drag-to-stage with audit.
5. **SweetSync Subscriptions + SweetConnect surfaces** wired to real data.

Each step is independently shippable. Approve and I start at #1.

