

# Phase 2.10l: Planner, Agents on everything, Tenets fix, Calendar, Page guides, Sync wording, Excellence rubric fix

Five problems, five fixes — bundled because they're all "the system isn't quite explaining or doing what I expect" issues. Here's how each lands.

---

## 1. Tenets aren't loading — broken query

**Cause:** `_app.tenets.index.tsx` selects `domain_id, domains (name, color)` but the `tenets` table has **no `domain_id` column**. The relationship goes through the `domain_tenets` join table. The query 400s and the page renders empty.

**Fix:** rewrite the query to fetch `tenets` plain, then fetch the `domain_tenets` join separately and stitch in-memory. Show domain dots from the *first* mapped domain (or "Multi-domain" badge if more than one). Same crystalline grid as Domains, grouped by industry.

**Detail page** (`_app.tenets.$slug.tsx`): same fix — drop the bad join, look up mapped domains through `domain_tenets`, render Crib Sheet + Lens Wall as today.

---

## 2. Excellence rubric "doesn't load" — page exists but no anchor

**Cause:** the route renders, but it requires picking Domain → specific subject → only then shows the editor. With nothing pre-selected and no "what is this?" copy, the screen looks blank/broken.

**Fix:** add a header explainer ("Define what excellent looks like at L1→L5 across the 5 Ps for Domains, Tenets, and Components. The L→R Rubric you build here is what every relationship gets scored against."), default-select the first Domain on load, and add a left-rail picker so subjects feel like a list you scan, not a dropdown you hunt. Empty-state per cell shows "Define excellence at this level…" instead of looking blank.

---

## 3. "Sync" wording — recap & confirm, not decide

Tiny but important. Replace every user-visible mention of *"Sync (recap & decide)"* with **"Sync (recap & confirm)"**:
- `src/components/sweetcycle-board.tsx` PHASE_SUB
- `src/routes/_app.sweetcycle.tsx` page intro
- `src/components/service-shape-strip.tsx` if present
- `mem://features/sweetcycle-journey.md` updated to lock the wording.

Decisions belong to the **Session** phase; Sync is where we play it back, get the head-nod, and lock scope.

---

## 4. Page-purpose guides — every page knows why it exists

Add a tiny consistent **PageHeader** component (`src/components/page-header.tsx`) that takes `title`, `purpose` (one sentence), and optional `whatYouCanDo` (3 bullets). Drop it at the top of every list and detail route. Wired across all `_app.*.index.tsx` routes plus the major detail pages.

Examples of the one-liners:
- **Today** — "Your live working surface: due-now tasks, scheduled sessions, the proposals queue, and the day's measure readings."
- **Capture** — "Throw any input in here — text, voice, file. AI structures it into a proposal you confirm in the Queue."
- **Queue** — "Confirm AI-proposed entities before they become real records. Trust layer for important writes."
- **Pipeline** — "Cross-relationship funnel: who's in awareness, pre-engagement, active, dormant."
- **Flightdeck** — "Operator cockpit across every relationship: workload, unassigned suggestions, active workflows."
- **SweetCycle** — "The 5-phase rhythm of every active client journey: Seed → Synthesize → Session → Sync → Ship."
- **Domains** — "22 universal areas of business excellence. Click any to see the rubric, BizzyBot perspectives, and your relationship maturity."
- **Tenets** — "Industry-specific best-practice anchors that sharpen the universal Domains."
- **Measures** — "Objectives, KRs, KPIs, CSFs attached to anything. The single canon for 'how do we know it's working?'"
- **Workflows / Sessions / Operators / Engagement Plans / Campaigns / Components / Personas / Playbooks / Documents / Decisions / Sparks / Quests / Journeys / Missions / Outcomes / Domain Assessments** — each gets a one-liner so users know exactly what they're looking at.

---

## 5. The Planner — "I want to actually plan what I work on"

A new top-of-IA page **Planner** (`/planner`, sidebar `Today` group) that is the *write side* of Today's read view. Three vertical lanes:

```text
┌──────────────┬──────────────┬──────────────┐
│  This week   │  Next week   │   Backlog    │
│  ─────────   │  ─────────   │  ─────────   │
│  📋 Tasks    │  📋 Tasks    │  📋 Tasks    │
│  📂 Projects │  📂 Projects │  📂 Projects │
│  📣 Campaigns│  📣 Campaigns│  📣 Campaigns│
└──────────────┴──────────────┴──────────────┘
```

- **Drag a card** between lanes → sets `scheduled_for` to the Monday of that week.
- **Filter chips** at top: All / Mine / By relationship / By domain / By operator.
- **Quick-add row** at the bottom of each lane: type → enter → creates a Task in that week with you as owner.
- Mounts the existing `<TimeControls>` on row click for finer-grained dates/recurrence.
- Underneath: a **Capacity bar** per lane ("8 tasks · 2 projects · ~18 hrs estimated"), so you see overload before it hits Today.

This is the missing "I plan, then I execute" surface — Today stays read-only; Planner is where intent lives.

---

## 6. Calendar — the missing visual time view

A new `/calendar` page (sidebar `Today` group, after Planner). Month + week toggle. Renders any record with a `scheduled_for` or `due_date` from the time_grid view: tasks, sessions, campaigns, engagement_services, measure cadence checkpoints. Color-coded by entity type, click → opens detail in a sheet without leaving the calendar. Filter chips mirror Planner (Mine / Relationship / Operator / Domain).

Built on `react-day-picker` (already installed via shadcn `Calendar`) extended into a month grid with event chips per day. Drag-to-reschedule on month view.

---

## 7. Agents on everything — universal Operator attachment

Right now operators attach to tasks/projects/components/sessions. Extend the same pattern to **the things you said you wanted**:
- **Domains** — `domain_curators` join table (operator_id, domain_id, role: 'curator' | 'researcher' | 'reviewer'). Operators here own keeping that domain's rubric, lenses, and best-practices fresh.
- **Tenets** — `tenet_curators` (same shape).
- **Lenses (BizzyBots)** — `lens_curators` (same shape). Operator becomes the "voice" generating that lens's perspectives — surfaced on `LensPerspectiveCard` footer ("Curated by {operator}").
- **People** — add `responsible_operator_id` to `people` (account manager / relationship lead).
- **Campaigns** — add `operator_id` to `campaigns` (campaign owner — already has a `owner` text field but not a real link).

UI: same `<OperatorChip>` reused in every header. On Operator detail, the Assignments panel gains three more tabs: **Domains**, **Tenets**, **Lenses** with the same suggestion strip + assign-existing flow.

### The interesting part — Curator Agents that fetch & validate

Each curator-shaped operator (any operator with a `kind` of `agent` and at least one curator assignment) becomes a **continuous-improvement agent**. It runs on a cadence (default weekly) via a Supabase scheduled function:

1. **Fetch** — pulls fresh material for its assigned subjects (web search via Lovable AI Gateway with browsing, plus internal cross-reference).
2. **Propose** — writes draft perspective updates to `lens_perspectives` as a *new version* (`version = max + 1`, `is_pinned = false`).
3. **Audit trail** — every change writes to a new `entity_audit_log` table (subject_kind, subject_id, field, old_value, new_value, source: 'agent'|'human', operator_id, model, run_id, timestamp).
4. **Human confirm** — drafts surface in the Proposals Queue with a clear diff view ("OCDA's perspective on Strategic Vision changed: 3 added bullets, 1 removed"). User accepts → version becomes the live one.

This gives you **provenance + versioning + audit trail** as a first-class citizen, exactly as you described.

---

## Schema changes

```sql
-- Curator joins
CREATE TABLE domain_curators (
  id uuid PK, domain_id uuid REFERENCES domains, operator_id uuid REFERENCES operators,
  role text DEFAULT 'curator', created_at, created_by
);
CREATE TABLE tenet_curators ( ...same shape, tenet_id );
CREATE TABLE lens_curators ( ...same shape, lens_id );

-- Add owners
ALTER TABLE people ADD COLUMN responsible_operator_id uuid REFERENCES operators;
ALTER TABLE campaigns ADD COLUMN operator_id uuid REFERENCES operators;

-- Audit trail
CREATE TABLE entity_audit_log (
  id uuid PK,
  subject_kind text NOT NULL,        -- 'lens_perspective' | 'crib_sheet' | 'domain' | 'tenet' | 'measure' | ...
  subject_id uuid NOT NULL,
  field text,
  old_value jsonb,
  new_value jsonb,
  change_type text,                  -- 'create' | 'update' | 'delete' | 'version'
  source text,                       -- 'human' | 'agent' | 'workflow' | 'import'
  operator_id uuid REFERENCES operators,
  agent_run_id uuid,
  model text,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- Agent runs
CREATE TABLE agent_runs (
  id uuid PK, operator_id uuid REFERENCES operators,
  cadence text, status text,         -- 'queued' | 'running' | 'success' | 'failed'
  started_at, finished_at,
  proposals_count int DEFAULT 0,
  notes text, error text
);
```

RLS: read-all-team, write owner-or-admin pattern matching existing tables.

---

## Files touched

**New:**
- `src/components/page-header.tsx` — reusable purpose banner
- `src/routes/_app.planner.tsx` — three-lane planner
- `src/routes/_app.calendar.tsx` — month/week visual calendar
- `src/components/calendar-month.tsx` — event-grid month view
- `src/components/curator-panel.tsx` — operator assignment for domains/tenets/lenses
- `src/components/audit-trail-panel.tsx` — drop-in history panel for any entity
- `src/components/version-diff-card.tsx` — diff view for perspective versions
- `supabase/functions/run-curator-agents/index.ts` — scheduled fetch+propose worker
- Migration `<ts>_curators_audit_planner.sql`

**Edited (purpose headers + targeted fixes):**
- `src/routes/_app.tenets.index.tsx` and `_app.tenets.$slug.tsx` — fix the broken `domain_id` query
- `src/routes/_app.settings.excellence.tsx` — header explainer + default selection + left rail
- `src/components/sweetcycle-board.tsx` and `_app.sweetcycle.tsx` — Sync wording
- `src/components/app-sidebar.tsx` — add Planner + Calendar to the top group
- `src/routes/_app.operators.$id.tsx` — add Domains/Tenets/Lenses tabs to Assignments
- `src/routes/_app.domains.$slug.tsx`, `_app.tenets.$slug.tsx`, `_app.lenses.*` — `<CuratorPanel>` + `<AuditTrailPanel>`
- All `_app.*.index.tsx` and primary detail routes — drop in `<PageHeader>` with the one-liner
- `mem://features/sweetcycle-journey.md` — Sync = recap & confirm
- `mem://features/operators.md` — append curator-agent pattern + audit trail rule
- `mem://index.md` — add Core line: "Every entity carries an audit trail in `entity_audit_log`. Agents propose; humans confirm; both leave provenance."

## What I'm NOT doing this pass

- Live agent chat with the BizzyBots — still a future phase.
- Auto-running web search on every domain on day one — agents are scaffolded with a manual "Run now" button; cron schedule wired but disabled by default until you bless a curator.
- Branching workflows / DAG editor — still queued.
- Mobile gestures on the calendar — desktop drag only this pass.

## Suggested order after

1. **2.10l (this plan)** — fixes + Planner + Calendar + Curators + Audit trail.
2. **First curator agent live** — pick one Domain, attach a Gemini-Flash curator, watch it propose for a week.
3. **Branching workflows** + visual DAG.
4. **Library consolidation review** — do we really need 6 outcome-shaped objects?

