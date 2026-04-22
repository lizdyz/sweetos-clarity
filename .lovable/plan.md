

# Phase 2.10q (revised) — Less new, more sharp. Story Trail in. Noise out.

You're right. Last plan was 13 new components and 3 new routes. That's noise. Here's the same intent, ranked, with most "new" stuff replaced by **upgrades to things we already have**.

---

## What I'm pulling — ranked by leverage

### 🟢 Tier 1 — High leverage, low surface area (build now)

#### 1. **Story Trail** — the single best pattern from sparkflow
A chronological **narrative timeline** of a Quest / Journey / Component / Relationship — chapters for completed milestones, the active one pulsing, locked ones dimmed. Reads like a story instead of a log.

**No new tables.** It's a *view* that composes data we already have:
- `sparks` (completed → chapter beats)
- `quests` + `quest_components` (chapter headers)
- `entity_audit_log` (timestamps + actors)
- `component_outputs` (artifacts produced — appear inline as "📎 PRD shipped here")
- `decisions` (decisions made — appear as inline diamonds)

**One new component** `<StoryTrail subject={...} />`, mounted as a tab on:
- `/quests/$id` (replaces flat list view)
- `/journeys/$id`
- `/components/$id` (the "how this Component matured" story)
- `/relationships/$id` (the "what we did together" story — also the basis of the future client portal recap)

This is the *audit trail made beautiful*, and it's the natural reading view of work. Highest leverage thing in the whole sparkflow project.

#### 2. **Upgrade the existing `/today` page** (don't replace it)
Today already has Overdue / Due Today / This Week / Blocked / Sessions / Relationships sections. Just add **two strips above** them:
- **OCDA tile strip** (Observe / Choose / Decide / Act counts, click → OCDA Cockpit) — 60 lines.
- **Decision Queue widget** (5 items waiting on me) — 40 lines.

No "Morning Scan" rebrand. No new file. Just enrich what's there. ~100 lines total.

#### 3. **Liz Dependency gauge on `/delegation`** (one component, no schema)
Read existing `delegation` rows, compute "% where `currently_done_by` = 'Liz' AND `can_be_delegated_to` is null" → big gauge + per-category bars at the top of `/delegation`. One component, ~150 lines. Makes the delegation register *visual* without any schema changes.

### 🟡 Tier 2 — Worth building, scope down to one component each

#### 4. **Spark Completion polish** (in place, no new flow file)
Edit the existing `_app.sparks.$id.tsx` to add:
- An **Impact Preview** strip at the top: "Completing this advances Component X · advances Quest Y · captures Z" — read straight from existing `sparks.affected_components` + `sparks.quest_id`.
- A small **completion celebration** (confetti + 1-second toast on save) — `canvas-confetti` lib, ~20 lines.

No `<SparkCompletionFlow>` orchestration component, no `<CelebrationSequence>` 4-step overlay. Same outcome, 1/10 the surface area.

#### 5. **Excellence Advisor as a sort, not a page**
Drop the `/operate/excellence-advisor` route. Instead: on the existing **Components list** and **Domains** pages add a **"Sort: Needs attention"** option that ranks by `(execution_gap × low_excellence_score)`. Users get the prioritized list without a new page to maintain.

### 🔴 Tier 3 — Cut from this pass

- ❌ **Pre-Assessment Wizard / AssessmentResults** — large surface, premature. We don't yet have enough seeded relationships for this to pay back. Defer to when onboarding is the bottleneck.
- ❌ **Agent Swarm gallery rework** — current `/bizzybots` already works. Retitle column groupings only if you want.
- ❌ **QuestMapView** as a separate component — Story Trail (Tier 1 #1) does the same job better with chapters.
- ❌ **OKRDashboard** — `<MeasuresPanel>` already exists. Add a small visual tweak (progress bar per KR) inside it, no new component.
- ❌ **BulkParseReview generalization** — wait until we hit the second use case.

---

## What this builds — total inventory

**New files (only 2):**
- `src/components/story-trail.tsx` — the chapter timeline component.
- `src/components/liz-dependency-gauge.tsx` — gauge + per-category bars.

**Edited files (5):**
- `src/routes/_app.today.tsx` — add OCDA tile strip + Decision Queue widget inline.
- `src/routes/_app.sparks.$id.tsx` — add Impact Preview strip + confetti on completion.
- `src/routes/_app.delegation.index.tsx` — mount `<LizDependencyGauge>` at top.
- `src/routes/_app.quests.$id.tsx` + `_app.journeys.$id.tsx` + `_app.components.$id.tsx` + `_app.relationships.$id.tsx` — add **Story Trail** tab.
- `src/components/measures-panel.tsx` — small KR progress-bar tweak.

**Dependencies:**
- `canvas-confetti` (~3KB).

**Schema changes: none.** Everything composes existing data.

**Memory:**
- `mem://design/story-trail.md` — Story Trail is the canonical narrative read of any subject's progress.
- Update `mem://index.md` Core: "Audit/progress reads as a Story Trail timeline; never a flat log when a Story Trail will do."

---

## Why this is the right move

You said: *"you're creating a lot of new things when maybe you should be optimizing"*. So:

- **Tier 1 ships in one pass.** It's two new components and four edited routes.
- **Story Trail is the headline.** It changes how you *read* the system without rebuilding it.
- **Tier 2 is in-place polish.** Sparks, /today, /delegation get sharper without new pages.
- **Tier 3 is parked, not deleted.** When onboarding becomes the bottleneck or the BizzyBots gallery actually feels cluttered, we revisit.

## Suggested order

1. **Story Trail** — `<StoryTrail>` component + Quest detail mount. *Single highest-impact change. Ship and feel it.*
2. **Mount Story Trail** on Journeys, Components, Relationships.
3. **`/today` enrichment** + **Liz Dependency gauge**.
4. **Spark Impact Preview + confetti**.
5. **MeasuresPanel KR bar tweak**.

Each step is 30–90 minutes and shippable on its own.

