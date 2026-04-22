# Three things in one focused pass

You're asking for three connected fixes. I'll do all of them.

---

## Issue 1 — Settings sub-routes don't render

`src/routes/_app.settings.tsx` is a **leaf** with its own Profile/Team/Cadence tabs. It has no `<Outlet />`. The sidebar links (`/settings/prompts`, `/settings/spark-templates`, `/settings/lenses`, `/settings/excellence`, `/settings/open-decisions`) are sibling routes, but visually they have no shared chrome — and the "Team & profile" link points back at `/settings`, so it always looks like Settings "defaulted" to that tab.

**Fix:** Convert Settings into a **layout route** with a left-hand vertical nav rail and an `<Outlet />`. Move the existing Profile/Team/Cadence content into a new leaf `_app.settings.index.tsx`. Every Settings sub-page renders inside the same shell with the nav rail showing the active section.

```
/settings              → Profile · Team · Cadence (was the whole page)
/settings/prompts      → Prompt Console
/settings/spark-templates → Spark Library
/settings/lenses       → BizzyBot prompts
/settings/excellence   → Excellence rubric
/settings/open-decisions → Open decisions
/settings/canon        → Entity Canon (NEW — see Issue 3)
```

---

## Issue 2 — Quests don't match the proven model

Your old dashboard had **20 Quest templates** structured as `Journey × Level transition × Deliverable type × Duration` (e.g. *"Define Your Value Proposition" — Journey 1, L1→L2, 20 min, document*). The current 8 Quests are open-ended internal questions ("What is the smallest viable Portal?") with no journey, no level transition, no deliverable type, no duration. That's why the Angela one feels off — Quests aren't acting as templates that advance a Component from one maturity level to the next; they're acting as freeform prompts.  
  
please note that you need to asses and realize that quests for me might be different then quests for users - think this through deeply

**Fix:** Bring the canonical Quest model back as **first-class fields**, keeping what already exists.

**Schema migration** (`quests` add columns):

- `from_level` `maturity_level` — e.g. L1 Lacking
- `to_level` `maturity_level` — e.g. L2 Learning
- `deliverable_type` text — `document` / `system` / `strategy` / `template` / `sop` / `tool`
- `duration_minutes` int
- `quest_number` int — Quest #1, #2 within a Journey
- `is_template` boolean default false — distinguishes the canonical 20 templates from instances spawned for specific relationships

**Data migration:** seed the **20 canonical Quest templates** from your old dashboard list (12 L1→L2, 8 L2→L3) attached to the matching Journeys. Existing 8 internal "What is..." quests are kept but moved under a new `prompt_quests` concept (or simply tagged `kind='reflection'`) so they don't pollute the canonical catalog.

**UI:**

- `/quests` index — group by Journey, show level-transition badge (L1→L2), duration chip, deliverable-type chip, template vs instance toggle
- `/quests/$id` detail — show the full anatomy: Journey · Level transition · Duration · Deliverable type · Components advanced · Framework lens
- "Start this Quest for [Relationship]" button — clones template into an instance bound to a relationship + project

Memory rule added: *"Quests are canonical Journey × Level-transition templates with duration + deliverable type. Instances are clones bound to a relationship."*

---

## Issue 3 — No "what perfection looks like" surface per entity (the reinforcement loop)

This is the most important one. You want a place where every entity type (Quest, Spark, Component, Mission, Outcome, Workflow, Session, Operator, Domain, Tenet, Relationship, Project, Task, Journey) has a **canonical definition** — what it IS, what good looks like, what bad looks like, what reinforcement loop keeps it sharp. So when you look at *Angela: recruiter scorecard schema*, you can ask *"does this match what a Quest should be?"* — and if not, refine either the instance or the canon.

**New schema** (1 migration):

```
entity_canon
  id, entity_kind text UNIQUE       -- 'quest' | 'spark' | 'component' | 'mission' | …
  display_name text
  one_liner text                    -- "A Quest is a level-transition template…"
  what_it_is text                   -- long-form definition
  what_good_looks_like text[]       -- checklist
  what_bad_looks_like text[]        -- anti-patterns
  inputs text[]                     -- what feeds it
  outputs text[]                    -- what it produces
  reinforcement_loop text           -- how it self-improves
  example_ids uuid[]                -- pointer(s) to canonical exemplar instances
  alternate_viewpoints jsonb        -- [{ name, description }] — refinement angles
  updated_by uuid, updated_at timestamptz
  
entity_canon_revisions               -- audit trail of edits, with rationale
  id, entity_kind, snapshot jsonb, changed_by, changed_at, rationale text
```

**Seed:** populate the 14 entity kinds with first-pass definitions extracted from the memory files (`mem://design/canon-sparks-vs-tasks`, `mem://features/sweetcycle-journey`, etc.) so every entity has a starting canon on day one.

**UI — `/settings/canon**` (the new home):

- Left rail: list of all 14 entity kinds with status pip (defined / draft / needs review)
- Right pane: editor for the selected kind with all the fields above + revision history
- "Compare to instances" panel — pulls 3–5 random live instances and shows them side-by-side with the checklist; flag any that miss criteria

**UI — every entity detail page** (Quest, Spark, Component, etc.) gets a small `<CanonGuardrail>` strip at the top:

- "What good looks like" checklist (auto-rendered from `entity_canon.what_good_looks_like`)
- "Refine this instance" button — opens the canon for context
- "This instance teaches the canon" button — promotes a great instance into `example_ids` and optionally proposes new criteria back to the canon (the **reinforcement loop**)

**Reinforcement loop (the part you specifically asked for):**

- When you mark an instance as exemplary → it becomes a referenced example on the canon
- When you flag an instance as off-canon → optionally edit the canon with rationale, recorded in `entity_canon_revisions`
- The Canon dashboard shows "drift" — instances that fail any of the `what_good_looks_like` checks. So the system constantly tells you *"these 4 Quests don't match what a Quest should be — fix them or sharpen the definition."*

Memory: new file `mem://design/entity-canon.md` + Core rule *"Every entity kind has a canonical definition in `entity_canon`. Detail pages render canon guardrails. Drift is surfaced, not hidden."*

---

## Order of operations (one pass)

1. **Migration A** — Settings layout: convert `_app.settings.tsx` to layout w/ Outlet + create `_app.settings.index.tsx` with the existing Profile/Team/Cadence content
2. **Migration B (DB)** — Add `from_level`, `to_level`, `deliverable_type`, `duration_minutes`, `quest_number`, `is_template`, `kind` columns to `quests`
3. **Migration C (DB)** — Create `entity_canon` + `entity_canon_revisions` tables + RLS
4. **Migration D (data)** — Seed 20 canonical Quest templates from your old dashboard list, attach to journeys; reclassify existing 8 quests as `kind='reflection'`
5. **Migration E (data)** — Seed `entity_canon` rows for all 14 entity kinds with first-pass definitions
6. **Files (parallel writes):**
  - `src/routes/_app.settings.tsx` — convert to layout shell with left nav rail + Outlet
  - `src/routes/_app.settings.index.tsx` — Profile/Team/Cadence (moved out)
  - `src/routes/_app.settings.canon.tsx` — Entity Canon editor
  - `src/routes/_app.quests.index.tsx` — group by Journey, show templates vs instances, level-transition + duration + deliverable chips
  - `src/routes/_app.quests.$id.tsx` — full Quest anatomy + "Start for relationship" action
  - `src/components/canon-guardrail.tsx` — reusable strip for entity detail pages
  - `src/components/quest-anatomy-card.tsx` — Journey × L→L × Duration × Deliverable
  - `src/components/app-sidebar.tsx` — add `/settings/canon` link
7. **Mount `<CanonGuardrail entityKind="quest" />**` on `/quests/$id`, `/sparks/$id`, `/components/$id`, `/missions/$id` to start (others follow as the canon is filled)
8. **Memory:** `mem://design/entity-canon.md`, `mem://features/quests-canonical.md`, update index Core

---

## What this is NOT

- Not deferring SparkPath Phase B/C, Blockers/Wins routes, or Erica migration — those resume after
- Not deleting the existing 8 reflection quests — re-tagging them
- Not auto-mutating instances when canon changes — every "fix to canon" is human-confirmed

After this lands: Settings tabs work, Quests match your proven 20-template model, and every entity has a living definition with a reinforcement loop that surfaces drift instead of hiding it.