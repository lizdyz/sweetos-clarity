

# Phase 2.10t (revised) — Story Weaver as a *brand-true narrative studio*, not a Story Trail recap toy

## What I got wrong last pass

I framed Story Weaver as "turn your Story Trail into a recap." That's the **cheap** use of it and you're right — wasted credits, low-stakes output. The **real** job is bigger:

> Story Weaver is a **narrative production workflow** that lets Liz (or any operator) — and eventually clients themselves inside SweetSync — produce **on-brand, character-consistent, fidelity-checked illustrated stories** for *their* audiences: client onboarding stories, founder-origin pieces, capability explainers, segment-archetype vignettes, sales narratives, training comics, internal culture pieces.

The thing that broke in the original Story Weaver was **fidelity**: characters drifted, brand voice was generic, the "selected choices" (style, format, audience) didn't actually steer the output strongly enough, and there was no anchored "world" the story was being told inside.

The fix isn't "port it over." The fix is **build the brand-context spine first**, then generate.

---

## The bigger picture (what makes this worth building)

Three audiences, one engine:

| Who | Uses it for | Lives where |
|---|---|---|
| **Liz / SweetBOS internal** | Producing case studies, onboarding stories, sales narratives for *her* prospects and clients | `/components/$id`, `/relationships/$id`, standalone `/library/narratives` |
| **Client (advisor, firm leader)** working *with* Liz | Producing their own founder story, segment vignettes, IP-explainer comics | Same surfaces, scoped by `relationship_id` |
| **Client self-serve in SweetSync** (later phase) | Adopting a Liz-curated narrative template, swapping in their own protagonist + brand, regenerating | `/sweetsync` → "Narrative Studio" tab |

The artifact is the same shape. The **brand context** is what changes.

---

## The fidelity spine — what makes outputs actually good (NEW, this is the missing thing)

Before any generation runs, the workflow reads from a **Brand Canon** assembled per subject. Without this, generation is mush. With it, every panel is steered.

### `narrative_brand_canon` (one row per Relationship, optional one per Component)

| Field | What it holds | Source |
|---|---|---|
| `voice_attributes` jsonb | tone words ("warm-direct, anti-jargon, optimistic-realist"), forbidden phrases, signature openers | Liz writes; later: extracted from Vault docs |
| `visual_style` jsonb | palette hex codes, illustration style ("editorial flat" / "watercolour-warm" / "comic-bold"), line weight, lighting | Style picker + Vault sample uploads |
| `protagonist_anchors` jsonb[] | Named recurring characters with appearance description + 1 reference image each | Manual seed; reference images stored in Vault |
| `world_anchors` jsonb | Recurring settings (the office, the kitchen, the city skyline) with reference images | Vault uploads |
| `narrative_pillars` text[] | The 3–5 core ideas this brand always returns to ("expertise without ego", "the long game", etc.) | Liz/client writes; pulled into every prompt |
| `vault_source_ids` uuid[] | Pointers to Vault documents that inform this canon (mission deck, brand guide, founder transcript) | Selected at canon creation |
| `forbidden_visuals` text[] | "no stock-handshake", "no generic city skyline", "no laptop hero shots" | Liz writes |

This is **the** difference. Story Weaver v1 had none of this. Every generation call now stitches Brand Canon → format spec → audience → user prompt into the system message, and reference images flow into the per-panel image gen.

### `narrative_drafts` (the workflow's output before approval)

Stages every generation as a `proposal`. Each panel carries:
- `panel_index`, `message`, `visual_description`, `dialogue`, `emotion`
- `referenced_anchors uuid[]` — which protagonists/world anchors appear (so the illustrator step pulls the right reference images)
- `confidence` from the quality validator
- `fidelity_flags` text[] — automated checks: "voice mismatch", "anchor missing", "forbidden visual detected", "narrative pillar absent"

Human review screen shows fidelity flags inline so Liz/client can fix or regenerate that one panel before any image dollars are spent.

### `narrative_format_specs` (seeded, ~6 rows)

Locked-in format recipes so "selected choices" actually mean something:
- **Founder origin** — 6 panels, arc: *spark → struggle → choice → climb → present → invitation*
- **Client onboarding story** — 4 panels, arc: *meeting → diagnosis → plan → first win*
- **Segment archetype vignette** — 3 panels, arc: *day-in-life → tension → relief*
- **IP / capability explainer** — 5 panels, arc: *problem → wrong path → insight → method → proof*
- **Sales narrative** — 4 panels, arc: *prospect world → trigger → bridge → after*
- **Training comic** — 8 panels, scenario-driven

Each spec encodes panel count, narrative arc, allowed dialogue density, and which Brand Canon fields are *required* vs optional.

---

## The workflow (4 steps, all human-gated where it matters)

1. **Assemble brand canon** — load `narrative_brand_canon` for the subject; if missing, prompt Liz/client to fill required fields *before* generation. No empty-canon generation allowed.
2. **Draft narrative** (AI, gated) — produces panel JSON, runs quality + fidelity validators, writes a `narrative_drafts` row. Human approves panel-by-panel; per-panel "regenerate" sends back with the specific fix request.
3. **Illustrate panels** (AI, per-panel, gated) — uses anchor reference images, palette, style. Each illustration writes back so the next panel can chain consistency. Per-panel regenerate available.
4. **Publish** — writes `component_outputs` row with `output_kind ∈ {'narrative_founder','narrative_onboarding','narrative_archetype','narrative_explainer','narrative_sales','narrative_training'}`, `narrative_panels jsonb`, `brand_canon_snapshot jsonb` (frozen at publish so future canon edits don't mutate shipped artifacts), and `visibility`.

---

## Vault integration (this is where "documents they decided to run with" matters)

Brand Canon is not invented — it's **distilled from Vault**. New small workflow `distill-brand-canon`:
- Liz/client picks 1–10 Vault documents (mission deck, brand guidelines, founder interview transcript, an existing case study).
- AI extracts `voice_attributes`, candidate `narrative_pillars`, candidate `forbidden_phrases`, suggested palette (from any uploaded brand-guide PDF).
- Returns as a **proposal** Liz/client edits before saving to canon.

So the chain is: **Vault docs → distilled Brand Canon → steered Narrative Drafts → illustrated panels → published Vault asset**. Vault feeds Vault.

---

## What this builds

### Migration
- `narrative_brand_canon` table (per `relationship_id`, optional per `component_id`).
- `narrative_drafts` table (staging for the workflow; approved drafts move into `component_outputs`).
- `narrative_format_specs` table seeded with the 6 format recipes above.
- Extend `component_outputs.output_kind` allowed values with the 6 narrative kinds; add `narrative_panels jsonb`, `brand_canon_snapshot jsonb`.
- Seed one `workflows` row `name = "Story Weaver"`, `kind = 'narrative'` with the 4 ordered steps.

### Edge functions
- `supabase/functions/distill-brand-canon/index.ts` — Vault docs → proposed canon.
- `supabase/functions/story-weaver-draft/index.ts` — canon + spec + audience + prompt → panel JSON, runs validators.
- `supabase/functions/story-weaver-illustrate/index.ts` — per-panel illustration with anchor reference chaining.
- `supabase/functions/_shared/narrative-quality.ts` — duplicate/repetition/vagueness/spelling.
- `supabase/functions/_shared/narrative-fidelity.ts` — voice match, anchor presence, forbidden visual scan, pillar coverage.

### New components (5)
- `src/components/brand-canon-editor.tsx` — the heart of fidelity. Edit voice, pillars, palette, anchors, forbidden lists; "Distill from Vault" button.
- `src/components/protagonist-anchor-card.tsx` — name + description + reference image upload, used inline in canon editor.
- `src/components/story-weaver-launcher.tsx` — opens the wizard: pick format spec → confirm canon loaded → audience → prompt.
- `src/components/story-weaver-review-sheet.tsx` — panel grid with fidelity flags, per-panel edit + regenerate.
- `src/components/narrative-output-card.tsx` — published narrative renderer (re-used in StoryTrail, Vault, and future client portal).

### Edited
- `src/routes/_app.relationships.$id.tsx` — Brand Canon section + Story Weaver launcher.
- `src/routes/_app.components.$id.tsx` — Story Weaver launcher (uses parent relationship's canon).
- `src/routes/_app.vault.tsx` — filter chip "Narratives"; rendering uses `<NarrativeOutputCard>`.
- New route `src/routes/_app.library.narratives.tsx` — index of all narrative format specs (the "menu" of what you can produce).
- `src/routes/_app.settings.prompts.tsx` — Story Weaver tab with the 3 prompts (distill, draft, illustrate) + the validator thresholds.

### Memory
- `mem://features/story-weaver.md` — the canonical narrative production workflow; **never generate without a Brand Canon**; published artifacts always snapshot canon; vault feeds vault.
- `mem://features/brand-canon.md` — what canon contains, how it's distilled, when it's required vs optional.
- Update `mem://features/component-outputs.md` — narrative kinds + the snapshot rule.

---

## Explicitly NOT in this pass

- ❌ Story Trail "auto-recap" generation (the cheap version I proposed before). Story Trail stays a *read* surface.
- ❌ Client self-serve in SweetSync. Build the engine for Liz first; once fidelity is proven on real client work, expose it self-serve.
- ❌ Public sharing / portal rendering. `internal` and `client_shared` visibility only.
- ❌ Audio/video/PDF export. Markdown + image stack first.
- ❌ The Story Weaver "expert council" admin universe. Three tunable prompts in `/settings/prompts` is enough.

---

## Why this is the right shape

You said: *"think a bit deeper… careful detail."* The deep thing isn't the generator — it's the **canon**. Without canon, every output is a generic AI story dressed in random colours. With canon, every output is *recognisably theirs*. The fidelity flags are what stop bad panels from ever reaching image-generation cost. The Vault distillation is what makes setup feel earned, not invented.

This becomes something Liz can sell as a productized capability and clients later run themselves.

## Suggested order (shippable steps)

1. **Migration + canon editor + Vault distill** — fidelity spine lands first. Liz can build a canon for one client before any generation exists.
2. **Draft step + review sheet with fidelity flags** — text-only narratives generate; no image cost yet.
3. **Illustrate step with anchor chaining** — images come on for approved drafts only.
4. **Publish to Vault + `<NarrativeOutputCard>`** — artifacts land in Vault, surfaceable in StoryTrail.
5. **Format spec library + prompt tab** — tuning controls.

Each step is independently usable. Approve and I start at #1.

