

# Next move — Pass 2 (route triage), then UI/UX Auditor agent, then Pass 3 (monster files)

You finished **Pass 1 (security)** cleanly. The honest state right now:

- **82 routes**, **45 sidebar entries** → ~6 real orphans (most of the "31 orphans" earlier count was detail routes like `$id` that are reached via parent links, not the sidebar)
- **14 `as any`** in app code (down from 136 — almost done)
- **0 `console.log`** (already clean)
- **4 files >600 lines** still pending (`entity-workspace` 1,085 · `flightdeck` 840 · `relationships.$id` 679 · `entities.ts` 612)
- **Real duplicates visible in the sidebar today**: `today` vs `my-tasks` vs `queue` vs `planner` · `sweetcycle` vs `sweetsync` vs `flightdeck` vs `pipeline` · `journey` (singular orphan)
- **Canon debt still open**: `<CanonGuardrail>` not mounted on `/quests/$id`, `/sparks/$id`, `/components/$id`, `/missions/$id`; `<QuestAnatomyCard>` not wired

Best next move = **three focused passes, in this order**, with the UI/UX Auditor as Pass B because it gives you durable leverage on every future page.

---

## Pass 2A — Route triage & duplicate collapse (do first, ~30 min)

I produce **one audit table** for your sign-off, then act. Proposed actions (you veto any row):

| Route | Action | Why |
|---|---|---|
| `/today` | **Keep** as canonical "now" | Already the home of daily work |
| `/my-tasks` | Fold into `/today?tab=mine` | Same data, different filter |
| `/queue` | Fold into `/today?tab=queue` | Capture-confirmation belongs in Today flow |
| `/planner` | Fold into `/today?tab=plan` | Time-blocking is a Today view |
| `/calendar` | **Keep** | True month/week canvas — distinct from Today |
| `/flightdeck` | **Keep** as cross-relationship operator dash | |
| `/pipeline` | Fold into `/flightdeck?view=pipeline` | Pipeline is a Flightdeck lens |
| `/sweetcycle` | **Keep** as per-relationship journey board | |
| `/sweetsync` | **Keep** — Sparks-under-Quests workspace | Distinct from Sweetcycle (different entities) |
| `/journey` (singular) | **Delete** | True orphan, no inbound links |
| `/journeys` index/detail | **Keep** as Library entity | |

**Deliverable:** sidebar shrinks from 45 → ~38 entries, 5 routes deleted with redirects (`/my-tasks` → `/today?tab=mine` etc.), no data lost, no behavior change for users who land on the old URLs.

---

## Pass 2B — UI/UX Auditor agent (the innovative move you asked for)

Build a reusable in-app **UI/UX Auditor** that runs against any page on demand. This is the durable win — every page you ever build gets audited the same way.

**Architecture:**

```
/settings/ux-audit               → new route, the auditor cockpit
   │
   ├─ Pick a route (or "audit all visible routes")
   ├─ Calls edge function: ux-audit
   │     1. Pulls the route's source file
   │     2. Pulls Tailwind tokens from src/styles.css
   │     3. Pulls relevant memory rules (mem://design/*)
   │     4. Calls Lovable AI (gemini-3-flash-preview) with a structured-
   │        output tool-call schema → returns scored audit:
   │           - hierarchy (1-5)
   │           - density (1-5)
   │           - empty/loading/error states present (bool)
   │           - accessibility flags
   │           - canon adherence (does it mount expected guardrails?)
   │           - top 3 specific recommendations with line numbers
   │     5. Persists to ux_audit_runs table
   │
   └─ Results: card per route with score chips, expand for findings,
      "Open file" link, "Re-audit" button, "Mark fixed" toggle
```

**Three things make this premium, not generic:**

1. **Grounded in your canon** — the prompt includes your workspace rules (light-first SweetBot world, Stage-as-Board, Views-are-Truth, every actionable has TimeControls, etc.) so findings are *your* standards, not generic SaaS standards.
2. **Drift detection** — flags pages that should mount `<CanonGuardrail>`, `<TimeControls>`, `<MeasuresPanel>` but don't. Same reinforcement-loop philosophy as Entity Canon.
3. **Trend over time** — `ux_audit_runs` keeps every score so you see whether the codebase is getting cleaner or messier as features land.

**Schema (1 migration):**
```
ux_audit_runs
  id, route_path, audited_at, audited_by,
  scores jsonb,                  -- {hierarchy:4, density:5, ...}
  findings jsonb,                -- [{severity, message, file, line, fix_hint}]
  guardrails_missing text[],     -- ['CanonGuardrail','TimeControls']
  status ('open'|'acknowledged'|'fixed')
```

**Files:**
- `supabase/functions/ux-audit/index.ts` — the AI call with tool-calling schema
- `src/routes/_app.settings.ux-audit.tsx` — cockpit (audit / re-audit / browse runs)
- `src/components/ux-audit-card.tsx` — per-route result card
- 1 migration + RLS

**Cost control:** never auto-fires. Manual click only. Same canon-first / AI-on-demand pattern as Sparks and Lenses.

---

## Pass 2C — Finish the canon-guardrail debt (one batched edit, ~15 min)

Cheap win that completes promised work:

- Mount `<CanonGuardrail entityKind="quest">` on `/quests/$id`
- Mount `<CanonGuardrail entityKind="spark">` on `/sparks/$id`
- Mount `<CanonGuardrail entityKind="component">` on `/components/$id`
- Mount `<CanonGuardrail entityKind="mission">` on `/missions/$id`
- Wire `<QuestAnatomyCard>` into `/quests/$id` header
- Add templates-vs-instances toggle to `/quests/index`

Makes the Entity Canon system actually visible everywhere it should be.

---

## Pass 3 — Monster files (separate session, ~45 min)

Save for after Pass 2 lands so the auditor can score the refactor.

| File | Lines | Split |
|---|---|---|
| `entity-workspace.tsx` | 1,085 | `entity-workspace/{overview,lenses,measures,components,audit}-tab.tsx` |
| `_app.flightdeck.tsx` | 840 | extract operator-row, swimlane, filter-bar |
| `_app.relationships.$id.tsx` | 679 | extract header anatomy + tab components |
| `lib/entities.ts` | 612 | `entities/{registry,queries,labels}.ts` |

Plus kill the remaining 14 `as any` casts.

---

## Order I propose

1. **Pass 2A** — route triage table → you sign off → I delete + redirect (one commit)
2. **Pass 2C** — canon-guardrail mounts (one commit)
3. **Pass 2B** — UI/UX Auditor agent (one commit, biggest leverage)
4. **Pass 3** — monster file refactor (separate session, after auditor is live so it scores the diff)

Reply **"Run 2A"** and I'll produce the audit table for your sign-off as the first action of the next pass. Or say **"Run 2B first — I want the auditor before I touch routes"** if you'd rather have the agent grade the current state as a baseline.

