# Entity wiring map — what your dev's PRD is missing

Your dev's PRD is a clean *surface* spec (7 nav pages, capture → triage → decision/task → execute) but it treats the system as if it only has 4 entities (Capture, Task, Project, Decision). The real OS already has **20+ canonical entities arranged in a strict hierarchy**, and the MVP only works if those connections are wired correctly underneath the 7 pages. Otherwise you'll ship a pretty Trello clone and lose the operating model that makes SweetSync different.

Below is the full picture, written so you can hand it to him.

---

## 1. What the PRD got right

- The **operating loop** (Capture → Triage → Decide/Task → Execute → Track) is correct. That *is* the daily rhythm.
- The **7 surfaces** map roughly to existing routes (`/capture`, `/sandbox`, `/tasks`, `/decisions`, `/sessions`, `/operators`, `/today`).
- The **24-hour triage SLA** and **decision-required-before-major-change** rules are good policy hooks.
- Phase 2 deferrals (Flightdeck, SweetScan, Lens Studio) are correctly identified as "needs MVP first."

## 2. What the PRD is missing — the connection layer

The PRD names **4 entity types**. The system has **3 layered taxonomies** that all need to coexist on every piece of work. If the dev only models Project/Task/Decision, the MVP will technically work but will erase the architecture.

### A. The Planning Hierarchy (6 levels — non-negotiable)

```text
Mission         WHY (one per org)
  └─ Journey    Multi-quarter capability arc
       └─ Quest Themed body of work that advances Components
            ├─ JTBD       What a user is hiring this for
            ├─ Component  The reusable piece of product (L1→L5 maturity)
            ├─ Project    Time-boxed deliverable (days–weeks)
            │    └─ Task  Atomic unit, one Operator
            └─ Decision   Open question OR logged choice
```

**Rules the PRD must respect:**
- Tasks roll up to Projects → Quests → Journeys → Missions. A Task without that chain is an orphan.
- Decisions **block Quests** — they are a planning blocker, not a Kanban card.
- JTBDs and Components are NOT planning units — they describe *demand* (JTBD) and *supply* (Component) and get *referenced* by Quests/Projects.
- Sparks are **system-generated only** (DB trigger blocks human inserts). They appear under Quests after the pipeline runs. The dev should not let users "create a Spark" in the MVP.

### B. The Two Progression Paths (both write to one truth)

- **Session path** — Evidence → Judgment → Decision (advisor-led, lives in Sessions + SweetCycle stages: Seed → Synthesize → Session → Sync → Ship).
- **SweetSync path** — Mission → Journey → Quest → Spark (self-paced, between sessions).

Both paths advance the same `components` records via `project_components`, `task_components`, `spark.advances_component_id`. The MVP must not model these as competing funnels — they're two entry rhythms into one truth.

### C. The Operator model (the PRD's biggest blind spot)

"Team" in the PRD is wrong. The canonical unit is **Operator** — a single table holding three kinds:
- **Humans** (your team)
- **Workflows** (sequenced steps)
- **AI agents**

All three carry skills/likes/dislikes. `tasks.operator_id` is the canonical assignment. The "Team" page in the PRD must be the existing `/operators` cockpit (Now/Queue/Blocked/Awaiting/Handoffs/History tabs over the `operator_workload` view). Don't let him build a new "Team" page from scratch.

### D. The Triage substrate (already exists — don't rebuild)

The PRD says "Capture → Triage queue → 24h SLA". Underneath that sits a **shared `Triageable` interface** (`src/lib/triageable.ts`) that already unifies five sources:

```text
sandbox_items + sparks + kti_scans + inbound_signals + captures
        ↓
   <TriageCard>  (universal UI, mounted everywhere)
        ↓
   promote → task | project | spark | decision input | component canon | archive
```

Promoting writes provenance to BOTH sides (`sandbox_items.routed_to_*` AND `tasks/projects/sparks.spawned_by_*`). That provenance chain is what makes "Why does this task exist?" answerable on every row. The MVP must preserve it.

### E. OCDA is a pipeline, not a label

The PRD's "Triage queue" is actually the existing **OCDA Cockpit** (Observe → Choose → Decide → Act). It's not a passive label — it's a working surface where:
- Observe lane unions proposals + sparks + inbound_signals + kti_scans
- Decide lane has an inline composer that writes a `decisions` row
- Cards drag between lanes and that updates `ocda_stage` on the underlying row

Either the MVP reuses `/operate/ocda` as its triage page, or it duplicates the entire substrate badly.

## 3. The connection map your dev actually needs

Every "card" in the MVP — whether on Command Center, Tasks, Decisions, or Team — must carry these connections, or context is lost:

```text
                       ┌─────────────────────────┐
                       │   Mission / Journey     │  (long arc)
                       └────────────┬────────────┘
                                    │
                          ┌─────────▼─────────┐
                ┌─────────┤      QUEST        ├─────────┐
                │         └─────────┬─────────┘         │
                │                   │                   │
        references                blocked-by         advances
                │                   │                   │
        ┌───────▼──────┐    ┌───────▼──────┐    ┌──────▼───────┐
        │ JTBD         │    │  DECISION    │    │  COMPONENT   │
        │ (demand)     │    │  (open/log)  │    │  (L1→L5)     │
        └──────────────┘    └──────┬───────┘    └──────┬───────┘
                                   │                   │
                       ┌───────────▼───────────────────▼───┐
                       │           PROJECT                 │
                       │  rolls up to Quest                │
                       │  declares contribution to Components
                       └──────────────┬────────────────────┘
                                      │
                              ┌───────▼────────┐
                              │     TASK       │
                              │  operator_id   │  ← Operator (human/workflow/agent)
                              │  spawned_by_*  │  ← provenance
                              │  blocks/blocked│
                              └───────┬────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
            ┌───────▼──────┐                    ┌───────▼──────┐
            │   SESSION    │                    │   MEASURE    │
            │ (advisor-led)│                    │ (KPI/KR/CSF) │
            └──────────────┘                    └──────────────┘
```

Plus the universal substrate underneath:
- **Triageable** → every card uses `<TriageCard>`
- **WalkMenu** → every row exposes the same nav menu
- **Provenance chips** → every row shows `spawned_by_kind` + downstream "Blocks N"
- **TimeControls** → every actionable record carries 5 time fields (created · not_before · scheduled_for · due · done) + recurrence
- **MeasuresPanel** → polymorphic, attaches to any subject (project, task, session, operator, …)
- **CribSheetCard / LensWall** → 8 BizzyBot lenses (F1–F8) generate perspectives on any subject
- **Domains (22 universal) × Tenets (industry-scoped)** → two parallel filter axes on every list

## 4. What the dev should build for MVP (corrected scope)

| PRD page | What he should actually wire |
|---|---|
| Command Center `/today` | Already exists. Surface: today's tasks ranked by `today-ranker.ts`, blocked decisions, active Quest + Project context strip, capacity flags from `operator_workload` view. **Don't build new — extend.** |
| Projects `/projects` | Project list MUST show parent Quest + linked Components + Decisions. Detail page mounts `<MeasuresPanel>`, `<TimeControls>`, `<TriageCard>` history, `<WalkMenu>`. |
| Tasks `/tasks` | Reuse existing workbench. Every row shows provenance chip (`spawned_by_kind`), blocks-N chip, operator avatar, due date. Next-up lane composed top-8 across (unblocked+due-today, unblocked+spawned-by-KTI, unblocking-most-others, stalled). |
| Decisions `/decisions` | Two states: **open** (blocking a Quest) and **logged** (history with context). Decisions attach polymorphically — same as Measures. Required-before-scope-change is a UI gate, not a new entity. |
| Sessions `/sessions` | Untouched. Already wired. Session prep/follow-up writes Tasks via existing workflow. |
| Team → **Operators** `/operators` | Rename the PRD's "Team" to **Operators**. Use the existing 6-tab cockpit. Capacity strip is `operator_workload` view. |
| Capture + Triage | Capture is the **topbar button** (already mounted, context-aware). Triage queue is the existing **Sandbox** at `/sandbox` OR the **OCDA Cockpit** at `/operate/ocda`. **Don't build a third triage page.** |

## 5. The five "hidden contracts" he must not violate

1. **Provenance is sacred.** Every auto-spawned row sets `spawned_by_kind` + `spawned_by_id`. Manual creates leave them NULL.
2. **Sparks are system-only.** A DB trigger rejects human inserts. If the MVP UI offers "Create Spark", it will fail at the database.
3. **Roles in a separate table.** `user_roles` + `has_role()` security-definer function. Never store roles on profiles.
4. **Status fields render as boards.** Linear stages = drag columns. Heatmaps = click-to-cycle cells. Single-select = inline Select. No read-only badges on actionable kinds.
5. **Views are truth.** Index pages read rollup views (`relationship_domain_maturity`, `operator_workload`, `time_grid`, `measure_health`, `task_blockers`, `component_build_pipeline`, `sandbox_inbox`). Don't re-aggregate in app code.

## 6. The one diagram to send him

If you only send your dev one thing, send this — it answers "what connects to what" for every MVP screen:

```text
CAPTURE  ─────────────►  TRIAGE (Sandbox / OCDA)  ─────────────►  PROMOTE
 (topbar)                  ▲     unifies 5 sources                   │
                           │                                         │
                    inbound_signals                                  ▼
                    sparks (system-gen)                ┌─────────────────────┐
                    kti_scans                          │ Task | Project |    │
                    captures                           │ Spark | Decision |  │
                    sandbox_items                      │ Component canon |   │
                                                       │ Archive             │
                                                       └──────────┬──────────┘
                                                                  │
                                          ┌───────────────────────┼───────────────────────┐
                                          ▼                       ▼                       ▼
                                  TASK (operator_id)      PROJECT (→ Quest)       DECISION (blocks Quest)
                                  spawned_by_* set        declares Components     opens/logged
                                          │                       │                       │
                                          └───────────┬───────────┴───────────┬───────────┘
                                                      ▼                       ▼
                                              SESSION (advisor-led)    OUTCOME / MEASURE
                                                      │                       │
                                                      └──── advances ────►  COMPONENT (L1→L5)
                                                                                │
                                                                          Mission / Journey / Quest
                                                                          (the long arc above it all)
```

---

## TL;DR for the dev

You are **not** building a new entity model. The MVP is an *organizing layer* over an existing 20+ entity canon. Before writing the first line:

1. Read `mem://design/planning-hierarchy.md` — the 6-level rule is non-negotiable.
2. Read `mem://design/triageable-interface.md` — Capture/Triage already unifies 5 sources via one shared interface.
3. Read `mem://features/operators.md` — "Team" = Operators (humans + workflows + agents).
4. Read `mem://design/ocda-as-pipeline.md` — your "Triage queue" probably already exists as OCDA.
5. Reuse `<TriageCard>`, `<WalkMenu>`, `<TimeControls>`, `<MeasuresPanel>`, `<CanonGuardrail>`, `<OCDAStageChip>` everywhere. Don't build parallel components.

Ship the 7 surfaces, but wire each card with **Quest · Project · Operator · Provenance · Decision-link** chips so context never gets lost. That's the MVP. Anything less and you're building Trello.
