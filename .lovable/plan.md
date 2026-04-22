

# Phase 2.10y — Re-run the canonical seed (it rolled back) · Add User-vs-Platform component toggle · Wire Sparks → Components → Outcomes loop

Three things in one pass:
1. **The previous canonical seed silently rolled back.** Database still shows 5 wrong Journeys, 18 components (no canonical 72), no Angela detail, no VOC workflow. I'll re-run it correctly in atomic chunks so partial failure doesn't roll back the whole thing.
2. **Add the User vs Platform toggle** you asked for on `/components` so you can see "components my advisors will need to build" separately from "the SweetBOS platform components I'm building."
3. **Wire the Sparks → Components → Outcomes loop** so Sparks become understandable as the system's mechanism for *suggesting what to build next*, and Outcomes auto-reflect Quest/Mission/Journey completion.

---

## Part 1 — Re-run the canonical seed (atomic this time)

Split the failed monolith into **5 small migrations** so each commits independently. If one fails, the rest still land:

1. **`migrate_journeys_canonical.sql`** — DELETE the 5 wrong journeys + INSERT the 12 canonical ones (Strategic Vision & Positioning … Performance Tracking).
2. **`seed_72_components.sql`** — INSERT the 72 universal components (6 per journey), each with `journey_id` set, `current_maturity_level='L1 Lacking'`, `component_kind='user'` (see Part 2). Idempotent via `WHERE NOT EXISTS (name, journey_id)`.
3. **`backfill_existing_components_kind.sql`** — set `component_kind='platform'` on the 10 SweetBOS platform components (Portal, Dashboard, etc.) and `component_kind='internal'` on the 8 pre-existing project components (Recruiter Intelligence Dashboard, etc.).
4. **`seed_angela_record.sql`** — UPDATE the existing Angela relationship stub with full Scotia context (cancellation chain, Scott Parsons block, recommended package). INSERT the project, decision, document, audit note. All `WHERE NOT EXISTS` guarded.
5. **`seed_voc_workflow.sql`** — INSERT the Voice-of-Customer Session Template, Workflow + 5 workflow_steps (Seed/Synthesize/Session/Sync/Ship), using your exact interview-map copy.

After each chunk, I verify with a SELECT count. If any fails, I show you exactly which one and why before continuing.

---

## Part 2 — User vs Platform component toggle

### Schema (one tiny migration)

Add `components.component_kind` enum:
- `'user'` — components every advisor's business needs to build (the 72 canonical)
- `'platform'` — SweetBOS product surface I'm building for them (Portal, Vault, LizBot, etc.)
- `'internal'` — Liz's own internal/project-specific components (Recruiter Intelligence Dashboard, etc.)

Default `'user'` for new rows. Backfill via Part 1, chunk 3.

### UI changes on `/components` index

Add a **3-tab toggle** at the top of the filter bar, before the Active/Stalled chips:

```
[ User components (72) ]  [ Platform (10) ]  [ Internal (8) ]
```

- **User components** — the 72 universal advisor components. Grouped visually by Journey (Strategic Vision & Positioning, Client Acquisition, etc.) with collapsible journey headers. This is your **"things every client will likely want to build"** view.
- **Platform** — the 10 SweetBOS surface components. This is your **"what I'm building"** view.
- **Internal** — the 8 pre-existing project-specific components.

Each tab pre-filters the list and the count badges in the header reflect the current tab. Domain/Tenet filters still work within the active tab.

### Detail page

`/components/$id` shows a small badge near the title indicating kind, plus a "Journey" breadcrumb chip linking back to the parent Journey when `journey_id` is set.

---

## Part 3 — Make Sparks actually make sense

You said *"I don't understand what the sparks are — they are supposed to help me create all the components."* That's exactly right, and right now they don't, because:

- The 12 existing Sparks have **no `quest_id`** (orphaned)
- They have **no `affected_components`** (don't link to what they help build)
- The Quests page doesn't explain the relationship
- There's no copy anywhere that says *"a Spark is a system-suggested next step toward building a Component"*

### Fixes (no schema change needed — the columns already exist):

**A. Backfill the 12 existing Sparks** with `affected_components` arrays based on their names (e.g. *"Angela: recruiter scorecard schema"* → links to Recruiter Intelligence Dashboard component). One-shot UPDATE migration.

**B. Add a "What is a Spark?" explainer card** at the top of `/sparks/index.tsx` (collapsible, dismissable):

> **Sparks are system-generated nudges toward building Components.** The system watches your Quests, Sessions, and conversations for moments where a small action would advance a real Component (or answer a real Question). You don't create Sparks — they appear. You triage them in the Queue, then either work them or convert them to Tasks.

**C. Show the Component link on every Spark card.** When `affected_components` is populated, the spark card displays a `<ComponentChip>` with the component name + maturity level. Clicking it opens the component detail page.

**D. Add a "Sparks for this Component" panel** on `/components/$id` — shows all Sparks where `affected_components @> [component.id]`, grouped by Quest. This is the inverse view: from a Component, see what the system is suggesting to advance it.

**E. Add a "Generate Sparks for this Component" button** on `/components/$id`. Calls a new edge function `generate-component-sparks` that uses Lovable AI (`google/gemini-2.5-flash`) to read the component's description + maturity threshold + current level, then proposes 3–5 specific next-step Sparks (with `generated_by_kind='agent'`, `affected_components=[component.id]`). User confirms before they're written. **This is the missing "Sparks help me build Components" loop.**

---

## Part 4 — Outcomes auto-reflect achievements

You said *"when the sparks/quests/journeys are achieved we need the outcomes to reflect them."* Right now Outcomes are static descriptions with no achievement linkage.

### Schema additions (one small migration)

On `outcomes`:
- `source_kind` enum: `'quest' | 'journey' | 'mission' | 'spark' | 'manual'` (defaults `'manual'`)
- `source_id uuid` — pointer to the achieving record
- `auto_completed_at timestamptz` — when the trigger marked it done

### Trigger logic

Three new SECURITY DEFINER triggers:

1. **`trg_quest_complete_outcome`** — when `quests.progression_state` transitions to `'Complete'`, mark any outcome where `source_kind='quest' AND source_id=quest.id` as done (`done_at = now()`, `auto_completed_at = now()`).
2. **`trg_mission_complete_outcome`** — same logic for missions.
3. **`trg_journey_complete_outcome`** — same for journeys.

Sparks don't get an outcome trigger (too granular — they roll up via Quests).

### Backfill outcomes

Update the 8 existing outcomes to set `source_kind` + `source_id` to point at the most logical Quest/Mission/Journey. e.g. *"Recurring revenue ≥ 30%"* → `source_kind='mission', source_id=<Recurring Revenue Engine mission>`.

### UI on `/outcomes`

Each outcome card shows:
- A status pip: `Done` (green) / `Tracking` (neutral) / `Manual` (muted)
- A "Reflects: [Quest/Mission/Journey name]" link when source is set
- For done outcomes: *"Auto-completed when [Quest X] reached Complete on [date]"*

---

## Order of operations in this pass

1. **Verify** Angela relationship ID, sparks scope/quest_id columns (already confirmed).
2. **5 atomic data migrations** for canonical seed (Part 1). I report success/failure per chunk.
3. **2 schema migrations:**
   - `add_component_kind_enum` + column
   - `add_outcome_source` columns + 3 triggers
4. **2 data migrations:**
   - Backfill `component_kind` on existing 18 components
   - Backfill `outcomes.source_kind/source_id` on existing 8 outcomes
   - Backfill `sparks.affected_components` on existing 12 sparks
5. **Code changes** (parallel writes):
   - `src/routes/_app.components.index.tsx` — add 3-tab kind toggle, group by Journey when User tab
   - `src/routes/_app.components.$id.tsx` — add Journey breadcrumb, Sparks-for-component panel, Generate Sparks button
   - `src/routes/_app.sparks.index.tsx` — add explainer card, show component chip per Spark
   - `src/routes/_app.outcomes.index.tsx` — add status pip + "Reflects:" link
   - New `src/components/component-kind-toggle.tsx`
   - New `src/components/sparks-for-component-panel.tsx`
   - New `src/components/component-chip.tsx`
6. **One edge function** `supabase/functions/generate-component-sparks/index.ts` — Lovable AI Gemini Flash, returns proposed sparks for confirmation.
7. **One memory update** `mem://features/sparks-and-components.md` documenting the loop, plus index update.

---

## What this is NOT

- Not finishing 2.10v Steps 4–5 (Blockers/Wins routes, Ready-to-advance badges) — resumes after this lands.
- Not seeding more relationships beyond Angela.
- Not changing the Sparks-are-system-only rule (the trigger stays intact; AI generation goes through service role).
- Not wiring Tasks → Outcomes (Tasks already roll up through projects → components; Outcomes complete via Quest/Mission/Journey only).

---

## Why this order

1. **The seed must land first** — without 12 journeys + 72 components, the User toggle has nothing to show.
2. **User/Platform toggle answers your direct question** — *"toggle to current/user components vs platform"* — and immediately makes the page useful as a reference library.
3. **Sparks-Components loop is the single biggest UX clarification** — once a Spark visibly says "I help build [Component X]" and a Component visibly says "Here are the Sparks that advance me," the entire system clicks.
4. **Outcomes auto-completion** closes the loop — when a Mission completes, you actually *see* the Outcome turn green, which is the dopamine hit that proves the system works.

Approve and I run all 7 migrations + code changes + edge function in a single pass, reporting any chunk failures as they happen.

