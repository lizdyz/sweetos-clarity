

# Wave 13 — Entity Canon as a knowledge graph + finish Wave 12

Two things to land together: make `/settings/canon` a place where you can **add** entities and **see how they connect**, and close out the Wave 12 loose ends so capture pollination is actually live in the UI.

## Part A — Entity Canon: add new + show the knowledge graph

### What's there now
14 entity kinds (Component, Domain, Journey, Mission, Operator, Outcome, Project, Quest, Relationship, Session, Spark, Task, Tenet, Workflow) — read & edit only. No "+ New", no relationships visible.

### What to add

**1. "+ New entity kind" button (admin only)**
Opens a sheet with: `entity_kind` (lowercase slug, immutable), `display_name`, `one_liner`, status. Inserts into `entity_canon`. After save, it appears in the left rail like the others.

**2. Knowledge graph — parents & children**
Two new arrays on `entity_canon`:

| column | purpose |
|---|---|
| `parent_kinds` text[] | "this entity lives inside / is owned by" (e.g. Task → Project, Session → Engagement Plan) |
| `child_kinds` text[] | "this entity contains / spawns" (e.g. Project → Task, Quest → Spark) |
| `peer_kinds` text[] | "associates with at the same level" (e.g. JTBD ↔ Persona) |

Plus a `composition_notes` text field for nuance ("a Task can also belong to a Campaign or stand alone").

**3. New "Knowledge Graph" tab on `/settings/canon`**
Two views, toggle in the header:

- **List view** (per-entity) — on each canon detail, show three small chip rows under the header:
  ```
  ▲ Parent kinds:   [Project] [Engagement Plan]
  ▼ Child kinds:    [Task Comment] [Subtask]
  ↔ Peers:           [JTBD] [Component]
  ```
  Click a chip → jump to that entity's canon. This is the navigation graph.

- **Map view** (whole system) — a single Mermaid graph rendered from all `parent_kinds` / `child_kinds` rows. Honest reflection of what's declared. No layout magic — Mermaid auto-lays it out, dark/light aware.

**4. Add JTBD + Persona + Campaign to the canon**
Three obvious omissions from your current 14. Seed rows so the graph doesn't lie.

### Files
- Migration: `alter table entity_canon add column parent_kinds text[] default '{}', add column child_kinds text[] default '{}', add column peer_kinds text[] default '{}', add column composition_notes text;` + insert 3 seed rows (jtbd, persona, campaign)
- Edit `src/routes/_app.settings.canon.tsx` — add "+ New entity" sheet; add Map tab; render parent/child/peer chips on detail
- New `src/components/entity-canon-graph.tsx` — Mermaid renderer reading all canon rows
- Edit `src/components/entity-canon-tab.tsx` + `src/components/canon-guardrail.tsx` — show the parent/child chip row so the graph is visible from every entity detail page, not just from settings

## Part B — Close out Wave 12 (the 6 unfinished items)

From the previous wave, these were left dangling. All small, all need to happen for the pollination work to show up in the UI:

1. **Persist pollination columns** in `proposals.functions.ts` — the helper passes already run; the INSERT just needs to write `intent`, `matched_personas`, `matched_jtbds`, `matched_quests`, `matched_sparks`, `matched_ktis`, `suggested_kti_payload`.
2. **Render `<CapturePollinationChips>`** on `/capture` queue cards (component exists, just unmounted).
3. **Mount `<JTBDChips>`** on `_app.tasks.$id.tsx`, `_app.projects.$id.tsx`, `_app.campaigns.$id.tsx`.
4. **JTBD detail "Work in flight" panel** on `_app.library.jtbd.$id.tsx` — read the `jtbd_work_pipeline` view that already exists.
5. **Memory doc** `mem://design/capture-pollination.md` — codify the four-pass pipeline + persona-scoped rule.
6. **Switch `workflows.functions.ts` + 4 edge functions to `getPrompt`** — the loader exists, the call sites still use inline strings. (Lowest risk to do alongside.)

## Sequencing

1. Migration: parent/child/peer columns + seed JTBD/Persona/Campaign canon rows (~15%)
2. `/settings/canon` "+ New" sheet + parent/child/peer chip rows + Mermaid map tab (~30%)
3. Surface parent/child chips on `<EntityCanonTab>` and `<CanonGuardrail>` (~10%)
4. Wire pollination INSERT + mount `<CapturePollinationChips>` on Capture queue (~15%)
5. Mount `<JTBDChips>` on Task/Project/Campaign detail + JTBD "Work in flight" panel (~15%)
6. Switch remaining 5 AI call sites to `getPrompt` + memory doc (~15%)

## Not in this wave

- No sidebar changes
- No new top-level routes
- No deletions
- No edits to auto-generated files
- The Mermaid graph reads what canon declares — it does not auto-infer from FK definitions (that's a future wave if ever)

After Wave 13: `/settings/canon` becomes the place to **add entity kinds**, see **how they fit together** as a graph, and judge any instance against canon — and capture pollination is actually visible everywhere it was promised in Wave 12.

Reply **"Run Wave 13"** to ship in this order, or **"Just the canon graph + add button first"** to land the entity-canon work before closing Wave 12.

