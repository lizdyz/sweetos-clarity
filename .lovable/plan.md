

# Wave 20 — Product Clarity & Actionability Audit

A focused architecture pass: every page declares **what · why · do · connects to · next**, OCDA becomes a real pipeline (not a label), and Open Decisions stops being a passive list.

---

## Part 1 — Audit findings

I reviewed all 60+ routes against five tests: purpose clarity, actionability, connection logic, system role, gaps. Grouping by severity:

### A. Passive when they should be active

| Page | Issue | Fix |
|---|---|---|
| `/settings/open-decisions` | Read-only list. No status change, no link to triggering work, no "promote to Decision". Lives in Settings but is actually operational. | **Move to `/decisions/open`**, add inline status cycle, add "Promote to Decision" action, link evidence. |
| `/sparks` | Index lists sparks but offers no triage gesture (Open / Snooze / Promote / Archive). | Mount `<TriageCard>` row actions. |
| `/delegation` | Shows handoffs but doesn't show "what stage is this in" or next valid action. | Add OCDA stage chip + next-action button. |
| `/measures` | Shows current vs target but no "log reading" or "open subject" CTA in the row. | Inline `Log reading` + `Open subject`. |
| `/vault` | Pure archive — no "use this", "link to entity", "re-classify". | Add 3 row actions. |
| `/library/jtbd`, `/library/ktis`, `/personas`, `/outcomes` | Library catalogs with no "where is this used" rollup. | Add usage chip → click filters list of using entities. |

### B. Connection logic missing

| Surface | Missing connection | Fix |
|---|---|---|
| Decisions detail | Doesn't show what created it (capture? proposal? KTI? sandbox?) or what it affects (tasks, projects, components). | Add **upstream/downstream rail** (`<DecisionImpactRail>`). |
| OCDA Cockpit Observe lane | Shows proposals + sparks but no inbound_signals or KTI fires. | Union all four sources into one Observe feed. |
| OCDA Choose lane | Only reads `tasks.ocda_stage='choose'`. No way to *enter* this stage from Observe. | Add "Move to Choose" action on each Observe card → writes `ocda_stage='choose'`. |
| OCDA Decide lane | Lists every decision ever made. Should be **just the active decide queue** (proposed + last 7 days). | Filter + add "Log decision" inline composer. |
| OCDA Act lane | Lists tasks but doesn't show workflow runs or session executions actively running. | Union `workflow_step_runs` where status='running'. |
| `/sandbox` → `/decisions` | Sandbox can promote to task/project/spark but **not to decision**. | Add `decision` to `DEFAULT_PROMOTE_OPTIONS`. |

### C. Naming / role mismatches

| Page | Problem | Fix |
|---|---|---|
| `/settings/open-decisions` | Not a setting — it's a live decision queue. | Move to `/decisions/open` (tab on Decisions index). |
| `/queue` vs `/sandbox` vs `/capture` | Three intake-ish surfaces; relationship not obvious. | Add a **flow strip** at top of each: `Capture → Sandbox → Queue → routed`. |
| `/my-tasks` vs `/tasks` vs `/today` | Overlap unclear. | One-liner role caption on each header that explicitly contrasts the others. |

### D. Pages that imply a workflow but don't support it

- **Decisions** implies "decide → supersede prior → notify affected" — no supersede picker, no notification.
- **OCDA** implies stage progression — but no row anywhere (task, decision, proposal) lets you click and *advance the OCDA stage* in one gesture.
- **Open Decisions** implies "calibration over time" — no audit of when status last moved.

### E. The OCDA verdict

OCDA today is **a label, not a pipeline**. The cockpit reads four queries but offers no way to move an item between stages. The `ocda_stage` column exists on tasks/projects/decisions but is rarely set and never edited. The system has the bones — we need three things to make it a real pipeline:
1. A universal **`<OCDAStageChip>`** that's editable (click to advance).
2. The cockpit's columns must be **drop targets**, not read-only buckets.
3. Every actionable detail page mounts the chip in a consistent slot.

---

## Part 2 — Implementation plan

### 1. PageHeader → contract upgrade (foundational)

`<PageHeader>` adds two required props that every route must fill in: `connectsTo` (chips → routes) and `nextSteps` (verb-led actions). Builds the "what · why · do · connects · next" frame into the component itself, so any page missing them fails review by being visibly empty.

```text
┌ icon  Title                                         [actions] ┐
│       One-sentence purpose.                                    │
│       What you can do · here · here · here                     │
│       Connects to: Capture · Decisions · OCDA                  │
│       Next: Triage 3 · Promote 2 · Archive 1                   │
└────────────────────────────────────────────────────────────────┘
```

Apply across the 12 highest-traffic routes in this wave (Today, Decisions, OCDA, Sandbox, Sparks, Tasks, Projects, Quests, Engagement Plans, Sessions, Operators, Relationships). The remaining routes get a follow-up pass.

### 2. Open Decisions — promote to first-class operational surface

- Move route from `/settings/open-decisions` to `/decisions/open` (sidebar moves from Settings to Work, under Decisions).
- Decisions index becomes tabbed: **All · Open (calibrating) · Recent · Superseded**.
- Each open decision row gets:
  - **Status cycle chip** — click cycles `open → exploring → calibrating → settled`.
  - **Provenance** — what raised it (capture / proposal / project / KTI), surfaced as a chip.
  - **Affects** — chips for the tasks, projects, components it gates.
  - **Primary action**: "Settle this" → opens dialog that creates a real `decisions` row, links it back via `supersedes`-style reference, marks the open decision `settled`.
  - **Secondary**: "Add evidence" (note + link), "Snooze 7d", "Reassign owner".
- Audit log every status change (already wired in Wave 19's generic CRUD trigger — confirm `open_decisions` is in the table list).

### 3. OCDA — make it a real pipeline

**a) Stage chip everywhere**
New `<OCDAStageChip subject={{kind, id, stage}} />` — click-to-advance dropdown (`observe → choose → decide → act → done`). Mount on:
- Task detail header
- Project detail header
- Decision detail header
- Proposal/sandbox row
- Spark detail header
- Triage cards (so Observe → Choose is one click)

**b) Cockpit becomes drag-aware**
Reuse `useDragToStatus` (already exists per memory). Each lane is a drop target writing `ocda_stage` on the dragged subject. Observe lane unions: `proposals` + `sparks` + `inbound_signals` + `kti_scans` (last 24h).

**c) Decide lane gets an inline composer**
"Log decision" button in the Decide column header → opens sheet with title + context + linked-from + supersedes. Writes to `decisions` with `ocda_stage='decide'`, status='decided'.

**d) Act lane unions running work**
Current tasks + `workflow_step_runs.status='running'` + active sessions (today's scheduled).

**e) Per-stage "next action" hint**
Empty state and per-card hint tells the user the verb: Observe→Frame, Choose→Weigh, Decide→Log, Act→Open.

### 4. Decision detail — impact rail

New `<DecisionImpactRail>` rendered right of the Decisions detail page (replaces / augments the current Frameworks rail when on a decision):

```text
Upstream
 • Captured from: capture #abc (link)
 • Raised by: open_decision "Component thresholds" (link)
 • Supersedes: decision "Old policy" (link)

Downstream  
 • Affects: 3 tasks · 1 project · 2 components
 • Notifies: @liz, @ops
 • Workflow runs created: 1 (link)
```

Pulled from `decisions` joins + `entity_audit_log` cross-references.

### 5. Cross-linking flow strips

Three small `<FlowStrip>` instances at top of the related pages:

- `/capture` → "**Capture** → Sandbox → Queue → Routed" (current step highlighted)
- `/sandbox` → same, current = Sandbox
- `/queue` → same, current = Queue

Each chip is a link. Removes the "what's the difference?" friction in one glance.

### 6. Library "where used" chips

For `/library/jtbd`, `/library/ktis`, `/personas`, `/outcomes`, `/components`, `/playbooks` — add a small "Used by N" chip per row that, on click, filters a side panel to the using entities. Read from existing junction tables / tag arrays.

### 7. Sidebar nudges (no IA rewrite)

- Move **Open decisions** out of Settings into Work (right under Decisions, label "Open Decisions").
- Add hint captions clarifying overlap: `/today` ("My live working surface · today only"), `/my-tasks` ("Everything assigned to me, all timeframes"), `/tasks` ("All tasks across the system").

### 8. Audit-trail integration

Every new action (OCDA stage advance, open-decision settle, decision impact link, library re-classify) flows through `logAuditEvent` so the new actionability is itself reviewable.

---

## Files

**New components**
- `src/components/ocda-stage-chip.tsx` — universal click-to-advance chip
- `src/components/decision-impact-rail.tsx` — upstream/downstream for decision detail
- `src/components/flow-strip.tsx` — Capture → Sandbox → Queue → Routed
- `src/components/library/used-by-chip.tsx` — popover with using entities
- `src/components/decisions/open-decision-row.tsx` — actionable row with cycle + settle
- `src/components/decisions/settle-decision-dialog.tsx`

**Edited components**
- `src/components/page-header.tsx` — add `connectsTo`, `nextSteps`
- `src/components/ocda-cockpit.tsx` — drop targets, Decide composer, union sources
- `src/components/triage-card.tsx` — add OCDA chip
- `src/components/sidebar-nav.tsx` — move Open Decisions; refine hints
- `src/lib/triageable.ts` — add `'decision'` to default promote options

**Routes**
- New: `src/routes/_app.decisions.open.tsx` (replaces settings route as primary)
- Edited: `src/routes/_app.decisions.index.tsx` (tabs), `_app.decisions.$id.tsx` (rail), `_app.operate.ocda.tsx` (drop), `_app.settings.open-decisions.tsx` (now redirects to `/decisions/open`), the 12 PageHeader routes

**Migration (one)**
- Confirm `open_decisions` and `decisions` are in the audit allow-list
- Add `open_decisions.settled_decision_id uuid references decisions(id)` for the "Settle this" link
- Add `decisions.raised_from_kind text` + `raised_from_id uuid` for explicit provenance

**Memory**
- New `mem://design/ocda-as-pipeline.md` — rule that every actionable subject mounts `<OCDAStageChip>`, cockpit is drag-aware, no read-only OCDA labels.
- New `mem://design/page-contract.md` — every page must declare what · why · do · connects · next via `<PageHeader>`.

---

## Sequencing

1. PageHeader contract upgrade + apply to 12 routes (~15%)
2. OCDA stage chip + drop targets in cockpit + Decide composer (~25%)
3. Open Decisions rebuild as actionable surface + route move (~15%)
4. Decision impact rail + provenance migration (~15%)
5. Flow strips + sidebar hint refinements (~5%)
6. Library "used by" chips across 6 catalogs (~15%)
7. Audit-trail wiring for all new actions (~10%)

## Not in this wave

- No full IA rewrite (sidebar groups stay).
- No new entity types.
- No rewriting Today, Sandbox, Flightdeck — they're already actionable; only their headers get the contract upgrade.
- No automatic OCDA stage inference — staying explicit-click for trust.

## After this wave

Open Decisions is a working operational queue, not a memo. Every actionable record carries a one-click OCDA chip. The cockpit moves work between stages by drag. Decision detail shows what raised it and what it affects. Every page header tells you what · why · do · connects · next in one glance — and the routes that don't fill those props are visibly incomplete, which surfaces the next wave's targets automatically.

