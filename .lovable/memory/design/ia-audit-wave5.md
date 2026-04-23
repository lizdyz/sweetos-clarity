---
name: IA audit — Wave 5
description: Route-by-route audit of every page in src/routes scored against Liz's existing canon (Decision Factory, OCDA, Two Paths, 5 Ps, sidebar IA). No new vocabulary introduced.
type: design
---

# IA audit — Wave 5

Every route in the app, scored against frameworks Liz has already canonized. No invented layers. Read this top-to-bottom in 3 minutes; it explains what every room does.

**Vocabulary keys**
- **DF** (Decision Factory): `Data` (Data pipeline) · `Algo` (Algorithms) · `Exp` (Experimentation) · `Infra` (Infrastructure) · `—` (none/cross-cutting)
- **OCDA**: `O` Observe · `C` Choose · `D` Decide · `A` Act · `—` (n/a)
- **Path**: `Session` · `SweetSync` · `Both` · `—`
- **5P**: P1 Purpose · P2 People · P3 Process · P4 Product · P5 Profit · `—`
- **Cadence**: Daily · Weekly · On-event · On-demand
- **Produces**: Decision · Artifact · Signal · Hand-off · Truth (taxonomy/canon) · `—`
- **Verdict**: ✅ Keep · ⬆ Surface better · ⬇ Demote to walk-menu · 🔀 Merge into <route> · 🛠 Hide-until-built

---

## TODAY group (sidebar always-open #1)

| Route | DF | OCDA | Path | 5P | Cadence | Produces | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| `/start` | — | — | — | — | On-demand | — | ✅ Keep (NEW) | Wave 5 front door — orientation cockpit. |
| `/today` | Algo | O→A | Both | P3 | Daily | Decision · Hand-off | ✅ Keep | Wave 4 decision surface — *the* daily landing once you know the system. |
| `/calendar` | Infra | A | Both | P3 | Daily | — | ✅ Keep | Visual time grid; complement to `/today`. |
| `/capture` | Data | O | Both | P1 | On-event | Signal | ✅ Keep | Inbox for raw input → proposals. The Data-pipeline mouth. |

---

## WORK group (sidebar always-open #2)

| Route | DF | OCDA | Path | 5P | Cadence | Produces | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| `/sandbox` | Algo | C | Both | P3 | Weekly | Decision | ✅ Keep | Triage table — run lenses, promote to work. The Choose room. |
| `/operate/ocda` | Algo | O→A | Both | P3 | Daily | Decision · Hand-off | ✅ Keep | OCDA Cockpit — Decision Factory made personal. |
| `/flightdeck` | Infra | O | Both | P2 | Weekly | Signal | ✅ Keep | Cross-relationship cockpit. |
| `/sweetcycle` | Infra | A | Session | P3 | On-event | Artifact | ✅ Keep | Active client journey board (Seed→Synthesize→Session→Sync→Ship). |
| `/sessions` | Exp | A | Session | P3 | On-event | Artifact · Decision | ✅ Keep | Sessions Bank — Mirror/Map/Machine/Sync runtime. |
| `/sweetscan` | Data | O | Both | P1 | Daily | Signal | ✅ Keep | Outside-in radar. The eyes & ears. |
| `/engagement-plans` | Infra | D | Session | P5 | On-event | Decision | ✅ Keep | Contract shape per relationship. |
| `/pipeline` | Algo | C | — | P5 | Weekly | Signal | ✅ Keep | Sales pipeline — same canon as work-graph. |
| `/campaigns` | Exp | A | — | P5 | On-event | Artifact | ✅ Keep | Outbound work container. |
| `/decisions` | Algo | D | Both | P3 | On-event | Decision | ✅ Keep | Decision log — the Decide ledger. |
| `/delegation` | Infra | C | — | P2 | Weekly | Hand-off | ✅ Keep | Delegation Register — what to systematize. |
| `/measures` | Algo | O | Both | P5 | Weekly | Signal | ✅ Keep | Objectives, KRs, KPIs, CSFs. |
| `/queue` | Data | O | — | P3 | Daily | Hand-off | ⬆ Surface better | Operator queue — currently isolated. Should be a tab inside `/operators`. Future merge. |
| `/planner` | Infra | C | — | P3 | Weekly | — | ⬆ Surface better | Distinct from `/calendar` but unclear when to use which. Future: tab on `/calendar`. |
| `/my-tasks` | — | A | — | P3 | Daily | — | 🔀 Merge into `/today` | Personalized tasks — Wave 4's `/today` already does this via `useMeOperator`. |

---

## PEOPLE group (sidebar always-open #3)

| Route | DF | OCDA | Path | 5P | Cadence | Produces | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| `/operators` | Infra | — | — | P2 | Weekly | Truth | ✅ Keep | Humans + workflows + agents. The unit-of-work room. |
| `/operators/$id` | Infra | A | — | P2 | On-demand | Hand-off | ✅ Keep + walk | Operator cockpit (Wave 2). |
| `/relationships` | — | — | Both | P2 | Daily | — | ✅ Keep | Clients & key people — the anchor. |
| `/relationships/$id` | — | O→A | Both | P2 | On-demand | — | ✅ Keep + walk | Relationship hub. |
| `/relationships/$id/sparkpath` | — | C | SweetSync | P2 | On-event | Artifact | ✅ Keep | Client-facing path renderer. |
| `/portals/$relationshipId` | Infra | — | Session | P2 | On-event | Artifact | ✅ Keep | Personalized HTML portal — Vault projection. |
| `/people` | — | — | — | P2 | On-demand | — | ✅ Keep | Contact directory. |
| `/projects` | Infra | A | Both | P3 | Weekly | Artifact | ✅ Keep | Project containers. |
| `/projects/$id` | Infra | A | Both | P3 | On-demand | Artifact | ✅ Keep + walk | Project detail. |
| `/tasks` | Infra | A | Both | P3 | Daily | — | ✅ Keep | Tasks list — atomic executable work. |
| `/tasks/$id` | Infra | A | Both | P3 | On-demand | — | ✅ Keep + walk | Task detail. |
| `/missions` | — | D | SweetSync | P1 | On-event | Decision | ✅ Keep | Top-level transformation goal. |
| `/missions/$id` | — | D | SweetSync | P1 | On-demand | Decision | ✅ Keep | Mission detail. (Walk: needs resolver — backlog.) |
| `/journeys` | — | C | SweetSync | P3 | On-event | — | ✅ Keep | Capability areas (12 fixed). |
| `/journeys/$id` | — | C | SweetSync | P3 | On-demand | — | ✅ Keep | Journey detail. (Walk: needs resolver — backlog.) |
| `/quests` | — | A | SweetSync | P3 | On-event | Artifact | ✅ Keep | Group Sparks → advance Components. |
| `/quests/$id` | — | A | SweetSync | P3 | On-demand | Artifact | ✅ Keep | Quest detail. (Walk: needs resolver — backlog.) |
| `/sparks` | Data | O | SweetSync | P3 | On-event | Signal | ✅ Keep | Atomic interactions (system-generated; canon hard rule — never manual tasks). |
| `/sparks/$id` | Data | O | SweetSync | P3 | On-demand | Signal | ✅ Keep | Spark detail. (Walk: needs resolver — backlog.) |

---

## LIBRARY group (sidebar collapsed)

The Library is the **Truth model** — definitions of what CAN exist. Read-mostly; edited rarely; referenced everywhere.

| Route | DF | OCDA | Path | 5P | Cadence | Produces | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|
| `/bizzybots` | Algo | C | Both | P3 | On-demand | — | ✅ Keep | 9 Lens agents (F1–F8 + 1). Interrogate any subject. |
| `/workflows` | Exp | A | Both | P3 | On-demand | Artifact | ✅ Keep | Stored, versioned, reusable workflows. |
| `/workflows/$id` | Exp | A | Both | P3 | On-demand | Artifact | ✅ Keep + walk(run) | Workflow detail. Walk-menu mounts on individual `workflow_run`. |
| `/session-templates` | — | — | Session | P4 | On-demand | Truth | ✅ Keep | Mirror/Machine/Map/Sync catalog. |
| `/playbooks` | — | — | Both | P4 | On-demand | Truth | ✅ Keep | How a service runs end-to-end. |
| `/components` | — | — | SweetSync | P4 | On-demand | Truth | ✅ Keep | Reusable building blocks (maturity-tracked L1→L5). |
| `/components/$id` | — | — | SweetSync | P4 | On-demand | Truth | ✅ Keep | Component detail. (Walk: needs resolver — backlog.) |
| `/personas` | — | — | — | P2 | On-demand | Truth | ✅ Keep | 4-dimension construct (Sector × Practice × Autonomy × Reg). |
| `/outcomes` | Algo | — | Both | P5 | On-event | Truth | ✅ Keep | 6 measurable result types. Weakest link until clients self-report. |
| `/library/jtbd` | — | — | — | P1 | On-demand | Truth | ✅ Keep | Jobs-to-be-done library. |
| `/library/ktis` | Algo | O | Both | P5 | On-event | Signal | ✅ Keep | Forward-facing signal trackers (predictions, not reports). |
| `/documents` | Data | A | Both | P4 | On-event | Artifact | ✅ Keep | Briefs, deliverables, assets. |
| `/domain-assessments` | Algo | O | Session | P1 | On-event | Decision | ✅ Keep | 22-domain maturity scoring. Living model (versioned). |
| `/vault` | Data | — | Both | P4 | On-demand | Artifact | ✅ Keep | All captured & generated files (the canonical memory view). |
| `/domains` | — | — | — | P1 | On-demand | Truth | ✅ Keep | 22 universal areas of excellence. CANON. |
| `/tenets` | — | — | — | P1 | On-demand | Truth | ✅ Keep | Industry-specific anchors. CANON. |

---

## SETTINGS group (sidebar collapsed)

The Settings room is **the Infrastructure component made editable** — rubrics, prompts, canon. Edit rarely; trust the OS.

| Route | DF | OCDA | Path | 5P | Cadence | Produces | Verdict |
|---|---|---|---|---|---|---|---|
| `/settings` | Infra | — | — | — | On-demand | Truth | ✅ Keep |
| `/settings/canon` | Infra | — | — | — | On-demand | Truth | ✅ Keep |
| `/settings/lens-canon` | Infra | — | — | — | On-demand | Truth | ✅ Keep |
| `/settings/lenses` | Infra | — | — | — | On-demand | Truth | ✅ Keep |
| `/settings/prompts` | Infra | — | — | — | On-demand | Truth | ✅ Keep |
| `/settings/spark-templates` | Infra | — | — | — | On-demand | Truth | ✅ Keep |
| `/settings/excellence` | Infra | — | — | — | On-demand | Truth | ✅ Keep |
| `/settings/open-decisions` | Infra | D | — | — | On-demand | Decision | ✅ Keep |
| `/settings/ux-audit` | Infra | — | — | — | On-demand | Signal | ✅ Keep |

---

## What each sidebar group does — in your language

### TODAY — *"What am I doing right now?"*
The live working surface. `/start` orients you, `/today` is your decision surface (Wave 4), `/calendar` is the visual time grid, `/capture` is the inbox. **Decision Factory role:** the Data pipeline + Algorithms outputs surface here daily.

### WORK — *"Run the work · triage · decide"*
The OCDA loop made operational. `/sandbox` is **Choose**, `/operate/ocda` is the cockpit for the whole loop, `/decisions` is the **Decide** ledger, the rest are domain-specific Act surfaces (`/sweetcycle`, `/sessions`, `/campaigns`, `/engagement-plans`, `/pipeline`). `/sweetscan` lives here because outside-in signal needs a triage destination. `/measures` lives here because measurement is part of the loop, not a museum. **Decision Factory role:** Algorithms (predictions) + Experimentation (tests) + Infrastructure (delegation, plans).

### PEOPLE — *"Operators, relationships, projects"*
Everything that has agency or receives work. **Operators first** because that's the unit-of-work canon (humans + workflows + AI agents share one table). Then the relationship anchor (`/relationships`), then everything that hangs off it (`/projects`, `/tasks`, `/missions`, `/journeys`, `/quests`, `/sparks`). **Decision Factory role:** Infrastructure — these are the actors and containers the OS routes work between.

### LIBRARY — *"Definitions · what CAN be done"*
The **Truth model**. Catalogs, templates, taxonomies. Read-mostly — these define what's possible; the WORK group runs instances of these definitions. The hard rule: never duplicate Library content into WORK. **Decision Factory role:** the OS-level vocabulary that the Algorithms and Experimentation components compose against.

### SETTINGS — *"Rubrics, prompts, team"*
The **Infrastructure component made editable**. Canon files, AI prompts, excellence rubrics, the team. Touched rarely — every edit propagates everywhere. **Decision Factory role:** Infrastructure itself. This is *where the OS is configured*.

---

## Reconciliation issues surfaced (advisory — no Wave 5 changes)

Cross-referenced against your 8-issue list:

1. **Component vs Module vs Capability** — `/components` covers Component (canon ✅). Module is not a route — confirmed correct. Capability is derived (no route needed) ✅.
2. **Quest produces 1 Deliverable** — `/quests/$id` enforces 1:1 in current schema. Map/Machine outputs flow through `session_outputs` (route: `/sessions/$id` → produces panel). Working as canon dictates.
3. **Map/Machine work counting toward SweetSync** — currently NOT wired. `/sessions/$id` should write evidence back to component maturity. **Backlog item, not Wave 5.**
4. **Domain Assessment versioning** — `/domain-assessments` route exists; living-model behavior (append-only versions) needs verification. **Backlog item.**
5. **SweetCycle as state machine** — correctly modeled as `session.stage`, no separate route. ✅
6. **Deliverable Catalog vs instances** — Catalog ≈ `/documents` library + `/session-templates`; instances live on session/quest detail pages. Naming clarification needed in canon. **Backlog item.**
7. **Reflection — Spark vs lifecycle** — both currently flow through `/sparks`. Lifecycle reflection events need their own surface. **Backlog item.**
8. **8 Modules page** — no `/modules` route exists. ✅ Already merged into Workflow Catalog tagging.

## Framework-lens overlay (F1–F8) — surfaces, not routes

Per your canon: F1–F8 are **view layers**, not navigation. Confirmed: no framework-named routes exist. They surface as:
- **F1 OCDA** — `/operate/ocda` cockpit + ocda_stage column on tasks/decisions
- **F4 5Ps** — tags on Components/Domains/Decisions; 5P health on Relationship detail
- **F6 5Ls** — `current_maturity_level` on Components; Excellence rubric in Settings
- **F2 Gestalt / F3 4Ds / F5 3Cs / F7 Co-Evolution / F8 Rhetorical** — surfaced via Lens Wall (BizzyBots), not as navigation. Working as canon dictates.

---

## Verdict roll-up

- **Keep as-is**: 60 of 65 routes
- **Surface better (future wave)**: 2 (`/queue`, `/planner`)
- **Merge into another route (future wave)**: 1 (`/my-tasks` → `/today`)
- **New in Wave 5**: 1 (`/start`)
- **Hidden / not-built**: 0
- **Walk-menu live**: tasks, projects, sessions, workflow runs, operators, relationships
- **Walk-menu backlog**: components, quests, sparks, decisions, missions, journeys (resolvers needed)

**Net effect of Wave 5:** zero routes deleted, one route added, walk-menu rolled out where resolvers exist, audit doc as the new shared vocabulary.
