# Wave 5 (revised) — Audit + `/start` cockpit, framed in YOUR canon

You're right. I was inventing Capture/Decide/Operate/Reflect when your canon already has the answer. Here's the version that uses only frameworks you've already named.

## The frameworks I'll use (none invented)


| Framework                                                                            | Where it lives in canon                      | Role in Wave 5                                           |
| ------------------------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| **Decision Factory** (Data pipeline · Algorithms · Experimentation · Infrastructure) | `mem://design/decision-factory.md`           | The "what does this app DO" answer on `/start`           |
| **OCDA loop** (Observe · Choose · Decide · Act)                                      | OCDA Cockpit                                 | The personal rhythm — "where am I in the loop right now" |
| **Verb-first sidebar** (Today · Work · People · Library · Settings)                  | `mem://design/sidebar-ia.md`                 | Already locked — we keep it, don't rename                |
| **Two Paths** (Session path · SweetSync path)                                        | `mem://design/two-progression-paths.md`      | The two ways work moves through the system               |
| **SweetCycle** (Seed → Synthesize → Session → Sync → Ship)                           | `mem://features/sweetcycle-journey.md`       | Where any active relationship is right now               |
| **5 Ps** (Purpose · People · Process · Product · Profit)                             | `mem://design/canon-5ps`                     | Diagnostic overlay on every audit row                    |
| **5 Ls** (Lacking → Leading)                                                         | Excellence rubric                            | Maturity reading per Domain                              |
| **BizzyBots / Lenses (F1–F8)**                                                       | `mem://design/lenses-bizzybots.md`           | The "how to interrogate any object" toolkit              |
| **SweetScan** (eyes · ears · hands)                                                  | `mem://design/sweetscan-as-eyes-and-ears.md` | The outside-in layer — already canonized                 |
| **Sparks vs Tasks**                                                                  | `mem://design/canon-sparks-vs-tasks.md`      | Hard rule preserved everywhere                           |
| **Operators** (humans + workflows + agents)                                          | `mem://features/operators.md`                | The unit-of-work lens on the audit                       |


**Nothing new is introduced. No sidebar regroup. No Capture/Decide/Operate/Reflect.**

## Part A — The Audit (read-only deliverable)

One file: `mem://design/ia-audit-wave5.md`. A single table of every route in `src/routes/`, scored against YOUR canon — no invented vocabulary:


| Column                     | What it answers                                                                    | Source of vocabulary   |
| -------------------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| Route                      | `/today`, `/operate/ocda`, `/sweetscan`, …                                         | filesystem             |
| Sidebar group              | Today / Work / People / Library / Settings                                         | locked sidebar canon   |
| Decision Factory component | Data pipeline / Algorithms / Experimentation / Infrastructure / (none)             | Decision Factory canon |
| OCDA stage it serves       | Observe / Choose / Decide / Act / (n/a)                                            | OCDA                   |
| Two-Paths role             | Session path / SweetSync path / both / neither                                     | Two-Paths canon        |
| Primary 5 P                | P1 / P2 / P3 / P4 / P5                                                             | 5 Ps canon             |
| Cadence                    | Daily / Weekly / On-event / On-demand                                              | observable             |
| Produces                   | Decision · Artifact · Signal · Hand-off · (nothing)                                | observable             |
| Verdict                    | Keep · Surface better · Demote to walk-menu · Merge into &nbsp; · Hide-until-built | judgment               |


Plus a one-paragraph summary per sidebar group: *what this group does in the canon*, written in your existing language. Hand this to anyone — it explains the whole app on one page.

**No routes get deleted in this wave.** Verdicts are advisory; any "merge" or "demote" becomes its own future wave.

## Part B — `/start` cockpit (the front door, framed in your canon)

A new route `/start`, surfaced as the first item in the **Today** sidebar group (above `/today`). Three blocks, each labeled with a framework you already own:

```text
┌─ Your Decision Factory — health right now ─────────────────────┐
│  Data pipeline    Algorithms    Experimentation   Infrastructure│
│  ●●●○○            ●●○○○         ●○○○○             ●●●●○        │
│  6 untriaged      2 KTIs fired  1 workflow run     OS itself    │
│  → Sandbox        → SweetScan    → Workflows       → Settings   │
└─────────────────────────────────────────────────────────────────┘
   (4 tiles map 1:1 to mem://design/decision-factory.md)

┌─ Where you are in OCDA right now ──────────────────────────────┐
│  Observe ●━━━ Choose ○━━━ Decide ○━━━ Act ○                    │
│  3 inbound signals · 2 KTI fires · waiting on you to triage    │
│  → Open OCDA Cockpit  (the loop made personal)                 │
└─────────────────────────────────────────────────────────────────┘

┌─ The two paths your work takes ────────────────────────────────┐
│                                                                │
│  SESSION PATH                       SWEETSYNC PATH             │
│  Evidence → Judgment → Decision     Mission → Journey →        │
│  → Today's session: Acme Mirror     Quest → Spark              │
│  → Sessions Bank                    → 12 active quests         │
│                                     → SweetCycle board         │
│                                                                │
│  Both write to the same truth model. Pick the rhythm that      │
│  matches the moment. (mem://design/two-progression-paths.md)   │
└────────────────────────────────────────────────────────────────┘
```

Below those three blocks, an expandable **"Glossary of rooms"** section showing the verb-first sidebar groups (Today / Work / People / Library / Settings) with a one-sentence canon explanation per group — pulled directly from `mem://design/sidebar-ia.md`. No regrouping. Just the existing names with their canon intent surfaced.

Empty-state copy uses your language: *"Inbox zero — your Decision Factory is humming. Want to scan for what's coming?"* → links to SweetScan.

## Part C — Walk-menu rollout (finish Wave 2's promise)

Mount `<WalkMenu kind=… id=…>` in the header of every detail page that doesn't have one yet:

- `_app.tasks.$id` · `_app.projects.$id` · `_app.components.$id` · `_app.sessions.$id` · `_app.workflows.$id` · `_app.quests.$id` · `_app.sparks.$id` · `_app.decisions.$id` · `_app.relationships.$id` · `_app.missions.$id` · `_app.journeys.$id`

Six verbs only (canon locked). One line per file. This is the move that makes "I don't know where I am" disappear — you can always walk Up / Down / Produces / Consumes / Advances / About from anywhere.

## What this wave is NOT

- **Not** regrouping the sidebar (your verb-first IA stays exactly as canonized)
- **Not** introducing Capture/Decide/Operate/Reflect or any other new layer vocabulary
- **Not** deleting or renaming any route
- **Not** touching Wave 4's `/today`
- **Not** building new entities or schema
- **Not** AI-generating any of the canon copy — every label is pulled from existing `mem://` files

## Files I'll touch

**New:**

- `mem://design/ia-audit-wave5.md` — the audit table + per-group summaries
- `mem://design/start-cockpit.md` — canon for `/start`, citing the existing framework files it composes
- `src/routes/_app.start.tsx` — the cockpit route
- `src/components/start/decision-factory-health.tsx` — 4-tile Factory Health (mirrors `<FactoryHealthStrip>` shape, already exists)
- `src/components/start/ocda-position.tsx` — Observe→Act progress indicator reading the same data as `<OcdaCockpit>`
- `src/components/start/two-paths-explainer.tsx` — Session path / SweetSync path side-by-side
- `src/components/start/sidebar-glossary.tsx` — the expandable group-by-group canon descriptions

**Edited:**

- `src/components/app-sidebar.tsx` — add `/start` as the first item under TODAY (above `/today`). No other changes. No regrouping.
- ~11 detail route files — one-line `<WalkMenu>` mount in the header

**Memory:**

- Existing files referenced, not edited: decision-factory.md, sidebar-ia.md, two-progression-paths.md, sweetcycle-journey.md, lenses-bizzybots.md, sweetscan-as-eyes-and-ears.md, canon-sparks-vs-tasks.md, operators.md

## Sequencing

1. **Audit first** (~30%) — write the table + per-group summaries; you read it before I touch UI
2. `**/start` cockpit** (~40%) — Decision Factory health + OCDA position + Two Paths + Sidebar glossary
3. **Walk-menu rollout** (~25%) — 11 one-line edits
4. **Memory canon updates** (~5%)

After Wave 5: opening the app shows `/start` if you want orientation, `/today` if you know what you're doing. The audit doc explains the whole app in your own vocabulary. The walk-menu is everywhere. **Zero new frameworks introduced.**

Reply **"Run Wave 5"** to ship in this order, or **"Just the audit first"** to read the audit doc and decide on Parts B/C after.  
  
here are my frameworks;  
**F1 OCDA:** Observe → Choose → Decide → Act

**F2 Gestalt:** Past → Present → Future

**F3 4Ds:** Discover → Define → Develop → Deliver

**F4 5Ps:** Purpose → People → Process → Product → Profit

**F5 3Cs:** Consent → Control → Collaboration

**F6 5Ls:** Lacking → Learning → Launching → Leveraging → Leading

**F7 Co-Evolution:** Explore / Exploit → Attune → Integrate → Recalibrate

**F8 Rhetorical:** Ethos → Pathos → Kairos → Logos  
  
  
  
also review this to see what might be helpful and reconnect things  


  
  
  
47 entities · 38 relationships · 8 reconciliation issues

Use this to sketch on paper. Every entity, what it connects to, what I think it means, where it breaks.

FAMILY 1 — REFERENCE / TAXONOMY

Fixed definitions. Never change per client.

Domain (×22) — Universal business dimensions. D1 Strategy through D22 Monetization. Assessment skeleton. Fixed across all industries. CANON.

Tenet (×22) — Industry-specific competencies. Foundation T1-T8, Specialization T9-T15, Advanced T16-T20, Mastery T21-T22. If SweetBOS enters a new industry, Domains stay, Tenets change. CANON.

Maturity Level (L1-L5) — Lacking / Learning / Launching / Leveraging / Leading. Same scale used two ways: scoring Domains in Mirror AND tracking Component advancement in SweetSync. CANON.

BizzyBot (×9) — Dual expression: playful brand characters on sweetbot.ai AND contextual orientation signals in SweetSync. Each has Domain affinity + Spark type affinity. TENSION: Currently orientation signals. Your vision is active scanning intelligence. Gap not resolved.

Framework (×8) — OCDA, Gestalt, 4Ds, 5Ps, 3Cs, 5Ls, Co-Evolution, Rhetorical Triangle. These are VIEWS not modules. Same objects, different projections. Wisdom builds one object model with multiple view surfaces. CANON.

FAMILY 2 — TYPE SYSTEM

Named subtypes. These drive UI behavior, not just classification.

Spark Type (×6) — Question → text input. Creation → rich editor. Definition → bounded input. Decision → drag-to-rank. Reflection → structured prompt. Action → checklist. Determines how UI renders. CANON.

Deliverable Type (×6) — Template / SOP / Document / Tool / System / Strategy. Determines format and storage routing. NEEDS WORK: routing rules not specified.

Outcome Type (×6) — Time Saved / Revenue Increased / Efficiency Gained / Satisfaction Improved / Cost Reduced / Quality Improved. Requires client self-reporting. CANON.

Reflection Type (×5) — Quest Completion / Component Level-Up / Journey Milestone / Periodic / Custom. TENSION: Reflection is BOTH a Spark type AND a standalone lifecycle event. Needs clear modeling.

Advancement Type (×3) — Primary (100% credit) / Secondary (30-50%) / Supporting (0%). How a Quest advances a Component. Clean. CANON.

Confidence Level (×4) — Not Yet Verified → Inferred → Observed → Verified. Drives the Exploit/Explore/Hybrid engine. Maps to Data Classification (Class A/B/C/D) in security layer. CANON.

Decision Object — First-class data type. Contains: question, 2-5 options, drag-ranked order, status (Open/In Progress/Committed/Revisited), evidence, session source, confidence. Rank history tracked across sessions. NEEDS WORK: under-specified.

FAMILY 3 — TRANSFORMATION HIERARCHY

Mission → Journey → Quest → Spark. What clients DO inside SweetSync.

Mission — Overarching transformation goal. 6-24 months. 1 active per client. Activates 4-6 Journeys. TENSION: 1 active may be too rigid. Need archive/transition logic.

Journey (×12) — Fixed capability areas. Container for Components + Quests. Tagged with Domains and Tenets. NEEDS WORK: 12 Journeys need validation against 72 Components.

Quest — Structured work unit. Advances 1-3 Components. Produces exactly 1 Deliverable. Contains 5-15 Sparks. TENSION: 1 Quest = 1 Deliverable may not hold for Map/Machine session work.

Spark — Atomic work unit. Under 5 minutes. 6 types. Ordered by sequence. Has BizzyBot affinity + Framework lens. CANON.

Component — Specific capability within a Journey. Maturity L1-L5. 72 total. Advanced through Quests. NEEDS WORK: Components database doesn’t exist yet.

Capability — Derived state when Components reach L3+. NOT a database row — computed view. NEEDS WORK: derivation rules (which Components at what levels = which Capability) don’t exist.

Outcome — Measurable business result. 6 types. Requires client self-reporting. NEEDS WORK: weakest link. Valuable if clients do it, invisible if they don’t.

Reflection — Structured introspection. 5 types. Dual nature: Spark type AND lifecycle event. TENSION: model accordingly.

Deliverable — Tangible output. 1 per Quest. Stored in Vault. 6 types. ALSO produced by Map/Machine sessions outside Quest framework. TENSION: two sources need unified storage with source tracking.

FAMILY 4 — PLATFORM EXPERIENCE

What clients see and use inside SweetSync.

SweetSync — $1,500/month. The platform. Everything below is a sub-component, not a peer. Mirror required. CANON.

Vault — Client’s canonical memory. VIEW across all deliverables + session outputs. Accumulates from SweetSync AND Map/Machine. CANON.

Resource Center — Reusable library. Driven by Exploit/Explore/Hybrid engine via confidence levels. CANON.

Liz AI — AI interface inside SweetSync. Canon Gate constrained. NEEDS WORK: not yet built.

Community — OPEN. No spec. Platform, format, structure all undefined.

Office Hours — Two per month. Live Q&A. CANON.

Analytics / Dashboard — VIEW surface. Reads from Component maturity, Domain Assessment, Spark completion. NEEDS WORK: not yet built.

Profile — Client identity layer. OPEN. Not designed.

Transformations — OPEN. Not defined. Possibly the client-facing expression of a Mission?

Portal — Personalized HTML page. Evolves: V1 post-Mirror, V2+ after sessions. Reads from Vault + Domain Assessment. Presentation layer. CANON.

FAMILY 5 — COMMERCIAL / ENGAGEMENT

How clients come in and move through.

Relationship — Any person in network. Pre-client. Becomes Client at Mirror purchase. CANON.

Client — Purchased Mirror. The anchor. client_id is the foreign key everywhere. CANON.

Session — Runtime instance. Mirror / Map (multiple types) / Machine (multiple types). Governed by SweetCycle. NEEDS WORK: needs session_type + session_subtype.

Domain Assessment — 22 rows per Mirror. Each: domain_id, client_score (L1-L5), liz_score (L1-L5), confidence, gap, notes. Must be versioned over time. CANON.

SweetCycle — Seed → Synthesize → Session → Sync → Ship. TENSION: This is a STATE MACHINE on the Session entity, not its own entity. Rules: 48hr Seed deadline, Scope Lock at Sync, 1 revision / 5 days.

SweetConnect — Enterprise custom-scope. Credit-based. Different IP terms. CANON.

Deliverable Catalog — Master inventory of what CAN be produced. 57+ definitions. Actual Deliverables are INSTANCES referencing catalog entries. CANON.

Persona — 4-dimension construct: Sector × Practice Structure × Autonomy × Regulatory Registration. Not a marketing persona. Drives Engagement Playbooks. CANON.

Engagement Playbook — One per Service × Persona. Orchestration layer. NEEDS WORK: not yet built.

FAMILY 6 — KNOWLEDGE & GOVERNANCE

Input Library (97 items) — What SweetBOS needs to gather. Linked to Deliverable Catalog. CANON.

Workflow Library (8 intake forms) — How inputs become deliverables. CANON.

Canon Gate — Deterministic quality filter before anything ships. Also Skill #5 in AI chain. CANON.

IP Model — SweetBot retains IP. Client gets perpetual non-exclusive license. Full ownership via SweetConnect only. CANON.

FAMILY 7 — INFRASTRUCTURE

Data Classification (A/B/C/D) — Class A public, B professional, C proprietary interaction, D low-confidence. Governs AI routing. CANON.

AI Routing Rule — Claude for A/B only. Azure/Cohere for C/D. PII scrubbing via Presidio before any AI call. CANON.

Advisor (Angela) — Primary entity in recruiter intelligence. Pattern is reusable. CANON.

Firm (Angela) — Shared intelligence layer. N=5 promotion rule. CANON.

Priority Score (Angela) — 0-100, 9 signals. Compounds with every interaction. CANON.

ALL RELATIONSHIPS

Mission → activates → Journey (1:M, typically 4-6)

Journey → contains → Component (1:M, fixed per Journey)

Journey → contains → Quest (1:M, variable count)

Quest → contains → Spark (1:M, 5-15, ordered)

Quest → produces → Deliverable (1:1) ⚠️ Does this hold for Map/Machine?

Quest → advances → Component (M:M, 1-3, Primary/Secondary/Supporting)

Component → has level → Maturity (1:1, current L1-L5)

Component → produces → Deliverable (1:M, accumulates)

Component → achieves → Outcome (1:M, tracked over time)

Component → derives (L3+) → Capability (M:M) ⚠️ Rules unspecified

Journey → tagged with → Domain (M:M)

Journey → tagged with → Tenet (M:M)

Component → tagged with → Domain (M:M)

Component → tagged with → Tenet (M:M)

Quest → viewed through → Framework (M:M)

Quest → analyzed by → BizzyBot (M:M, primary + secondary)

Spark → has type → Spark Type (M:1)

Spark → has affinity → BizzyBot (M:M)

Relationship → becomes (at Mirror) → Client (1:1)

Client → has → Session (1:M)

Client → has active → Mission (1:1) ⚠️ Only 1 active?

Client → assessed at → Domain Assessment (1:M, 22 domains × sessions)

Session → progresses through → SweetCycle (1:1, state machine not entity)

Session → produces → Deliverable (1:M)

Client → owns → Vault (1:1, view across all deliverables)

Client → has → Portal (1:1, evolves V1 → V2+)

Client → has → Profile (1:1) ⚠️ OPEN

Client → classified as → Persona (M:1)

Persona → determines → Engagement Playbook (1:M)

Deliverable Catalog → template for → Deliverable (1:M, definition → instance)

Input Library → feeds → Deliverable Catalog (M:M)

Resource Center → surfaces → Deliverable Catalog (1:M)

Confidence Level → drives mode → Resource Center (Exploit/Explore/Hybrid)

Domain Assessment → scores → Domain (M:1, 22 per assessment)

Domain Assessment → confidence → Confidence Level (M:1)

Deliverable → stored in → Vault (M:1)

Portal → reads from → Vault (1:1)

Portal → reads from → Domain Assessment (1:M)

Canon Gate → governs → Deliverable (1:M)

Advisor → works at / formerly at → Firm (M:M)

Advisor → scored by → Priority Score (1:1)

8 RECONCILIATION ISSUES

HIGH — Component vs Module vs Capability

Three words for overlapping space. Components are trackable (stored). Modules are commercial groupings of Map/Machine sessions (the 8-module page). Capabilities are derived states (computed). The 8 Modules should become tags on the Workflow Catalog, not their own entity.

HIGH — Quest produces exactly 1 Deliverable

In SweetSync Quests, yes. But Map/Machine sessions produce MANY outputs. Cleanest answer: service sessions produce session_outputs, not Quest Deliverables. Then reconciliation question is: how does service work count toward SweetSync progression?

HIGH — How does Map/Machine work count inside SweetSync?

If a client does Map: Knowledge System Design, and SweetSync has a Knowledge Systems Journey — does the Map retroactively advance those Components? Answer should be yes. Mechanism: Map/Machine sessions produce evidence that updates Component maturity and may check off equivalent Sparks/Quests.

HIGH — Domain Assessment: one-time or living model?

Mirror produces initial 22-domain assessment. But ongoing work should update domain understanding. Answer: living model. Mirror is initial snapshot. Subsequent events add evidence. Assessment should be versioned with append-only history.

MEDIUM — SweetCycle is a process, not an entity

Seed → Synthesize → Session → Sync → Ship is a STATE MACHINE on the Session entity. Model as session.stage + policy rules, not a separate table.

MEDIUM — Deliverable Catalog vs actual Deliverables

Catalog = REGISTRY of what CAN be produced (57+ definitions). Actual Deliverables = INSTANCES of what WAS produced. Different tables. Instance references catalog_entry_id.

MEDIUM — Reflection exists in two forms

Spark.type = ‘reflection’ (input inside a Quest) vs lifecycle event triggered by milestones. These are different things. Model separately: Spark instances vs reflection_events table.

LOW — The 8 Modules page should be archived or merged

Modules are outcome categories — labels for what a client ends up with. The Workflow Catalog already lists every offering. Module grouping should become a tag on the Catalog.

FRAMEWORK LENS OVERLAY

Same entities, different projection. Doesn’t change the data model.

OCDA lens — entities regroup into Observe / Choose / Decide / Act

5Ps lens — entities regroup into Purpose / People / Process / Product / Profit

3Cs lens — everything sorts by Consent / Control / Collaboration

5Ls lens — entities reposition on the maturity axis

Co-Evolution lens — shows Explore/Exploit tension

Gestalt lens — Past / Present / Future

4Ds lens — Discover / Define / Develop / Deliver

Rhetorical Triangle — Ethos / Pathos / Kairos / Logos

These are VIEW LAYERS. The data model doesn’t change. Each framework lens re-sorts and re-groups the same underlying Sparks, Decisions, and Deliverables into a different visual arrangement. Wisdom builds one object model with multiple view surfaces.

April 3, 2026 · Use this to draw the connections on paper. When you’ve sketched it, bring it back and we rebuild from your actual sketch.  
here are my frameworks;  
F1 OCDA: Observe → Choose → Decide → Act

F2 Gestalt: Past → Present → Future

F3 4Ds: Discover → Define → Develop → Deliver

F4 5Ps: Purpose → People → Process → Product → Profit

F5 3Cs: Consent → Control → Collaboration

F6 5Ls: Lacking → Learning → Launching → Leveraging → Leading

F7 Co-Evolution: Explore / Exploit → Attune → Integrate → Recalibrate

F8 Rhetorical: Ethos → Pathos → Kairos → Logos