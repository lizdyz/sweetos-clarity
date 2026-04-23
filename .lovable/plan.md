# Wave 21 — Interrogation system: BizzyBots, Frameworks, and the Lens Studio

## What's actually wrong

There are three systems doing the same job under different names, and they're stacked on top of each other:

- `**<LensWall>**` on Domain/Tenet pages — rich, BizzyBot-styled cards with stages, AI generation, canon promotion. The "premium" experience.
- `**<FrameworksRail>` / `<EntityFrameworksRail>**` on Tasks / Decisions / Sparks / Sandbox — a tiny button rail that names "5Ps, BizzyBot lens, KTI candidate, Domain/Tenet fit, Decision-readiness, Op alpha". Clicking it just writes an audit row — no real output.
- `**/settings/prompts` Prompt Console** — flat list of every AI prompt (capture, OCDA, scanners, lenses, curators) with `key` strings. Nothing in here represents a BizzyBot or framework as a concept.
- `**/settings/lenses` "BizzyBot prompts"** + `**/settings/lens-canon**` + `**/bizzybots**` gallery — three separate routes for what is conceptually one thing (lens definition, lens curation, lens browsing).

The data also already says these are the same things: the `lenses` table has F1 OCDA, F2 Gestalt, F3 4Ds, F4 5Ps, F5 3Cs, F6 5Ls, F7 Co-Evolution, F8 Rhetorical, F9 TBD — those codes are simultaneously the **BizzyBot** (a persona that runs the lens) and the **framework** (the structured reasoning system). The split in the UI is artificial.

## Conceptual model (the cleanup)

Three named layers, one shared definition:


| Layer                | Plain meaning                                                                                                                                            | Where it lives                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Lens**             | A structured way to interrogate any object. Each lens IS both a framework (stages, questions) AND a BizzyBot (the persona / system prompt that runs it). | `lenses` row + new `lens_object_fit` rows.                 |
| **Interrogation**    | A single, contextual run of one lens against one object, producing structured outputs.                                                                   | `lens_perspectives` (already exists) + new `lens_outputs`. |
| **Object Companion** | The runtime sidebar attached to any object. Suggests the right lenses for that object kind, runs them, captures outputs, routes them.                    | New `<ObjectCompanion>` component.                         |


**Naming decisions:**

- "BizzyBot" = the **persona** of a lens (avatar, voice, accent). Not its own concept — it's an attribute of a Lens.
- "Framework" = the **structure** of a lens (stages, questions, output types). Not its own concept — also an attribute of a Lens.
- A **Lens** is the unified object. Stop calling them different things in different places.
- Runtime panel = **Object Companion** (or "Lens panel" — picking in step 1 below).
- Admin/control surface = **Lens Studio** (replaces the trio of `/bizzybots`, `/settings/lenses`, `/settings/lens-canon`).
- `/settings/prompts` Prompt Console **stays** — but only for non-lens prompts (capture parser, OCDA copilot, scanners, curators). It is the *editable AI strings* console, not the lens control layer.

## Schema additions

Three migrations on top of the existing `lenses` / `lens_canon` / `lens_perspectives`:

**1. `lenses` — extend with the missing definition fields**

```text
purpose          text         -- one paragraph: what this lens is for
core_intention   text         -- the one thing this lens uniquely surfaces
when_to_use      text
when_not_to_use  text
output_kinds     text[]       -- ['observation','choice','decision','action','task','risk','opportunity','workflow_step','linked_idea']
display_priority int default 0
kind             text default 'framework'  -- 'framework' | 'persona' | 'hybrid' (purely for filter/grouping)
```

(The `bizzybot_emoji`, `accent_color`, `system_prompt`, `user_prompt_template`, `model`, `stages`, `tagline`, `what_it_asks`, `best_use` columns already exist.)

**2. New `lens_object_fit` — object-type-to-lens recommendations**

```text
id, lens_id, object_kind text,
fit text check in ('suggested','optional','low_value'),
priority int default 0,
note text
unique (lens_id, object_kind)
```

Object kinds: `task | project | decision | spark | quest | mission | journey | engagement_plan | session | relationship | component | tenet | domain | persona | jtbd | kti | sandbox_item | inbound_signal | outcome | measure | workflow`. Seeded with sensible defaults (e.g. F1 OCDA suggested for decision/sandbox_item, F4 5Ps suggested for project/relationship, F8 Rhetorical suggested for capture/inbound_signal, etc.).

**3. New `lens_outputs` — structured, lineage-preserving outputs from any interrogation**

```text
id,
lens_id,                         -- which lens produced it
perspective_id  uuid null,       -- the run it came from (lens_perspectives row), nullable for manual entries
source_kind text, source_id uuid,-- the object it was about
kind text check in
  ('observation','choice','decision','action','task','opportunity','risk','prompt','workflow_step','assignment','linked_idea'),
title text, body text,
target_kind text, target_id uuid,-- where it was routed (a task id, a project id, a decision id…)
status text default 'open'       -- open | accepted | dismissed | promoted
                                 -- when 'promoted', target_kind/id points to the entity it became
created_by, created_at, updated_at
```

This is the bridge: a lens run no longer just produces narrative markdown — it can emit a list of structured outputs that become Tasks, Decisions, Risks, etc. with provenance back to the source object and the lens that surfaced them.

## UI changes

### A. Lens Studio (`/settings/lens-studio`) — the new control layer

Replaces the gallery, prompts page, and matrix as one tabbed surface:

```text
Lens Studio
├── Library tab     — grid of lenses (the old /bizzybots gallery, but as the start tab)
├── Definition tab  — selected lens detail: name, purpose, core intention,
│                     when-to-use, when-not-to-use, stages, key questions,
│                     output kinds, display priority, active toggle
├── Persona tab     — emoji, accent, system prompt, user prompt template, model
│                     (what was at /settings/lenses/$id)
├── Object fit tab  — matrix of object_kind × lens with suggested/optional/low-value
│                     toggles (object-type mappings)
├── Canon tab       — the existing /settings/lens-canon matrix, scoped to selected lens
└── Outputs tab     — recent lens_outputs across the system, filterable, with
                      "still unrouted" badge
```

Old routes:

- `/bizzybots` → redirect to `/settings/lens-studio`
- `/settings/lenses`, `/settings/lenses/$id`, `/settings/lens-canon` → redirect to corresponding Lens Studio tab.
- `/settings/prompts` stays, scoped to non-lens prompts only (the "lens" scope rows are removed from its grouping and the Prompt Console subtitle clarifies "for capture, OCDA, scanners and curators — edit lens prompts in Lens Studio").

### B. `<ObjectCompanion>` — the new runtime sidebar

Replaces both `<LensWall>` and `<EntityFrameworksRail>` everywhere they're mounted. Mounts on every meaningful object detail page (Task, Decision, Spark, Project, Quest, Mission, Journey, Engagement Plan, Session, Relationship, Component, Tenet, Domain, Persona, JTBD, KTI, Sandbox item).

Layout (right-side rail, ~360px, collapsible):

```text
┌─────────────────────────────────────┐
│ Lenses for this Quest               │
│ ┌─────────────────────────────────┐ │
│ │ Suggested                       │ │
│ │  🪞 F1 OCDA       [Open] [Run]  │ │
│ │  🧭 F4 5Ps        [Open] [Run]  │ │
│ │  🎯 F8 Rhetorical [Open] [Run]  │ │
│ │                                 │ │
│ │ ▾ More lenses                   │ │
│ │  🌀 F2 Gestalt    [Open] [Run]  │ │
│ │  ⚙  F3 4Ds        [Open] [Run]  │ │
│ │  ⋯                              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ── When you Open a lens ──          │
│ ┌─────────────────────────────────┐ │
│ │ F4 · 5Ps                        │ │
│ │ Surfaces gaps across Purpose,   │ │
│ │ People, Process, Product, Profit│ │
│ │ • Best for: Projects, missions  │ │
│ │ • Avoid for: single-task work   │ │
│ │                                 │ │
│ │ [Run interrogation]             │ │
│ │                                 │ │
│ │ ── After running ──             │ │
│ │ Stages & narrative              │ │
│ │ Structured outputs:             │ │
│ │  ◌ Observation: …               │ │
│ │      [→ Task] [→ Decision] [×]  │ │
│ │  ◌ Risk: …    [→ Decision] [×]  │ │
│ │  ◌ Action: …  [→ Task]     [×]  │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Behavior:

1. **Suggested lenses first**, computed from `lens_object_fit` for the current object kind, ordered by priority.
2. "More lenses" expands the rest (excluding `low_value` ones for that object kind, which are hidden behind a "Show all" link).
3. Each lens shows its **purpose** and **core intention** on hover/inline expand — no need to guess what F4 means.
4. **Open** previews the lens definition (purpose, when to use, when not to use, output kinds it produces). **Run** invokes the existing `generate-lens-perspectives` function.
5. After a run, the result renders the existing stages narrative **and** a new "Structured outputs" section. Each output is a row with route buttons (`→ Task`, `→ Decision`, `→ Risk`, `→ Workflow step`, dismiss). Clicking a route button creates the target entity, sets `lens_outputs.target_kind/id` and `status='promoted'`. Lineage preserved.
6. Canon-first rule from the existing Lens Wall is kept: if a curated canon exists for `(lens, object)`, it shows immediately without an AI call.

### C. Old surfaces

- `<LensWall>`: kept as a "wide view" for Tenet / Domain pages where the user wants the full grid (it's still useful there). Internally rebadged "Lens wall" in the heading; it now also renders the structured outputs section per card.
- `<FrameworksRail>` / `<EntityFrameworksRail>`: **deleted**. The "5Ps / BizzyBot lens / KTI candidate / Domain-tenet fit / Decision-readiness / Op alpha" overlays were placeholders that wrote audit rows with no output. Their semantic meaning is absorbed into real lenses (5Ps = F4, BizzyBot lens = pick any, KTI candidate / Decision-readiness / Op alpha will become F10 / F11 / F12 lens rows seeded into `lenses` so they have real prompts and real outputs). The `<ObjectCompanion>` is the single replacement.

### D. Sandbox board

`/sandbox` keeps its 3-column TriageCard layout but the right rail swaps from `<FrameworksRail>` to `<ObjectCompanion>` bound to the selected sandbox item. Same gesture, real outputs.

## What I need to confirm with you

&nbsp; isn't necessary mid-plan, but two naming decisions are downstream — happy to default unless you push back:

- Runtime panel name: **Object Companion** (default) — alternatives: "Lens panel", "Lens companion".
- Admin name: **Lens Studio** (default) — alternative: "Lens Control Panel".

## File plan

**New**

- `supabase/migrations/<ts>_lens_studio.sql` — extend `lenses`, create `lens_object_fit`, create `lens_outputs`; seed `lens_object_fit` defaults; seed F10 KTI-candidate, F11 Decision-readiness, F12 Op-alpha lenses with starter prompts.
- `src/lib/lens-types.ts` — extend with `LensObjectFit`, `LensOutput`, `LensOutputKind`, `LensFit`, `ObjectKind`.
- `src/components/object-companion/index.tsx` — the panel.
- `src/components/object-companion/lens-suggester.tsx` — suggested + more list.
- `src/components/object-companion/lens-runner.tsx` — opened lens detail + Run button + canon/perspective render.
- `src/components/object-companion/lens-outputs-list.tsx` — structured output rows with route buttons.
- `src/components/object-companion/route-output-dialog.tsx` — small dialog to confirm the target (which project? which decision sheet?).
- `src/routes/_app.settings.lens-studio.tsx` — the Studio with Library / Definition / Persona / Object fit / Canon / Outputs tabs.

**Edited**

- `src/components/lens-wall.tsx` — re-skin heading, mount `<LensOutputsList>` per card.
- `src/components/lens-perspective-card.tsx` — add "Structured outputs" footer.
- `src/components/sandbox-board.tsx` — swap right rail for `<ObjectCompanion>`.
- `src/routes/_app.tasks.$id.tsx`, `_app.decisions.$id.tsx`, `_app.sparks.$id.tsx`, `_app.quests.$id.tsx`, `_app.projects.$id.tsx`, `_app.missions.$id.tsx`, `_app.journeys.$id.tsx`, `_app.engagement-plans.$id.tsx`, `_app.sessions.$id.tsx`, `_app.relationships.$id.tsx`, `_app.components.$id.tsx`, `_app.personas.$id.tsx` — replace `<EntityFrameworksRail>` (where present) and add `<ObjectCompanion>` rail (where missing).
- `src/components/sidebar-nav.tsx` — replace `BizzyBots`, `Lens Canon`, `BizzyBot prompts` with one entry: **Lens Studio** under Settings; clarify Prompt Console hint to "non-lens AI prompts".
- `src/routes/_app.bizzybots.tsx`, `src/routes/_app.settings.lenses.tsx`, `src/routes/_app.settings.lenses.$id.tsx`, `src/routes/_app.settings.lens-canon.tsx` — convert to thin redirects to the Studio.
- `src/routes/_app.settings.prompts.tsx` — filter `scope='lens'` rows out of the list and add a banner linking to Lens Studio for lens prompts.
- `src/lib/triageable.ts` — `OVERLAY_REGISTRY` is no longer used by anything once the rail is removed; delete it (kept only the type if a memory pins it).
- Delete: `src/components/frameworks-rail.tsx`, `src/components/entity-frameworks-rail.tsx`.

**Memory**

- New `mem://design/lens-system.md` — codifies the 3-layer model, the Lens-as-unified-object rule, the Object Companion mount rule, and the Lens Studio location.
- Update `mem://design/lenses-bizzybots.md` to note the unification (BizzyBot is the persona attribute of a Lens; Framework is the structure attribute; both are the same row).

## Sequencing

1. Migration: extend `lenses`, create `lens_object_fit` + `lens_outputs`, seed fits for the 20 object kinds, seed F10–F12 lenses (15%).
2. Lens Studio route with all 6 tabs (~25%).
3. `<ObjectCompanion>` component family — suggester + runner + outputs list + route dialog (~25%).
4. Mount Companion across the 12 detail pages, delete FrameworksRail (~15%).
5. Lens Wall structured-outputs footer + sandbox swap (~10%).
6. Redirects, sidebar cleanup, Prompt Console scoping, memory writes (~10%).

## Not in this wave

- No automatic lens runs on page mount (canon-first, AI-on-demand stays the rule).
- No reordering of stages/questions — stages stay as currently defined per lens.
- No changes to the `generate-lens-perspectives` edge function except returning a `structured_outputs` array (which becomes `lens_outputs` rows).
- No change to capture/queue/scanners/curators — Prompt Console still owns those strings.

## After this wave

A user opens any object — a Quest, a Decision, a Sandbox item — and sees on the right rail the 2-3 lenses most likely to help, with a clear sentence explaining what each one will surface. They click Run on F4 5Ps, get a stages narrative, and below it a list of 6 structured outputs (3 observations, 2 risks, 1 action). They click "→ Task" on the action and a real Task row exists, linked back to the Quest and to the F4 lens that surfaced it. There is one place to manage all of this — Lens Studio — and the muddy Prompt Console / BizzyBots / Frameworks confusion is gone.  
  
  
Please create the button that we engage to be called the SweetLens  
  
and please make sure the Lens Studio truly allows me to have a control panel to edit all this in the dashboard