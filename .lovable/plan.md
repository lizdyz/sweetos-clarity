

# Tighten the UX Auditor with a hard required-presence checklist

Your other LLM is right: the current `ux-audit` edge function scores routes against canon rubrics, but it doesn't enforce a **mandatory component-presence check** with auto-HIGH severity. That's the missing teeth. This pass adds it.

---

## What changes

### 1. New audit rule layer in `supabase/functions/ux-audit/index.ts`

Before the AI scoring runs, a **deterministic source scan** checks the route file (and any components it imports) for the seven required-presence items. Each miss is appended to `findings` with `severity: "high"` and a fixed `rule` + `fix_hint` — the AI can't soften or skip them.

Checklist (mirrors your other LLM's section 10):

| # | Required item | Detection method | Applies to |
|---|---|---|---|
| 1 | `<CanonGuardrail entityKind="...">` mounted at top of body | Regex: `<CanonGuardrail\s+entityKind=` present in route source | All entity detail pages (`/quests/$id`, `/sparks/$id`, `/components/$id`, `/missions/$id`, `/relationships/$id`, `/projects/$id`, `/tasks/$id`, `/operators/$id`, `/journeys/$id`, `/sessions/$id`, `/workflows/$id`, `/personas/$id`, `/playbooks/$id`, `/session-templates/$id`, `/decisions/$id`, `/outcomes/$id`, `/engagement-plans/$id`, `/domain-assessments/$id`, `/domains/$slug`, `/tenets/$slug`) |
| 2 | `<TimeControls table=... rowId=...>` mounted | Regex: `<TimeControls\s` present | Actionable detail pages (tasks, sessions, projects, quests, missions, outcomes, workflows) |
| 3 | `<MeasuresPanel subjectType subjectId>` present | Regex: `<MeasuresPanel\s` present | Any page where measures attach (project, relationship, session, mission, outcome, component, domain, tenet) |
| 4 | `<DomainTenetChips>` rendered as TWO parallel selects | Detect: `<DomainTenetChips` AND no merged `tags` prop combining domains+tenets | Any filter/edit surface that exposes both axes |
| 5 | Status field uses `<StageSwimlanes>` not plain `<Select>` | Detect: presence of `status` field with a plain `<Select>` and absence of `<StageSwimlanes>` for that field | Index pages with a status column; detail pages with status changes |
| 6 | Sparks creation UI absent/locked | Regex: any `INSERT into sparks` from client OR a "New Spark" button on a non-system surface = HIGH violation | All routes |
| 7 | Rollup data read from canonical view, not re-derived in JS | Detect: presence of expensive client-side `.reduce()` / `.filter()` aggregations on raw table queries when a documented view exists (e.g. `relationship_domain_maturity`, `time_grid`, `measure_health`, `operator_workload`, `component_build_pipeline`, `relationship_journey`) | Index pages |

### 2. Scope-aware enforcement

Not every rule applies to every route. The function will hold a small **route-classification map** so the auditor knows which rules are mandatory for which kind of page:

```ts
type RouteKind =
  | "entity_detail"      // requires #1, #4 (if applicable), #6
  | "actionable_detail"  // requires #1, #2, #4, #5, #6
  | "measure_subject"    // requires #1, #3, #6
  | "index"              // requires #5, #6, #7
  | "settings" | "operate" | "library" | "other"
```

The classifier is a literal lookup table keyed by route path — no inference, no drift. Adding a new route requires adding a row, which is the right friction.

### 3. Findings shape (new fields)

Each presence-check failure produces:

```ts
{
  severity: "high",
  axis: "canon",
  rule: "CANON_REQUIRES_<COMPONENT>",      // machine-readable
  rule_name: "Canon Guardrail must be mounted on entity detail pages",
  description: "<file> is classified as entity_detail but does not mount <CanonGuardrail>.",
  fix_hint: "Add `<CanonGuardrail entityKind=\"quest\" />` near the top of the page body, above the tabs.",
  detected_by: "presence_check",            // distinguishes deterministic vs AI findings
  canon_ref: "mem://design/entity-canon"
}
```

`detected_by: "presence_check"` is new — it lets the cockpit visually separate hard rule violations from AI-judgment findings.

### 4. Score impact (canon axis)

Canon score on the 1–5 scale now has a hard ceiling driven by presence checks:

- 0 violations → AI judges 1–5 freely
- 1 violation → canon score capped at 3
- 2 violations → capped at 2
- 3+ violations → capped at 1

The AI can't paper over missing components with eloquent prose. This is the teeth.

### 5. Cockpit UI — `/settings/ux-audit`

Two small additions to `_app.settings.ux-audit.tsx`:

- A **"Required-presence violations"** group at the top of each run's findings (collapsed by default if zero, expanded if any). Renders as a red-bordered list with the `fix_hint` as the primary action text.
- A new column in the runs table: **"Canon misses"** (count of presence-check failures). Sortable. Lets you see at a glance which routes are most off-canon without opening each run.

### 6. `mem://features/ux-auditor.md` update

Append a new section documenting:
- The presence-check rule list (so future canon edits stay in sync)
- The route-kind classifier table
- The score-cap formula
- How to add a new required-presence rule (one place to edit: a `PRESENCE_RULES` const at the top of the edge function)

---

## Files touched

1. `supabase/functions/ux-audit/index.ts` — add `PRESENCE_RULES`, `ROUTE_CLASSIFIER`, `runPresenceChecks()`, fold results into the existing findings array, apply canon-score cap before insert
2. `src/routes/_app.settings.ux-audit.tsx` — add presence-violations group + "Canon misses" column
3. `mem://features/ux-auditor.md` — document the new layer
4. `mem://design/audit-cadence.md` — note that canon misses are now the headline KPI, not the AI scores

No DB migration needed. No new tables. The existing `ux_audit_runs.findings` jsonb already accepts the new shape.

---

## What this is NOT

- Not changing the AI prompt itself — the AI keeps doing nuanced judgment work; the presence layer runs **before** it and constrains the canon score
- Not auto-fixing anything — every finding still requires a human to mount the missing component
- Not enforcing presence on routes the classifier marks as `other` — index pages don't need `<CanonGuardrail>`, settings pages don't need `<TimeControls>`
- Not running on every page load — still manual click only

---

## After this lands

The auditor stops being polite. Pick any entity detail route, click Run, and you'll see the seven mandatory components either ✓ present or ❌ missing with the exact JSX snippet to paste in. The canon score becomes a real number, not a vibe.

Reply **"Run presence-check upgrade"** and I'll ship it.

