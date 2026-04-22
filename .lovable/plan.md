

# Lens Generation — Library-first, generate only on demand

You're right. Right now `LensWall` auto-fires `generate-lens-perspectives` the first time anyone visits a Domain or Tenet page (see `lens-wall.tsx` lines 87–96: `autoRunOnEmpty` defaults to `true` and triggers all 8 BizzyBots immediately). That burns credits on every fresh page view before you've even decided the AI take is worth having.

The Spark Library three-tier pattern we just shipped is the right answer here too: **best-practice canon first, AI only to evolve it.**

---

## The model

```
Tier 1: Canonical Lens Perspectives (curated library)
        Pre-written, hand-vetted "best-practice" take per (Lens × Domain) and
        (Lens × Tenet). No AI call. Always shown first.
                    │ user wants a fresh angle?
                    ▼
Tier 2: Generate (AI, on explicit click only)
        Today's behavior — 8 BizzyBots run, result cached as a versioned
        perspective. Never auto-fires.
                    │ great result?
                    ▼
Tier 3: Promote to canon
        Human marks an AI perspective as exemplary → it replaces or supplements
        the canonical one for that (Lens × Subject) pair.
```

Same shape as Sparks: deterministic library is the default, AI is the evolution lever.

---

## What changes

### 1. Schema (1 migration)

```
lens_canon                                    -- the curated best-practice library
  id, lens_id, subject_kind, subject_id,
  quick_facts text[], perspective_md text,
  key_questions text[], watch_outs text[],
  next_actions text[], stages_breakdown jsonb,
  source ('curated' | 'promoted_from_ai'),
  promoted_from_perspective_id uuid null,
  status ('active' | 'draft' | 'retired'),
  updated_by, updated_at
  UNIQUE (lens_id, subject_kind, subject_id)

lens_perspectives  (add 1 column)
  tier text check (tier in ('canon','generated'))
```

Existing 4 tables stay; nothing destructive.

### 2. Seed canonical perspectives

Hand-seed the obvious high-value pairs first — for the 8 BizzyBot Lenses across the 22 Domains and 22 Tenets that's 352 cells, but we only seed where canon truly exists today. First-pass seed: **all 8 Lenses × the 5 Foundation Tenets (F1–F5)** and **all 8 Lenses × Domains in the 5 Ps (P1–P5)** = 80 cells. The rest stay empty until promoted from AI.

Each seed pulls from the Lens prompt templates in `lenses` table + the canon docs already in memory, so the Tier-1 take feels grounded immediately.

### 3. Rewrite `LensWall`

- **Remove `autoRunOnEmpty` default-true behavior.** It never auto-runs. Period.
- On mount, query `lens_canon` for the (subject_kind, subject_id) pair for each of the 8 Lenses.
- If canon exists → render it as a `LensPerspectiveCard` with a `📚 Canon` chip. No spinner, no AI call.
- If canon is missing → render the card with a placeholder *"No canonical perspective yet — generate to author one"* + a per-card `Generate` button.
- Keep the global `Generate` / `Regenerate` buttons but they always require an explicit click and they always write to `lens_perspectives` (Tier 2), never overwrite canon.

### 4. UI provenance

Each Lens card gets a tier chip:
- `📚 Canon` — Tier 1 from `lens_canon`
- `✨ AI` — Tier 2 from `lens_perspectives`
- Hover on Canon shows `Curated · last updated by Liz · 2d ago`
- AI cards rated highly surface a `Promote to canon` button → writes the perspective into `lens_canon` with `source='promoted_from_ai'`

### 5. Curation surface

New route `/settings/lens-canon` (lives under the Settings layout we just fixed):
- Matrix view: Lens (rows) × Subject kind tabs (Domain / Tenet / Component / etc.)
- Cells colored by status: green = canon active, gray = empty, yellow = AI-only
- Click a cell → editor with the same fields as `lens_canon` + revision history
- "Promote latest AI" shortcut per cell

### 6. Memory + canon

- New file `mem://features/lens-library.md` — three-tier rule for Lenses, mirroring Sparks
- Update `mem://design/lenses-bizzybots.md` — add the canon-first rule
- Core rule added: *"Lens perspectives never auto-generate. Canon shows first; AI fires only on explicit click; great AI results promote to canon."*

---

## What this is NOT

- Not removing the 8 BizzyBots or their prompts — those stay
- Not deleting existing `lens_perspectives` rows — backfilled with `tier='generated'`
- Not blocking AI — just moving it from auto-fire to opt-in
- Not deferring SparkPath Phase B/C, Blockers/Wins routes, or Erica migration — those resume after

---

## Order of operations (one pass)

1. **Migration A** — `lens_canon` table + `tier` column on `lens_perspectives` + RLS
2. **Migration B (data)** — seed 80 canonical (Lens × Foundation Tenet) and (Lens × P-Domain) rows; backfill existing perspectives with `tier='generated'`
3. **File edits:**
   - `src/components/lens-wall.tsx` — remove `autoRunOnEmpty`, query `lens_canon` first, never auto-fire AI
   - `src/components/lens-perspective-card.tsx` — tier chip, "Generate" per-card when canon missing, "Promote to canon" when Tier 2
   - `src/routes/_app.settings.lens-canon.tsx` — new curation matrix
   - `src/components/app-sidebar.tsx` — add `/settings/lens-canon` link
4. **Memory:** new `mem://features/lens-library.md`, update `mem://design/lenses-bizzybots.md` and Core index

After this lands: visiting `/tenets/strategic-vision-purpose` shows 8 canonical lens cards instantly with zero AI cost. Generation only fires when you click it to evolve a take or fill a gap.

