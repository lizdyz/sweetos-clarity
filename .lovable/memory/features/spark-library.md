---
name: Spark Library (deterministic-first)
description: Three-tier Spark generation — library template → AI-adapted → fresh AI. Library grows from rated AI sparks.
type: feature
---

## Rule
Sparks are produced in this order, never reversed:
1. **Tier 1 — Library** (`spark_templates`, status='active'): match by component journey + maturity + applicable_components. If ≥3 hits → return them. **No AI call.**
2. **Tier 2 — Adapt**: 1–2 library hits → AI fills `{slots}` in those templates only.
3. **Tier 3 — Generate**: 0 library hits → full AI generation. Result is a candidate for promotion.

Curation lives at `/settings/spark-templates`. Promote AI sparks (rated ≥4) into the library; retire stale templates.

## Schema
- `spark_templates(id, name, body_template, intent, probes[], applicable_journeys[], applicable_components[], applicable_maturity_levels[], reuse_count, avg_rating, status, source_kind, origin_spark_id)`
- `spark_template_usages(template_id, spark_id, component_id, kept, rating)` — trigger rolls up to template.
- `sparks.template_id` + `sparks.generation_tier` ('template'|'adapted'|'generated')

## Slot syntax
Templates use `{component}`, `{component_name}` for deterministic fills; AI handles all other `{slots}` in Tier 2.

## Where else this pattern applies
The library-first pattern should be considered for any other AI-generation surface in the system:
- `generate-lens-perspectives` — perspective templates per Lens code (F1–F8).
- `generate-component-output` — output templates per `output_kind` (one-pager, brief, deck).
- `distill-brand-canon` — distillation patterns per brand canon dimension.
- `scan-signals` — scanner prompt templates per signal source.
- Future: VOC interview question banks, decision-doc templates, retro prompts.

Only call AI when the curated bank can't cover the ask. Promote the best AI outputs back into the bank.
