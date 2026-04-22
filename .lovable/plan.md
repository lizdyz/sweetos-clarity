

# Phase 2.10j: Domain & Tenet crib sheets — Lens-aware best-practice pages

You want every Domain page and every Tenet page to feel like opening a **field guide** for that entity: quick facts up top, then the canonical Lenses (OCDA, 4Ds, 5Ps, 5Ls, Gestalt, 3Cs, Co-Evolution, Rhetorical) each weighing in *from their own perspective* on this specific Domain or Tenet. The BizzyBots (F1–F8) are the visual personas that voice each Lens.

You also named the deeper pattern correctly: this is a **system-level transformation layer**, not eight hand-written paragraphs per entity. One AI pass per (entity × lens) pair, cached, regenerated on demand. The page just renders what's cached.

Here's how it lands.

## The data model

### One new canon table — `lenses`
Seeded with the 8 BizzyBots so they're a first-class catalog (not hardcoded strings):
- `code` (F1–F8), `name` ("OCDA"), `tagline` ("Observe → Choose → Decide → Act"), `what_it_asks`, `best_use`, `stages text[]` (the ordered phases), `bizzybot_emoji / icon_key`, `accent_color`, `sort_order`.
- Read-only canon. Seeded by the migration. Editable only by admin via a future Lens settings screen.

### One new content table — `lens_perspectives`
The cached AI-generated crib sheet content:
- `id`, `lens_id` (→ lenses), `subject_kind` enum (`domain | tenet | component | relationship | mission | project`), `subject_id uuid`
- `quick_facts text[]` — 3–5 punchy bullets for the top of the page
- `perspective_md text` — markdown body: how this Lens sees this Domain/Tenet, walked through that Lens's own stages
- `key_questions text[]` — 3–5 questions this Lens would force you to answer
- `watch_outs text[]` — what this Lens warns about for this entity
- `next_actions text[]` — recommended next moves through this Lens
- `generated_at timestamptz`, `generated_by_model text`, `confidence numeric`, `version int`
- `is_pinned bool` (user can pin a hand-edited version so AI re-runs don't overwrite)
- Unique on `(lens_id, subject_kind, subject_id, version)`; latest version is what renders.

### One new top-of-page artifact — `entity_crib_sheets`
The *cross-Lens summary* that sits above the per-Lens cards:
- `subject_kind`, `subject_id`, `tldr text`, `core_principles text[]`, `quick_facts text[]`, `common_pitfalls text[]`, `signature_metrics text[]`, `generated_at`, `version`, `is_pinned`.
- One row per entity. Generated from the union of all Lens perspectives + the entity's own metadata (description, tagged_components, related sessions, etc.).

## The generation pipeline

**Server function `generate_lens_perspectives(subject_kind, subject_id, lens_codes?)`** in `src/utils/lenses.functions.ts`:
- Pulls the entity's row + description + any related rows (components linked, tenets in the same category, recent sessions/projects mentioning it, current maturity level if any).
- For each requested Lens (default: all 8 if missing or stale), calls Lovable AI Gateway with a tight system prompt: *"You are the {LensName} BizzyBot. Walk through {Domain/Tenet name} using your stages: {stages}. Output JSON: quick_facts, perspective_md, key_questions, watch_outs, next_actions."*
- Writes results to `lens_perspectives` (new version row).
- Then fires a final consolidation call to produce the `entity_crib_sheets` row from all 8 perspectives.
- Returns the freshly written rows.

**Triggers for regeneration:**
- Manual "Regenerate" button on the page header (admin-only).
- Auto on first view if no perspective exists for that entity (lazy generation, with a skeleton state).
- Stale flag if the entity description or related taxonomy changed since last generation.

## The page UI

### Domain detail page (`_app.domains.$slug.tsx`) and Tenet detail page (`_app.tenets.$slug.tsx`) get a new section beneath the existing header & ExcellenceMatrix:

**1. Crib Sheet card** (top, premium, light)
- Pulled from `entity_crib_sheets`.
- Layout: TL;DR sentence · 5 quick facts as chips · Core Principles list · Signature Metrics chips · Common Pitfalls callout.

**2. Lens Wall** — 8 BizzyBot cards in a responsive grid (4×2 desktop, 2×4 tablet, stacked mobile)
- Each card is a `<LensPerspectiveCard>`:
  - Header: BizzyBot icon + Lens name + tagline (color-accented per Lens).
  - The Lens's stages rendered as a horizontal mini-strip ("Observe → Choose → Decide → Act") with each stage tooltip-revealing a 1-line "what this stage means here for {Domain}".
  - Body tabs: **Perspective** (markdown) / **Questions** / **Watch-outs** / **Next Actions**.
  - Footer: "generated {timeago} by {model}" + Regenerate (admin) + Pin (admin).
- Cards are **collapsible** (chevron on each), with a header toggle "Expand all / Collapse all".
- A compact mode toggle: switch the wall from "full cards" to "lens chips with hover-popover" for a denser scan.

**3. Lens Spotlight** — top-right floating chip selector
- Picks 1 of 8 to feature larger ("Show me OCDA's view"). Useful when a user wants to read just one lens at a time. Selection persists in URL search param `?lens=F1`.

### A shared `<LensWall subjectKind subjectId />` component
- Same component reused on Domains, Tenets, and (optionally later) Components, Missions, Projects, Relationships — the schema already supports those subject_kinds.

### Naming the BizzyBots
Each Lens row stores its `bizzybot_emoji` (or icon key into a small icon map). Rendered consistently across the app whenever a Lens is referenced (e.g. "🟣 OCDA says…"). When you later add the Best-Practice Catalog, that catalog can reuse the same BizzyBot identity.

## How this connects to what already exists

- **ExcellenceMatrix** stays where it is on the Domain/Tenet page. Lens Wall sits *under* it as the "why does this matter / how do I think about it" layer, while ExcellenceMatrix stays the "where am I on it" layer.
- **Measures**: `entity_crib_sheets.signature_metrics` becomes a "Suggest measures from this Lens" button → prefills `measures` rows for the entity (kind=KPI/CSF, target left blank, cadence inferred).
- **Components**: when a Lens recommends "build a component for X" in its `next_actions`, a one-click "Create component" CTA spawns a `components` row pre-tagged to this Domain/Tenet.
- **Memory**: the BizzyBot canon and Lens definitions are added to `mem://design/lenses-bizzybots.md` so future plans never re-invent the names or stages.

## Files touched

- **Migration** `<ts>_lenses_perspectives_crib_sheets.sql`:
  - new tables: `lenses`, `lens_perspectives`, `entity_crib_sheets`
  - new enums: `lens_subject_kind`
  - seed: 8 lens rows (F1 OCDA → F8 Rhetorical) with stages, taglines, accent colors, BizzyBot icon keys
  - RLS: read-all-team, write admin-or-system
- **New component**: `src/components/lens-wall.tsx`
- **New component**: `src/components/lens-perspective-card.tsx`
- **New component**: `src/components/crib-sheet-card.tsx`
- **New component**: `src/components/bizzybot-avatar.tsx` (visual identity per Lens)
- **New utils**: `src/utils/lenses.functions.ts` (server functions: `generate_lens_perspectives`, `regenerate_crib_sheet`, `pin_perspective`)
- **New utils**: `src/utils/lens-prompts.ts` (per-Lens system prompts, kept editable in code)
- **Edited**: `src/routes/_app.domains.$slug.tsx` — mount `<CribSheetCard>` + `<LensWall subjectKind="domain" />`
- **Edited**: `src/routes/_app.tenets.$slug.tsx` — same drop-in
- **Edited**: `src/integrations/supabase/types.ts` — auto-regen
- **New memory**:
  - `mem://design/lenses-bizzybots.md` — F1–F8 canon (codes, names, stages, what they ask, best use). Mark as Core: never invent new lenses; never alter stages without admin sign-off.
  - Append `mem://index.md` Core: "Eight canonical Lenses (BizzyBots F1–F8) drive perspective generation. Stored in `lenses` table. AI-generated `lens_perspectives` cached per (subject, lens). Domain/Tenet detail pages render a `<LensWall>` under the ExcellenceMatrix."

## What I'm NOT doing in 2.10j

- Live agent chat ("ask OCDA a question about this Domain") — perspectives are pre-generated cached snapshots this pass. Live Q&A becomes the next phase using the same Lens prompts.
- Cross-Lens contradiction detection (when 5Ps says one thing and 3Cs says another) — surfaced as a future Flightdeck card.
- Per-relationship Lens perspectives (the same Domain seen *in the context of one client*) — the schema already supports it via `subject_kind='relationship'`, but the UI sweep stops at Domains/Tenets this pass.
- Editing the BizzyBot catalog from the UI — code-seeded for now; admin editor later.

## Suggested order after this

1. **2.10j (this plan)** — Lens Wall + Crib Sheet on Domains & Tenets, with cached AI generation.
2. **Live BizzyBot chat** — "Ask {Lens} about this entity" using the same prompts.
3. **Lens-aware `MeasuresPanel`** — "Suggest measures from CSFs each Lens highlighted."
4. **Per-relationship Lens views** on the relationship detail page.
5. **Best-Practice Catalog** — reuses BizzyBot identities for industry-specific best-practice cards.

