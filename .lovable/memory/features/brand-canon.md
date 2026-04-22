---
name: brand-canon
description: Brand Canon = the fidelity spine for narrative generation. Voice, visuals, anchors, pillars, forbidden lists — per relationship (and optionally per component).
type: feature
---

`narrative_brand_canon` is the per-relationship (or per-component) source of truth for narrative fidelity. Without a populated canon, generation is forbidden.

**Fields:**
- `voice_attributes` jsonb — `tone_words[]`, `signature_openers[]`, `anti_patterns[]`
- `visual_style` jsonb — `palette_hex[]`, `illustration_style`, `lighting`, `line_weight`
- `protagonist_anchors` jsonb[] — recurring named characters with `name`, `description`, `reference_image_url`
- `world_anchors` jsonb[] — recurring settings with reference images
- `narrative_pillars` text[] — 3–5 core ideas the brand returns to
- `vault_source_ids` uuid[] — Vault documents this canon was distilled from
- `forbidden_phrases` text[], `forbidden_visuals` text[]

**How it gets populated:** Liz/client either (a) writes it directly in `<BrandCanonEditor>` or (b) clicks "Distill from Vault", picks 1–10 documents, reviews the AI proposal, merges into draft, and saves.

**Where it surfaces:** `/relationships/$id` (always). Optional per-component canon will surface on `/components/$id` in a later pass.

**Snapshot rule:** when a narrative is published to `component_outputs`, the entire canon is frozen into `brand_canon_snapshot` so future canon edits never retroactively change shipped artifacts.
