# Phase 2.10d: Drag-anywhere stages + Seed the Canvas from your portals

## What you're hitting

Three problems stacked on the same screen:

1. **The Journey board renders as labels, not as a board.** Cards live in stage columns but you can't drag them between stages. Same for the SweetCycle 5-column board on the relationship page, the maturity-level chips, and the awareness/temperature/drift pills. They are *display*, not *manipulation*. That's why it feels like notes.
2. **The system is empty.** 1 relationship, 0 sessions, 0 services, 0 components, 0 portals. The Journey is "completely empty" because there's no data — not because the page is broken. Until we seed it from the portals you've already built (Bedros, DD Humes, McLeod, Savoir, Angela) and the SparkPath Clarity Call, every dashboard will look hollow.
3. **Components / Tenets / Domains aren't being mined.** Every portal contains real components-in-the-making (e.g. SFG's "4 Machine Session Options," McLeod's succession spine, the SparkPath Clarity Call interview map). They should be captured as `components` records pre-tagged to domains/tenets, not left as one-off HTML.

## Who the expert is

The discipline you're asking for is **operational service design** — specifically the **Service Blueprint + Kanban-style state machine** pattern used by ops-heavy consultancies (think McKinsey Operations, Pipedrive's pipeline UX, Linear's project view, Notion's database-as-board). The person who'd build this calls it: *"every status field is a board, every board column is draggable, every card surfaces the next handoff and who holds the baton."* That's the lens I'm applying below.

## What lands in 2.10d

### Part A — Make every stage draggable (no schema change)

Convert the static "labeled column" UIs to real drag-to-update boards:

- `**/_app/journey` Stage swimlanes**: drag a relationship card across `Awareness → Pre-Engagement → Mirror → Map → Machine → Sync` writes `relationships.pipeline_stage`. Inline owner pill becomes a click-to-cycle (`client → us → both`).
- **Relationship detail SweetCycle board**: drag a session card across `Seed → Synthesize → Session → Sync → Ship` writes `sessions.sweetcycle_phase` (the trigger auto-resets `phase_owner`). Drag also recomputes the Journey strip on the same page.
- **Maturity Map grid (22 domains)**: each domain cell becomes click-to-cycle through `L1 Lacking → L2 Learning → L3 Launching → L4 Leveraging → L5 Leading` writing to `excellence_scores`. No drag — cell-cycle is the right gesture for a 5-state heatmap.
- **Funnel chips (awareness/temperature/drift)** on the relationship Funnel card: become inline single-select dropdowns (write on change), not read-only chips.
- **Reusable hook `useDragToStatus**`: extracts the dnd-kit + optimistic-update + toast pattern out of `kanban-board.tsx` so the Journey, SweetCycle, and any future stage-board share one implementation.

Result: anywhere there's a stage column, you can move things. No more "I see it but I can't act on it."

### Part B — Seed the canvas from your portals + clarity call

A one-time, idempotent seeding migration that creates real records based on what you've already built:

**Relationships seeded (with the right stage + temperature):**

- Bedros Sarkissian (SFG) — stage `Pre-Mirror`, temperature `Warm`, primary_service `Mirror`, drift_risk null.
- DD Humes (Guillaume + Matthew) — stage `Pre-Engagement`, temperature `Warm`, awaiting Pathway decision flagged as `current_blocker`.
- McLeod Financial (Stuart, Katie, Ricardo) — stage `Pre-Mirror`, temperature `Warm`, primary_service `Mirror`, succession noted.
- Savoir Wealth (Steven + Jennifer) — stage `Pre-Mirror`, temperature `Warm`, 5 surfaced domains noted in `intelligence_summary`.
- Angela / Recruiter Intelligence — stage `In-Engagement`, primary_service `Machine`, status `Active`.

`**relationship_portals` rows** for each of the 5 client portals you uploaded, kind = `Pre-Mirror` or `Pre-Engagement`, version 1, with the file name as the title.

**Engagement plans + services + sessions** for the two that have real shape:

- Bedros: Plan "SFG Machine Sprint" → Service "Machine" (4 sessions in `Seed`, named after the four options you laid out).
- Angela: Plan "Recruiter Intelligence Build" → Service "Machine" (1 session in `Session` phase).

**Components seeded from real artifacts** — these are the building blocks you keep re-using, captured once:


| Component                                              | Pre-tagged Domain    | Pre-tagged Tenet                  |
| ------------------------------------------------------ | -------------------- | --------------------------------- |
| 22-Domain Mirror Assessment                            | strategy-positioning | Strategic Vision & Purpose        |
| Pathway Decision Worksheet (Mirror vs. Mirror+Machine) | sales-discovery      | Client Discovery & Needs Analysis |
| 4-Option Machine Session Selector                      | service-delivery     | Operational Excellence            |
| Succession Spine Map                                   | analytics-ci         | Business Succession Planning      |
| 5-Domain Quickscan                                     | analytics-ci         | Data Intelligence & Analytics     |
| SparkPath Clarity Call Interview Map                   | sales-discovery      | Client Discovery & Needs Analysis |
| Pre-Engagement Tools Bundle                            | onboarding-intake    | Client Experience Design          |
| Recruiter Intelligence Dashboard                       | analytics-ci         | Data Intelligence & Analytics     |


Each gets `description`, `questions_it_answers`, `current_maturity_level = L3 Launching`, `quality_status = In Use`, and the `related_domains` / `related_tenets` arrays populated. Quality status, maturity, and tags become editable inline on the component detail page.

**Sparks seeded** — every "next idea" surfaced in a portal becomes a `sparks` row tagged to the right relationship + domain + tenet, sitting in the Queue ready to confirm. ~12 sparks total across the 5 portals.

### Part C — Components ↔ Tenets ↔ Domains made obvious

- **Component detail page**: add a top strip showing the component's tagged domains (left) and tenets (right) as editable chip groups, with a small "Best fit" hint computed from the most-used pairing across other components.
- **Component list `/_app/components**`: add a filter row with two parallel filters — Domain (22 universal) and Tenet (22 industry-specific). User can stack both. Clarifies they are independent axes.
- `**/_app/journey**`: add a fourth panel — **"Components in flight"** — listing components touched in the last 14 days grouped by domain, so when you're working a Mirror you can see "these 3 components are also being refined right now."

### Part D — "Capture from portal" quick action

On the relationship detail Journey strip, add an **"+ Add portal"** button → modal with `kind` (Pre-Mirror / Pre-Map / Mirror Output / etc.), `version`, `url`, `notes`. Writes a `relationship_portals` row and bumps `latest_portal_url`. So the next time you ship a portal, it's one click into the system, not lost in a folder.

## What I'm NOT doing in 2.10d

- Full HTML→structured ingestion (parsing the portals into rich object trees) — that's a parser project. We capture the link + the high-signal components by hand this pass.
- Best-Practice Catalog, Agents, Notion sync — still queued behind this.
- Drag-and-drop on the Maturity Map (cell-cycle is correct for a heatmap; drag would be wrong gesture).
- Seeding a 6th portal — stick to the 5 you've shared.

## Files touched

- New: `src/hooks/use-drag-to-status.ts`, `src/components/stage-swimlanes.tsx` (drag-enabled wrapper used by Journey + SweetCycle).
- Edits: `src/routes/_app.journey.tsx` (drag swimlanes + Components-in-flight panel), `src/components/sweetcycle-board.tsx` (drag), `src/routes/_app.relationships.$id.tsx` (Funnel chips → inline editors, Maturity cell-cycle, Add-portal button), `src/routes/_app.components.$id.tsx` (domain/tenet chip strip), `src/routes/_app.components.index.tsx` (dual filter).
- 1 seed migration under `supabase/migrations/` — idempotent (uses `ON CONFLICT DO NOTHING` keyed on name + relationship_id) so re-runs don't duplicate.
- Memory: append `mem://features/sweetcycle-journey` with the drag-everywhere convention; add `mem://design/stage-as-board` capturing the rule "every status field renders as a board where columns are draggable."

## Suggested order after this

1. **2.10d (this plan)** — drag + seed.
2. **Best-Practice Catalog** (Step 2 of original 2.10).
3. **Agents** (Step 3).
4. **Notion sync** (Step 4).

Approve and I'll build 2.10d in one pass. If you'd rather I **only seed first** so you can play with real data before the drag work lands, say "seed only" and I'll cut Part A out of this pass.  
  
here are the tenets:  



|            |                                   |                |                                                                    |
| ---------- | --------------------------------- | -------------- | ------------------------------------------------------------------ |
| Tenet_Code | Tenet_Name                        | Category       | Description                                                        |
| F1         | Strategic Vision & Purpose        | Foundation     | Defining purpose, vision, and strategic direction for the practice |
| F2         | Leadership & Team Development     | Foundation     | Building and leading high-performing teams                         |
| F3         | Operational Excellence            | Foundation     | Creating efficient, scalable, and repeatable operations            |
| F4         | Financial Mastery                 | Foundation     | Mastering business financial management and planning               |
| F5         | Marketing & Positioning           | Foundation     | Positioning practice and building market presence                  |
| F6         | Sales & Business Development      | Foundation     | Developing business and converting prospects to clients            |
| F7         | Client Experience Design          | Foundation     | Designing exceptional client experiences                           |
| F8         | Risk Management & Compliance      | Foundation     | Managing risk and maintaining compliance                           |
| S9         | Client Discovery & Needs Analysis | Specialization | Deeply understanding client needs, goals, and context              |
| S10        | Financial Planning Mastery        | Specialization | Mastering comprehensive financial planning                         |
| S11        | Investment Philosophy & Strategy  | Specialization | Developing coherent investment philosophy and strategy             |
| S12        | Estate Planning Excellence        | Specialization | Excelling at estate planning and wealth transfer                   |
| S13        | Tax Planning Integration          | Specialization | Integrating tax planning into all advice                           |
| S14        | Insurance Strategy                | Specialization | Strategic use of insurance in planning                             |
| S15        | Business Succession Planning      | Specialization | Planning for business owner transitions and succession             |
| A16        | Behavioral Finance Application    | Advanced       | Applying behavioral finance principles to client work              |
| A17        | Data Intelligence & Analytics     | Advanced       | Leveraging data and analytics for insights                         |
| A18        | Networks & Strategic Partnerships | Advanced       | Building strategic partnerships and networks                       |
| A19        | Innovation & Adaptation           | Advanced       | Driving innovation and adapting to change                          |
| A20        | Communication & Client Education  | Advanced       | Communicating complex ideas and educating clients                  |
| M21        | Crisis Leadership                 | Mastery        | Leading during crisis and uncertainty                              |
| M22        | Legacy & Industry Contribution    | Mastery        | Contributing to profession and leaving lasting legacy              |
