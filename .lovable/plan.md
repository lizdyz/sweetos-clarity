

# Phase 2.10aa — Audit findings + Forward plan

I audited the database, code, and route tree. Here's the actual state and what to ship next.

---

## What's working (✅ landed)

| Area | State |
|---|---|
| Canonical Journeys | 12 rows, correct names |
| User Components | 72, all linked to a journey, `kind='user'` |
| Platform Components | 16 (incl. 6 SparkPath surfaces from Phase A), `kind='platform'` |
| Internal Components | 2, `kind='internal'` |
| Components page toggle | `ComponentKindToggle` rendered + filtering + per-kind counts |
| SparkPath schema (Phase A) | 4 client_* tables + 1 seed template (22 sections, 55 questions) + `seed-uploads` bucket |
| SparkPath public renderer | `/p/$slug/seed` with paper-and-ink theme + autosave |
| SparkPath authoring | `/relationships/$id/sparkpath` overview (create + publish seeds) |
| Outcome auto-completion triggers | All 3 installed (quest/mission/journey → outcome.done_at) |
| Outcome `source_kind/source_id` columns | Added |

---

## What's pending or broken (❌ gaps)

### Sparks loop is unfinished (Phase 2.10y leftover)
- All 12 Sparks have **`quest_id = null`** (orphaned) and **no `affected_components`** (no link to what they help build)
- `/sparks` index has no "What is a Spark?" explainer
- No `<ComponentChip>` showing which Component a Spark advances
- No "Sparks for this Component" panel on `/components/$id`
- No "Generate Sparks" button or `generate-component-sparks` edge function
- **Net effect:** the Sparks → Components loop you asked for never closed

### Outcomes loop is unfinished
- Triggers exist, but all 8 outcomes still have `source_kind='manual'` (zero backfill)
- `/outcomes` UI has no status pip, no "Reflects: [Quest/Mission/Journey]" link
- **Net effect:** completing a Quest does nothing visible to Outcomes

### SparkPath only has 1 of 5 surfaces
- ✅ Seed (public renderer + authoring)
- ❌ Primer (no route, no table data, no AI hook)
- ❌ Mirror Portal (no `portal_sections` sub-table, no editor, no per-section AI assist)
- ❌ Clarity (no `clarity_jobs` sub-table, no editor, no Spark watcher)
- ❌ Sidebar/relationship-detail link to `/sparkpath` (route is registered but not navigable from UI)

### Angela record never landed
- Stub relationship exists (`Angela / Recruiter Intelligence`) with no status, no project, no decisions, no documents, no Scotia context
- No Voice-of-Customer Session Template / Workflow / steps from your interview-map copy
- **Net effect:** the canonical client demo doesn't exist — the system has no example to render itself with

### Missions = 0
- `missions` table exists but is empty
- `/missions` page renders but has nothing to show
- The 8 quests have no parent missions, so the Quest→Mission→Journey chain is broken at the Mission rung

### 2.10v Step 4–5 still pending
- No `/think/blockers` or `/think/wins` routes (sidebar slots empty)
- No Engagement-plan rollups or Ready-to-advance badges

### Minor wiring
- `/relationships/$id` has no link to its `/sparkpath` sub-page
- 9 session_templates exist but no Voice-of-Customer one (Erica's interview-map workflow)

---

## What to build — proposed Phase 2.10aa (one focused pass)

Three things in priority order. The first two close loops you've already asked for; the third unblocks the demo.

### Part 1 — Close the Sparks → Components → Outcomes loop (MUST)

This is the loop you flagged in your "I don't understand sparks" feedback. All schema is in place; only data + UI work remains.

**Migrations (data only, no schema):**
1. **Backfill Sparks** — set `affected_components` on each of the 12 Sparks based on its name (e.g. *Angela: recruiter scorecard schema* → Recruiter Intelligence Dashboard component). Pick the most logical Quest for each (4 of the 8 quests map cleanly) and set `quest_id` where appropriate.
2. **Backfill Outcomes** — set `source_kind` + `source_id` on each of the 8 outcomes pointing at a logical Quest (Mission lookup is empty, see Part 3).

**Edge function:**
3. `supabase/functions/generate-component-sparks/index.ts` — Lovable AI Gemini Flash. Takes a component, returns 3–5 proposed Sparks scoped to advance its current maturity. Service-role insert (bypasses the human-spark trigger).

**UI:**
4. **`/sparks` index** — collapsible "What is a Spark?" card at top + render `<ComponentChip>` per spark when `affected_components` is populated.
5. **`/components/$id`** — Journey breadcrumb, "Sparks for this Component" panel (read sparks where `affected_components @> [id]`), "Generate Sparks" button calling the edge function.
6. **`/outcomes` index + `/outcomes/$id`** — status pip (Done/Tracking/Manual), "Reflects: [Quest name]" link, "Auto-completed when X reached Complete" line for done outcomes.
7. **New components:** `src/components/component-chip.tsx`, `src/components/sparks-for-component-panel.tsx`.

### Part 2 — Wire the SparkPath sidebar/nav (MUST)

Right now `/relationships/$id/sparkpath` works only if you type the URL. Add:

8. **Link on `_app.relationships.$id.tsx`** — a "SparkPath" button/tab visible at the top of every relationship detail page.
9. **Sidebar entry** — under each opened relationship in the right rail, surface a "SparkPath" sub-item.

### Part 3 — Seed Angela + the Voice-of-Customer Workflow (DEMO UNBLOCKER)

5 small atomic migrations (so a single failure doesn't roll back everything):

10. **`seed_angela_full.sql`** — UPDATE Angela relationship with status, recommended package, intelligence summary (Scotia cancellation chain, Scott Parsons block); INSERT 1 project, 2–3 decisions, 1 audit document.
11. **`seed_voc_session_template.sql`** — INSERT "Voice of Customer Interview Map" session template using your exact 5-stage copy (Seed/Synthesize/Session/Sync/Ship).
12. **`seed_voc_workflow.sql`** — INSERT the matching workflow + 5 workflow_steps.
13. **`seed_angela_quest_link.sql`** — link the 2 Angela-named Sparks (`Angela: recruiter scorecard schema`, `Angela: dashboard handoff doc`) to the relevant quest + set `relationship_id`.
14. **`seed_one_mission.sql`** — INSERT one demo Mission ("Recurring Revenue Engine") to populate `/missions` and demonstrate the Quest → Mission → Journey rollup.

---

## What this is NOT (deferred)

- ❌ Phase B/C SparkPath (Primer authoring, Mirror Portal sections + per-section AI, Clarity + watcher) — separate pass once the loop above proves out the AI scoping pattern.
- ❌ 2.10v Step 4–5 (Blockers/Wins routes, Ready-to-advance badges) — next after this lands.
- ❌ Migrating Erica's existing live portal pages — they keep working at portal.sweetbot.ai.
- ❌ More relationships beyond Angela.

---

## Order of operations in this pass

1. **2 backfill migrations** (Sparks links, Outcomes links).
2. **5 atomic seed migrations** for Angela + VOC + 1 Mission.
3. **1 edge function** `generate-component-sparks`.
4. **6 file changes** (parallel writes):
   - `src/routes/_app.sparks.index.tsx` — explainer + chips
   - `src/routes/_app.components.$id.tsx` — Journey breadcrumb + Sparks panel + Generate button
   - `src/routes/_app.outcomes.index.tsx` — status pip + Reflects link
   - `src/routes/_app.outcomes.$id.tsx` — same
   - `src/routes/_app.relationships.$id.tsx` — SparkPath tab
   - `src/components/app-sidebar.tsx` — SparkPath sub-item under opened relationship
5. **3 new components:** `component-chip.tsx`, `sparks-for-component-panel.tsx`, `spark-explainer-card.tsx`.
6. **1 memory update** `mem://features/sparks-and-components.md` + index entry.

---

## Why this order

1. **Sparks loop is the single biggest UX clarification** — once a Spark visibly says "I help build Component X" and a Component visibly lists "Sparks that advance me," the system finally clicks.
2. **Outcomes auto-pip closes the dopamine loop** — completing a Quest immediately shows green on the Outcome.
3. **SparkPath sidebar/tab** — without it the work from Phase A is invisible.
4. **Angela + VOC** — gives every screen real demo data and proves the Workflow → Session → Steps chain renders your interview-map copy as live UI.
5. **One Mission seed** — fills the empty Mission rung so Quest → Mission → Journey rollups have a complete chain to demonstrate.

Approve and I run all 7 migrations + edge function + 6 file edits + 3 new components in one pass, reporting any chunk failures as they happen.

