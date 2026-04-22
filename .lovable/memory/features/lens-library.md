---
name: Lens Library — three-tier (canon-first, AI-on-demand, promote-back)
description: Lens perspectives never auto-generate. lens_canon shows first; lens_perspectives (AI) only on explicit click; great AI takes promote back to canon.
type: feature
---

# Lens Library

Mirrors the Spark Library three-tier shape, applied to BizzyBot Lens perspectives.

## Tiers

1. **Canon (`lens_canon`)** — curated best-practice take per `(lens_id, subject_kind, subject_id)`. Hand-authored or promoted from AI. Always rendered first on Lens wall, zero AI cost.
2. **Generated (`lens_perspectives` with `tier='generated'`)** — AI output. Only fires on explicit user click (per-card "Generate with AI" or wall-level "Re-run AI"). Versioned, cached, never overwrites canon.
3. **Promote** — when an AI take is exemplary, click "Promote to canon" on the card. Upserts into `lens_canon` with `source='promoted_from_ai'` and `promoted_from_perspective_id` set.

## Hard rules

- `LensWall` MUST NOT auto-generate on mount. Removed `autoRunOnEmpty` entirely.
- Canon takes precedence over the latest AI perspective for the same `(lens, subject)` pair.
- Tier chip on every card: `Canon` (emerald) / `Canon · draft` (amber) / `AI` (violet) / `Empty` (muted).
- Curation surface: `/settings/lens-canon` — matrix view (Lens × Subject) with status colors and inline editor.

## Why

AI calls are expensive and rarely beat a good curated take on day one. The library accumulates institutional best-practice; AI is the evolution lever for fresh angles or new subjects without canon yet.
