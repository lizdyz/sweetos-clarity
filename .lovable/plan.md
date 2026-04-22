

# System Audit & Refactor — a 4-pass cleanup, not one giant rewrite

You're right that the system has accumulated. Here's the honest state:

- **78 route files**, only **47 reachable from the sidebar** → 31 orphaned routes
- **18 components written but never imported** anywhere
- **136 `as any` casts** in app code, **4 of the top 5 files exceed 600 lines** (one is 1,085)
- **9 ERROR-level Supabase linter findings** (Security Definer views) + 1 WARN
- **13 routes that look like they overlap**: `today`, `my-tasks`, `queue`, `planner`, `calendar`, `capture`, `journey` vs `journeys`, `sweetcycle` vs `sweetsync` vs `flightdeck`, `pipeline`
- A singleton `QueryClient` pattern (against TanStack Start guidance), `console.log` left in code, no dedupe of canon/lens patterns

The right way to attack this is **not** one mega-PR. It's 4 small, themed passes — each independently approvable, each leaves the system better than it found it, none of them break running features. You decide which to run, in what order.

---

## Pass 1 — Security & DB hygiene (lowest risk, highest payoff)

Fix what the linter is telling us is actually dangerous.

- **Recreate the 9 Security Definer views** with `security_invoker = true` — these views currently bypass the caller's RLS, which is a real privilege-escalation surface. (We already did this once for `workflow_step_pipeline`; same pattern for the rest: `relationship_journey`, `relationship_domain_maturity`, `time_grid`, `measure_health`, `operator_workload`, `component_build_pipeline`, `excellence_checklist_progress`, `lens_canon_status`.)
- **Set `search_path = public` on the 1 function flagged** by the WARN.
- **Run `security--run_security_scan`** and triage anything new.
- **Add a `db-views` README** in `supabase/` that lists every view + which page reads it (enforces "Views are truth" memory rule).

Output: 1 migration, 0 UI changes. Zero risk to running features.

---

## Pass 2 — Route consolidation & dead-code removal

Stop carrying ghosts. This is the clarity pass.

**Audit:** I'll produce a single table — Route × is-linked × last-meaningful-update × proposed-action — and walk through it with you before deleting anything. Suspected duplicates today:

| Likely keep | Likely retire / fold |
|---|---|
| `today` (canonical "now" view) | `my-tasks`, `queue`, `planner` (fold into `today` tabs) |
| `sweetcycle` (per-relationship journey) | `journey` singular (orphan) |
| `flightdeck` (cross-relationship operator dash) | possibly `pipeline` if redundant with `flightdeck` filters |
| `journeys` index/detail (Library) | — |
| `capture` (intake) | — |

**Component cleanup:** delete the 18 unused components after verifying with one more round of grep + LSP. Confirmed unused so far: `calendar-zoom-toggle`, `help-sheet`, `mini-calendar`, `planner-add-popover`, `protagonist-anchor-card`, `signal-scanner-config`, `lens-tile-grid`, `lens-stage-stepper`, `spark-explainer-card`, `sparks-for-component-panel`, `curator-panel`, `domain-tenet-chips`, `component-chip`, `session-template-picker`. **Hold** on `canon-guardrail`, `quest-anatomy-card`, `lens-perspective-card`, `workflow-step-sheet` — these are slated for the canon-guardrail mounts we already approved and are not yet wired.

**Sidebar reconciliation:** every kept route appears in sidebar exactly once; every retired route either redirects or 404s.

Output: 1 audit table for your sign-off, then ~15 file deletions, sidebar update, redirects for retired URLs. No new features.

---

## Pass 3 — File-size & type-safety refactor (the "monster files")

The four files over 600 lines are doing too much.

| File | Lines | Refactor |
|---|---|---|
| `entity-workspace.tsx` | 1,085 | Extract per-tab subcomponents (Overview, Lenses, Measures, Components, Audit) into `components/entity-workspace/*.tsx` |
| `_app.flightdeck.tsx` | 840 | Extract operator-row, swimlane, and filter-bar components |
| `_app.relationships.$id.tsx` | 679 | Extract header anatomy + tab components |
| `lib/entities.ts` | 612 | Split into `entities/{registry,queries,labels}.ts` |

**Type safety:** kill the 55 `as any` in app code (excluding `routeTree.gen.ts` which is autogen). Most are missing types from older Supabase schema reads — regenerate types and replace casts with proper row types.

Output: 0 behavior changes, but every file becomes legible and the type errors stop hiding bugs.

---

## Pass 4 — Architectural patterns alignment

Bring the code in line with the rules we've been writing into memory.

- **`QueryClient` lives in `getRouter` factory**, not as a module singleton (TanStack Start invariant — currently risks SSR cache leakage between requests).
- **Mount the canon guardrails** we already shipped: `<CanonGuardrail entityKind="quest" />` on `/quests/$id`, plus `spark`, `component`, `mission`. (Carrying-over commitment from the entity-canon plan.)
- **Wire `<QuestAnatomyCard>`** into `/quests/$id` and the templates-vs-instances toggle into `/quests`. (Carrying-over commitment.)
- **Remove stray `console.log`** statements (only 1 left — easy).
- **Add a `mem://design/audit-cadence.md`** rule: "Run audit pass after every 5 feature additions; no route ships without a sidebar entry."

Output: ~6 file edits, finishes the canon work we already paid for.

---

## How I propose we run this

1. **You approve the 4-pass framing** (this plan).
2. I run **Pass 1 (security/DB)** first — single migration, zero risk, gets the linter green.
3. I produce the **Pass 2 audit table** and we triage routes together before I delete anything.
4. **Pass 3** in one batched refactor session.
5. **Pass 4** to close out canon-guardrail debt and align patterns.

Each pass = one approval, one focused commit, one clean memory update. No big-bang refactor. Nothing rendered today disappears without you saying "yes" first.

---

## What this is NOT

- Not deferring SparkPath Phase B/C, Blockers/Wins, or Erica migration — those resume after Pass 1 (the security pass is a non-blocker).
- Not deleting any data. Migrations are view-recreates only.
- Not changing any feature behavior in Pass 1, 3, or 4. Only Pass 2 removes routes — and only with your explicit sign-off on the audit table.
- Not touching `routeTree.gen.ts`, `types.ts`, or `client.ts` — all autogen.

Reply with **"Run Pass 1"** and I'll ship the security-definer fix in one go. Or tell me to reorder the passes if a different one feels more urgent (e.g. "do route cleanup first — the orphans are bothering me").

