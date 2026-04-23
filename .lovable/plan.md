

# Planning your real work inside SweetOS Clarity

You want to take SweetOS from "the system we're building" to "the system we're using to run the build." Good news: the canon is already there — Missions, Journeys, Quests, Projects, Tasks, JTBDs, Components, Decisions. You don't need new entities. You need a **seeding pass** plus one small **planning surface** that makes the hierarchy obvious so you and your dev can sit down and actually use it.

## The canonical hierarchy (use this, don't invent)

```text
Mission         — the long-term why (e.g. "SweetOS Clarity is the operating system for service businesses")
  └─ Journey    — a multi-quarter arc (e.g. "Ship v1 of Clarity to first 10 paying users")
       └─ Quest — a themed body of work (e.g. "Lens System", "Operator Dashboard", "Capture-to-Routed pipeline")
            ├─ JTBD       — what a user is hiring this for ("When I open a Decision, I want the right lens…")
            ├─ Component  — the piece of product being built ("SweetLens panel", "Lens Studio")
            ├─ Project    — a time-boxed effort that builds Components ("Wave 21 — Lens Studio")
            │    └─ Task  — the unit of work, assigned to an Operator (you, your dev, a workflow)
            └─ Decision   — open questions blocking the Quest
```

Sparks are system-suggested; ignore them while seeding — they'll appear once the pipeline runs against real objects.

## What we'll do — three phases

### Phase 1 — Seed the hierarchy (one working session, ~60 min)

A guided **Planning Workspace** at `/planning` that walks you and your dev through populating the canon top-down:

```text
Step 1  Mission       — confirm the one-liner
Step 2  Journeys      — 2-4 arcs for the next 6 months
Step 3  Quests        — 3-6 per Journey (this is where most thinking happens)
Step 4  For each Quest:
          • JTBDs      (1-3 — who's hiring this and for what)
          • Components (the deliverables)
          • Projects   (the waves/sprints that build them)
          • Decisions  (anything still open)
Step 5  Tasks         — break down the active Project into operator-assignable tasks
Step 6  Operators     — confirm you + dev as operators with skills
```

Each step is a single-screen form with an inline list of what's already there, "Add" inline, and a "Next" button. No modals. Skipping is allowed; nothing's destructive.

### Phase 2 — Wire the views you'll actually look at daily

Three existing surfaces become the daily drivers — light edits only:

- **`/today`** — already exists. Add a top strip: *"Today's Quest" · "Today's Project" · "Blocked decisions"*.
- **`/flightdeck`** — operator dashboard across Quests. Filter by operator (you vs dev) so you each see your lane.
- **`/sweetcycle`** (or new **`/planning/board`**) — Quest board: rows = Quests, columns = `Discovery → Building → Shipping → Done`. Drag Quests across as state changes.

### Phase 3 — Distinction guardrails (so the canon doesn't drift)

A small **`<EntityKindHelper>`** chip mounted on the create dialogs for Mission/Journey/Quest/Project/Task that explains in one sentence what belongs at this level + 2 examples + 1 anti-example. Stops you and your dev from creating "a Project" when you mean "a Quest."

Plus a memory write: `mem://design/planning-hierarchy.md` codifying the 6-level rule so future AI work doesn't blur it.

## What we'll build

**New**
- `src/routes/_app.planning.tsx` — the 6-step Planning Workspace (stepper + inline lists + add forms, all reading/writing the existing tables).
- `src/components/planning/step-mission.tsx`, `step-journeys.tsx`, `step-quests.tsx`, `step-quest-detail.tsx` (JTBD/Component/Project/Decision tabs), `step-tasks.tsx`, `step-operators.tsx`.
- `src/components/entity-kind-helper.tsx` — the in-dialog explainer chip.
- `src/components/today/todays-focus-strip.tsx` — Quest + Project + blocked Decisions header for `/today`.
- `mem://design/planning-hierarchy.md`.

**Edited (light)**
- `src/routes/_app.today.tsx` — mount the focus strip.
- `src/routes/_app.flightdeck.tsx` — add operator filter (if not present).
- `src/components/sidebar-nav.tsx` — add **Planning** entry under Today (top of sidebar) with hint *"Set Missions · Journeys · Quests · Projects"*.
- The 5 create-sheets (`mission-create-sheet`, etc. — or wherever Mission/Journey/Quest/Project/Task creation happens) — mount `<EntityKindHelper>`.

**No DB changes.** Everything writes to `missions`, `journeys`, `quests`, `projects`, `tasks`, `jobs_to_be_done`, `components`, `decisions`, `operators` — all already exist with the right shape.

## A worked example (so you see the shape)

```text
Mission   "SweetOS Clarity — the OS for service businesses"
└─ Journey "Ship v1 to 10 paying users by Q3"
    ├─ Quest "Lens System"            ← Wave 21 lives here
    │   ├─ JTBD       "When I open any object, I want the right lens"
    │   ├─ Component  "SweetLens panel", "Lens Studio"
    │   ├─ Project    "Wave 21 — final wiring"
    │   │   └─ Tasks  "Mount SweetLens on /quests", "OCDA drop targets" …
    │   └─ Decision   "Should F12 Op-alpha auto-run on Sandbox items?"
    ├─ Quest "Capture → Routed pipeline"
    └─ Quest "Operator Dashboard (Flightdeck)"
```

By the end of the seeding session you'll have your real Missions/Journeys/Quests/Projects in the system, daily views that show *your* work, and create-flows that prevent canon drift.

## Sequencing

1. EntityKindHelper + 5 create-sheet edits + planning-hierarchy memory (~15%)
2. Planning Workspace route + 6 step components (~55%)
3. Today focus strip + Flightdeck operator filter (~15%)
4. Sidebar entry + smoke test of full hierarchy create flow (~15%)

## Not in this plan

- No new entities, no schema changes.
- No automation of Spark generation against your seeded Quests — that's separate.
- No external project-management import (Linear/Jira) — manual seeding for v1.

