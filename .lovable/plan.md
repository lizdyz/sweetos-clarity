
# Landing your thinking platform into the real build

You have three "thinking platforms" — they are not three apps, they are **three views of one system at three altitudes**:

| File | Altitude | What it really is | Lives in the build as |
|---|---|---|---|
| `sweetbos_console_full_spec.html` | Operator (you) | The **operating console** — full IA, every entity, every page shell | The whole `_app/*` shell + canonical sidebar |
| `sweetbos_strategy_atrium_v5.html` | Operator (you) | The **Start Command Center** — daily brief + pedestal + 8-room journey | `/start` + `/sweetcycle` |
| `sweethub_portal_FINAL_2.html` | Client | The **client-facing portal** — ask bar, SweetCycle, 22 domains, maturity | `/portals/$relationshipId` (+ `/p/:slug` public) |

Nothing in those files needs to be thrown away. Most of it already has a home; some pieces are real gaps. The job is to make that mapping explicit, then ship in waves.

---

## 1. The goal (what "perfect" means here)

You will know you're done when:

1. **Every entity in the Console spec has a route and a detail page in the build** — no dead concepts, no orphaned chips.
2. **The three altitudes wire to each other**: Atrium (your day) → Console (your work) → Portal (their experience). One click moves between them with shared records.
3. **The Two-Rail spine from the lexicon is enforced everywhere**: Nudge Rail (Mission→Journey→Quest→Spark) generates; Work Rail (Campaign→Project→Task) executes; Sparks bridge.
4. **The five universal substrates appear on every actionable record**: TimeControls · WalkMenu · Triageable · MeasuresPanel · CribSheet+LensWall.
5. **The Console IA matches the spec sidebar groups**: Command · Clients & Scope · Workbench · Library · Review · Coordination · Admin.

---

## 2. Reconciliation map — every concept in the three files, where it lives

### A. Already built (just needs alignment, not new code)

| Console concept | Lives in build at |
|---|---|
| Command Center | `/start` (Start cockpit) |
| Clients/Prospects | `/relationships` |
| Engagements | `/engagement-plans` |
| Components | `/components` |
| Projects | `/projects` |
| Tasks | `/tasks`, `/my-tasks` |
| Decisions | `/decisions`, `/decisions/open` |
| Campaigns | `/campaigns` |
| Workflows | `/workflows` |
| Outcomes | `/outcomes` |
| Calendar | `/calendar` |
| Team / Operators | `/operators`, `/people`, `/flightdeck` |
| Handoffs | `/delegation` |
| Control Panel | `/settings/*` |
| SweetCycle (8-room journey) | `/sweetcycle` |
| Client Portal | `/portals/$relationshipId`, `/p/$slug` |
| 22 Domains + Maturity | `/domains`, `relationship_domain_maturity` view |
| JTBD | `/library/jtbd` |

### B. Concepts in the files with NO real home yet (the gap list)

| Missing surface | Source | What it is | Proposed route |
|---|---|---|---|
| **Notifications inbox** | Console sidebar | Alerts, pings, mentions, review requests linked to source objects | `/notifications` |
| **Risks register** | Console Workbench | Threats to quality/trust/delivery, with owner + mitigation | `/risks` |
| **Assets / Deliverables library** | Console Library | Reusable outputs (portals, prompts, templates, guides, code) linked to a Component | `/assets` (or rename `/documents`) |
| **Evidence library** | Console Library | Proof/source/rationale with confidence rating, supporting other objects | `/evidence` |
| **Insights library** | Console Library | Lessons that trigger improvements | `/insights` |
| **Portfolio (rollup)** | Console Review | Cross-system health — derived, no records | `/portfolio` |
| **Roadmap** | Console Review | Forward view across engagements | `/roadmap` |
| **Metrics dashboard** | Console Review | KPI/measure rollup as a destination, not just panels | `/metrics` |
| **Capacity view** | Console Review | Operator load forecasting | `/capacity` (extend `operator_workload`) |
| **Messages** | Console Coordination | Internal/client comms tied to records | `/messages` |
| **Atrium pedestal + 8-room journey** | Strategy Atrium | Today's hero brief + active room highlighted | Upgrade `/start` |
| **Client Ask bar + chip suggestions** | Portal | Command input on portal home | Upgrade `/portals/$relationshipId` |
| **22-domain + maturity scale visual** | Portal | Domains shown as a rendered map with maturity rings | Upgrade `/portals/$relationshipId` |
| **Support row (Liz / SweetSync inside portal)** | Portal | Embedded operator + nudge bot on the client surface | Upgrade `/portals/$relationshipId` |

### C. Naming/IA misalignments (rename, don't rebuild)

The live sidebar groups today (Today · Operate · Library · SweetSync · People · Taxonomies · Settings) differ from the Console spec. The spec's grouping is sharper for daily use:

```text
Console spec sidebar          Today's live IA
─────────────────────         ────────────────
Command                       Today
Clients & Scope               People (split)
Workbench                     Operate
Library                       Library
Review                        — (missing)
Coordination                  — (scattered)
Admin                         Settings
```

Action: adopt the Console spec grouping verbatim. It's already the locked IA in memory (`sidebar-ia`) — but the *labels* need updating to match, and **Review** + **Coordination** need to become real groups.

---

## 3. The four-wave staged checklist

Each wave is shippable in one Lovable build session. Don't try to do them in one shot.

### Wave 1 — IA alignment (no new entities)

Goal: the sidebar and route grouping match the Console spec, so every future surface has an obvious home.

- [ ] Rename sidebar groups to: Command · Clients & Scope · Workbench · Library · Review · Coordination · Admin
- [ ] Move existing routes into those groups (no route changes, just nav grouping)
- [ ] Add empty placeholder routes for the 5 Review pages (`/portfolio`, `/roadmap`, `/metrics`, `/capacity`) and the 2 Coordination pages (`/messages`, `/notifications`) with `PageHeader` + "coming in Wave 3" empty state — so links don't 404
- [ ] Update `mem://design/sidebar-ia` to lock the new grouping

### Wave 2 — The three altitude surfaces (visual upgrade, real data)

Goal: Atrium, Console homepage, and Portal feel like the HTMLs, against live data.

- [ ] **`/start` → Atrium pedestal layout**: hero brief + pedestal "today's focus" + 8-room journey rail reading from `relationship_journey`
- [ ] **`/portals/$relationshipId` → SweetHub portal layout**: identity card · command/ask bar with chip suggestions · 5-step SweetCycle · 8-room phase rail · 22-domain map with maturity rings · support row (operator + SweetSync nudge)
- [ ] **Console home shell**: confirm `_app.tsx` chrome (sidebar 270px · topbar 56px · content padding) matches the spec tokens. Tokens to `src/styles.css` only — no per-component colors.

### Wave 3 — Fill the gap entities (the real new build)

Goal: every Console concept has a working list + detail page.

- [ ] **Risks** — new table `risks` (owner_id, mitigation, severity, status, subject_type/id polymorphic), `/risks` list + `/risks/$id`, surface as `<RisksPanel>` on relationship/project/component detail
- [ ] **Evidence** — new table `evidence` (source, confidence 1-5, supports[]), `/evidence` list, attach via `<EvidencePanel>` on any record
- [ ] **Insights** — new table `insights` (lesson, trigger_improvement_to[], status), `/insights`
- [ ] **Assets / Deliverables** — extend existing `documents` table OR new `assets` table with kind enum (portal/prompt/template/guide/code) and required `component_id` link; `/assets`
- [ ] **Notifications** — new table `notifications` (subject_type/id, kind: alert/ping/mention/review, read_at), `/notifications`, bell badge in topbar
- [ ] **Messages** — new table `messages` (thread_id, subject_type/id, body, internal vs client), `/messages`

Each gets the five substrates mounted (TimeControls · WalkMenu · Triageable · MeasuresPanel · CribSheet+LensWall) per memory rules.

### Wave 4 — Review / rollup pages (derived, no new tables)

Goal: the four Review pages render real rollups from existing views.

- [ ] **`/portfolio`** — cross-relationship health card grid from `relationship_domain_maturity` + `operator_workload` + `measure_health`
- [ ] **`/roadmap`** — forward timeline from `time_grid` + `engagement_plans` scheduled_for
- [ ] **`/metrics`** — destination page for `measure_health` aggregated by domain/tenet
- [ ] **`/capacity`** — operator load forecast, 4-week window, from `operator_workload`

If a rollup needs data the view doesn't expose, **extend the view, not the page** (per `views-as-truth` memory rule).

---

## 4. Working method — how we actually run this

- One wave per build session. Don't mix waves.
- Before each wave I'll re-read the relevant HTML section and the live route, then write a tighter sub-plan for that wave (so we don't overshoot).
- New entities always come with: migration → list page → detail page → mount of the five substrates → walk-menu resolver entry. No half-shipped entities.
- Provenance is non-negotiable: anything spawned from a Spark, KTI, capture, or workflow writes `spawned_by_kind`/`spawned_by_id` (per `tasks-as-workbench` memory).

---

## Open question before Wave 1

One decision changes Wave 3 meaningfully:

**Assets vs Documents.** The Console spec has a top-level **Assets / Deliverables** page. The live build already has `/documents`. Two options:

- **(A) Rename and extend** `/documents` → `/assets`, add `kind` enum + required `component_id`. Cheaper, no data migration mess.
- **(B) Keep `/documents` as raw files, add a separate `/assets` for productized deliverables** (portals, prompts, templates). Cleaner conceptually, double the surface area.

Pick A or B and I'll start Wave 1 immediately after.
