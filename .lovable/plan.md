

# Phase 2.10r — Fix the Spark/Quest confusion. Anchor SweetSync to a client. Honor the doc.

## What's wrong right now (quick truth)

You read it correctly. Today **Sparks and Quests have no `relationship_id`** — they live in your workspace as if they were yours. The doc is explicit: **Sparks/Quests are the SweetSync decomposition path for a specific client**. Sessions (SweetCycle) are the **session path for that same client**. Both advance the same underlying **workflow/capability** (Component) and write to **one shared truth model**.

So Sparks ARE for clients — but they can also reflect *your* internal builds (you are the client of your own SweetBOS). The fix isn't "remove Sparks from your view" — it's **make every Spark/Quest declare who it's for**, and give you two clean lenses: *Client SweetSync* vs *Internal SweetSync*.

I'll also stop using the word **compress** anywhere in the UI/copy (per your note) — replace with **"sessions advance"** / **"session-led path"** vs **"self-paced path"**.

---

## Tier 1 — Anchor + relabel (the core fix)

### 1. Add `subject` to Quests and Sparks (one client OR internal)
Tiny additive migration:
```sql
ALTER TABLE quests
  ADD COLUMN relationship_id uuid REFERENCES relationships ON DELETE SET NULL,
  ADD COLUMN scope text NOT NULL DEFAULT 'client'    -- 'client' | 'internal'
    CHECK (scope IN ('client','internal')),
  ADD COLUMN core_workflow_id uuid REFERENCES workflows ON DELETE SET NULL;
   -- declares the underlying workflow/capability this Quest advances

ALTER TABLE sparks
  ADD COLUMN relationship_id uuid REFERENCES relationships ON DELETE SET NULL,
  ADD COLUMN scope text NOT NULL DEFAULT 'client'
    CHECK (scope IN ('client','internal'));

-- Backfill: existing quests/sparks → scope='internal' (they were yours).
UPDATE quests SET scope='internal' WHERE relationship_id IS NULL;
UPDATE sparks SET scope='internal' WHERE relationship_id IS NULL;
```

A trigger keeps Spark.scope/relationship_id in sync with its parent Quest so they can never drift.

### 2. Splash a clear filter on `/sparks` and `/quests`
Top of page tab strip: **All · Internal (mine) · Client SweetSync** plus a relationship picker. Default = **Internal** so you stop seeing client work mixed in with your own. Each row gets a small "👤 Liz" or "🟣 {Client name}" chip so the scope is obvious at a glance.

### 3. Rename one route group, add explainer headers
- `/quests` and `/sparks` get a **PageHeader explainer** (canonical, from the doc): *"Sparks are the atomic unit of self-paced advancement. Sessions move things forward in a guided cadence; Sparks let progress happen between sessions. Both advance the same Components."*
- New section in sidebar: under **SweetSync**, a single entry **"SweetSync (self-paced)"** that opens `/sweetsync` — a per-relationship board of that client's active Quests + Sparks. The existing `/sweetcycle` (session-led board) stays. Sidebar makes the two paths visually adjacent so the duality reads clearly.

---

## Tier 2 — Wire the two paths to one truth (the doc's core ask)

### 4. The "Core Workflow" link — Quest → Workflow → Components
The doc's core sentence: *each workflow/capability is the core object*. Today Quests just float. Add `quests.core_workflow_id` (above) so every Quest declares which underlying workflow/capability it advances. On Quest detail:
- Top card shows the **Core Workflow** + its delivery variations (**Map · Machine · SweetSync** chips, click-to-toggle which variations apply).
- Below, the existing **Components advanced** list — but now sourced from `workflows.workflow_components` so it's consistent with the session path.

This is what closes the loop: a Session advancing Workflow X and a SweetSync Quest advancing Workflow X both write to the same Component maturity.

### 5. Session ↔ SweetSync bridge widget
On each `/relationships/$id` add a small **"Two paths · one truth"** strip:
```text
┌──────────────────── Workflow: Pre-call prep ────────────────────┐
│ Session-led    ▶ 2 sessions held · last Apr 12 · Component 60% │
│ Self-paced     ▶ 3 of 5 Sparks done · 2 awaiting confirm       │
│                                                                 │
│ Pre-filled from sessions: 4 inputs (✓ confirm to lock)          │
└─────────────────────────────────────────────────────────────────┘
```
Reads from existing data (sessions + sparks tagged with the same `core_workflow_id`). No new table. Makes the bridge visible per the doc's *Section 3*.

### 6. Story Trail honors the new model
`<StoryTrail>` already exists. Tweak the chapter labels to use the doc's vocabulary:
- "Spark completed by you" / "Spark completed with Liz" / "Spark completed for you" (mapped from `source_of_advancement` enum).
- Show the **scope chip** (Internal vs Client name) on every chapter so a Component's Story Trail shows both paths interleaved truthfully.

---

## Tier 3 — Vocabulary cleanup ("compress" → out)

A focused find/replace pass:
- "compress / compression" → **"session-led" / "advance through sessions"**
- Audit copy in: `/sweetcycle` PageHeader, `/sessions` explainers, Story Trail chapter labels, memory file `mem://features/sweetcycle-journey.md`, and the Engagement Plan explainer card.
- Add a memory rule so I never reintroduce it: `mem://design/canon-vocabulary.md` → "Never use compress/compression. Sessions *advance*; SweetSync *self-paces*. Both write to one shared truth."

---

## Tier 4 — Honest "open decisions" surface (Section 14 of the doc)

You said open decisions are not failures, they're decisions to mark honestly. Add a tiny `/settings/open-decisions` page that reads from a new `open_decisions` table (5 rows seeded from Section 14) — equivalency rules, maturity thresholds, evidence formalization, decomposition readiness. Each row is a placeholder we update as we calibrate. So you and I never pretend the system is more settled than it is.

---

## What I'm NOT doing this pass

- ❌ Building the Vault/Portal client renderer (still phase-3).
- ❌ Adding the 3Cs / governance lens UI (doc Section 6 — needed but not this pass).
- ❌ Auto-equivalency rules for "Session work pre-fills SweetSync Sparks" — schema lands now (`source_of_advancement`, `confidence` already exist), wiring the *automatic pre-fill* is its own pass once we have one real client running both paths.
- ❌ Renaming any tables. Sparks stay sparks. Quests stay quests.
- ❌ Touching the BizzyBots gallery, OCDA Cockpit, or anything we just shipped.

---

## Total inventory

**Migration (one):** add `relationship_id`, `scope`, `core_workflow_id` to quests; `relationship_id`, `scope` to sparks; sync trigger; seed `open_decisions` table.

**New files (3):**
- `src/components/scope-chip.tsx` — internal/client visual chip used everywhere a Spark/Quest is shown.
- `src/components/two-paths-strip.tsx` — the bridge widget on relationship detail.
- `src/routes/_app.sweetsync.tsx` — per-relationship self-paced board (mirrors `/sweetcycle` shape).

**Edited files (~7):**
- `src/routes/_app.sparks.index.tsx` + `_app.quests.index.tsx` — scope tabs + explainer header + scope chip on rows.
- `src/routes/_app.sparks.$id.tsx` + `_app.quests.$id.tsx` — show scope, core workflow, relationship link.
- `src/routes/_app.relationships.$id.tsx` — mount `<TwoPathsStrip>`.
- `src/components/app-sidebar.tsx` — add `/sweetsync` next to `/sweetcycle`.
- `src/components/story-trail.tsx` — scope chip on chapters; vocabulary tweaks.
- Vocabulary sweep in `_app.sweetcycle.tsx`, `engagement-plans.$id.tsx`, memory files.

**Memory:**
- `mem://design/canon-vocabulary.md` (new) — never use "compress."
- `mem://features/two-paths.md` (new) — Sessions advance, SweetSync self-paces, both write to one truth via `core_workflow_id`.
- Update `mem://design/canon-sparks-vs-tasks.md` → add scope rule.

---

## Suggested order

1. **Migration + scope chips on lists** — you immediately stop seeing client work mixed with yours.
2. **Sidebar `/sweetsync` board** — per-client self-paced view goes live.
3. **Two-paths strip on relationship detail** — the bridge becomes visible.
4. **Vocabulary sweep + open-decisions page** — clean copy + honest unknowns.

Each step ships independently. Approve and I start at #1.

