# SweetSync Entity Wiring Handoff — full rebuild

One canonical document your dev can read end-to-end and know exactly what every entity is, how they connect, and what is built vs. what still needs planning. It folds in every correction from this thread (Persona as external calibration lens, Two-Rail spine, Spark-as-bridge, Sparks can be orphan, Sessions = 1:1 SweetCycle engagements, JTBD = standing role responsibilities, Outcome = Aspired vs Actual, Quest→Campaign→Project→Task hierarchy).

## Deliverables

1. **`SweetSync_Entity_Wiring_Handoff.pdf`** — the master document (12–16 pages)
2. **`SweetSync_Wiring_Map.mmd`** — Mermaid diagram of the full entity graph (renders inline in the chat)
3. **`SweetSync_Entity_Wiring_Handoff.md`** — same content as the PDF in markdown, for your dev to keep in the repo

All written to `/mnt/documents/`.

## PDF structure

**Section 1 — How to read this doc**
The two rails, the one truth model, and the five universal substrates that live under every screen.

**Section 2 — The Two Rails (the spine)**
- Nudge Rail: Mission → Journey → Quest → Spark (system + client)
- Work Rail: Campaign → Project → Task (operationalized)
- Sparks are the **bridge**: when you decide to operationalize, a Spark spawns Tasks/Projects/Campaigns
- Sparks can be orphan or parented by Quest **or** Journey
- ASCII spine diagram

**Section 3 — Entity Lexicon (every entity, one card each)**
Each card: *Name · One-line definition · Concrete sample · What it is NOT · Key fields · Connects to*

Strategy & Demand
- Mission, Journey, Quest, JTBD (standing role responsibility), Persona (external calibration lens; internal = Operator)

Capability & Quality
- Component (L1→L5), Decision (open vs logged), Quality Gate, Outcome (Aspired vs Actual), Measure (Objective/KR/KPI/CSF)

Work Vehicles
- Campaign, Project, Task, Spark (system-only), Sandbox Item, Capture, Inbound Signal, KTI Scan

Operators & Engagement
- Operator (human/workflow/agent), Relationship, Engagement Plan, Service, Session (1:1 SweetCycle engagement), Session Template, Workflow, Workflow Step, Document, Playbook

Lenses & Perspectives
- Lens (F1–F8 BizzyBots), Lens Perspective, Crib Sheet, Domain (22 universal), Tenet (industry-scoped)

**Section 4 — The "vs" Pairs (kill the confusion)**
Spark vs Task · Project vs Campaign · Project vs Quest · Component vs Project · JTBD vs Session Purpose · Persona (external) vs Operator (internal) · Outcome vs Measure · Decision vs Quality Gate · Mission vs Journey vs Quest · Sandbox Item vs Spark vs Capture · Workflow vs Session · Session vs SweetCycle · Domain vs Tenet · Aspired Outcome vs Actual Outcome · Quest scope=client vs scope=internal · Nudge Rail vs Work Rail

**Section 5 — The full wiring map (Mermaid)**
The entity graph with every relationship: parent/child, references, blocks, advances, spawned_by, declares_contribution_to. This is also delivered as a standalone `.mmd` artifact so it renders interactively.

**Section 6 — The five universal substrates**
Triageable · WalkMenu · TimeControls (5 time fields + recurrence) · MeasuresPanel (polymorphic) · CribSheetCard + LensWall. Plus the Domain × Tenet two-axis filter rule.

**Section 7 — Hidden contracts (do not violate)**
Provenance is sacred · Sparks are system-only (DB trigger) · Roles in separate table · Status fields render as boards · Views are truth · Aspired vs Actual outcomes are separate columns, never one field

**Section 8 — What's built vs what to plan**
Two columns side by side. Built = exists in code/DB today (Quests, Sparks with scope, Components, Operators, Triageable, OCDA, Sessions, Measures, Workflows, Lenses, Domains, Tenets, Outcomes table). To plan = the gaps surfaced in this thread:
- Outcome split into `aspired_*` and `actual_*` columns + tracking journal
- Campaign as a first-class layer between Quest and Project (currently Campaigns exist but the Quest→Campaign→Project→Task chain isn't enforced)
- Persona dual-mode wiring (external archetype rows vs internal Operator rows — same table, two `kind` values, different UI surfaces)
- Spark→Task/Project/Campaign promotion flow on the Work Rail (spawn provenance written both sides)
- Session Purpose as free-text + suggested-tags field on `sessions` (lightweight, not a new table)
- JTBD attached to Persona with `when_context / want_responsibility / so_that_outcome` shape

**Section 9 — One-page TL;DR for the dev**
The single page to pin above his monitor. Two rails, one truth, five substrates, six hidden contracts, the wiring diagram thumbnail.

## Process

1. Pull the canonical entity list directly from the codebase (route files, `src/lib/entities.ts`, `src/lib/triageable.ts`, memory files under `.lovable/memory/design/` and `features/`) so every card matches what actually exists.
2. Cross-check against this thread's corrections so nothing reverts to a stale definition.
3. Build the Mermaid wiring diagram and visually QA it.
4. Generate the PDF with reportlab, convert to images, and visually QA every page (no overlapping text, no clipped tables, contrast OK).
5. Write the `.md` mirror so the doc lives in the repo too.
6. Deliver all three artifacts in chat.

## Open question before I build

One thing I want to lock so the doc is final on first pass:

**Campaign placement.** Earlier you said *"Project sits in the hierarchy between campaign and task."* That gives us the chain **Quest → Campaign → Project → Task**. But Campaigns today live mostly as marketing/GTM pushes in the codebase (`/campaigns` route). Two options for the doc:

- **(A) Campaign is always a layer** between Quest and Project — every Project rolls up to a Campaign (Campaign can be a thin "default" container if there's no real GTM push)
- **(B) Campaign is optional** — Projects can roll up to either a Campaign *or* directly to a Quest, depending on whether the work is part of a broader push

Pick A or B and I'll bake it in. After that I write the whole thing in one pass — no more loops.
