---
name: story-weaver
description: Canonical narrative production workflow. Brand-canon-first. Never generates without a canon. Published artifacts snapshot canon at publish time. Vault feeds Vault.
type: feature
---

Story Weaver is the canonical narrative production workflow for SweetBOS. Used by Liz internally and (later) by clients self-serve in SweetSync.

**Hard rules:**
- Never generate a draft without a populated `narrative_brand_canon` row. Required canon fields are dictated by the chosen `narrative_format_specs.required_canon_fields`.
- Every published narrative writes a `brand_canon_snapshot` jsonb into `component_outputs` so future canon edits never mutate shipped artifacts.
- Drafts stage in `narrative_drafts` with `fidelity_flags` and `confidence`; humans approve panel-by-panel before any image generation runs.
- Per-panel regenerate only — never bulk-regen a draft (wastes credits, breaks character consistency chain).

**The chain:** Vault docs → distilled Brand Canon → steered narrative draft → illustrated panels → published Vault asset (`output_kind` ∈ narrative_*).

**Output kinds:** `narrative_founder`, `narrative_onboarding`, `narrative_archetype`, `narrative_explainer`, `narrative_sales`, `narrative_training`.

**Edge functions:** `distill-brand-canon` (Vault → canon proposal), `story-weaver-draft` (planned), `story-weaver-illustrate` (planned).
