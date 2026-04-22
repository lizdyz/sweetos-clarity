# Spark Library — Deterministic-first, AI-fallback Spark generation

You want Sparks to behave like a **curated, reusable library first** — and only fall through to AI generation when the library can't cover what's needed. Today `generate-component-sparks` calls Gemini every time, which means: no reuse, no quality control, no accumulation of "best Sparks," and unnecessary AI cost on Components we've already mapped.

Here's the model.

---

## The mental model: three tiers, in order

```
┌─ Tier 1: Spark Templates (deterministic library) ──────────────┐
│  Curated, reusable, hand-vetted. Tagged by what they probe.    │
│  Try these FIRST. Free, instant, consistent quality.           │
└────────────────────────────────────────────────────────────────┘
                          │ no template covers the gap?
                          ▼
┌─ Tier 2: Adapt template (AI fills slots) ──────────────────────┐
│  Take the closest template, AI rewrites only the {slots}       │
│  for this Component's context. Cheap, mostly deterministic.    │
└────────────────────────────────────────────────────────────────┘
                          │ still no fit?
                          ▼
┌─ Tier 3: Generate fresh (AI from scratch) ─────────────────────┐
│  Full AI generation as today, but the result becomes a         │
│  candidate template — promote to library after it proves out.  │
└────────────────────────────────────────────────────────────────┘
```

The library **grows from use**. Every fresh AI Spark that the human keeps and rates ≥4 becomes a template candidate, reviewable in `/settings/spark-templates`.

---

## What gets built

### 1. New entities (1 migration)

```
spark_templates
  id, name, body_template, intent, probes (text[]),
  applicable_journeys (uuid[]), applicable_components (uuid[]),
  applicable_maturity_levels (text[]),
  reuse_count, avg_rating, status (draft|active|retired),
  source_kind (curated|promoted_from_ai), origin_spark_id

spark_template_usages
  id, template_id, spark_id, component_id,
  used_at, kept (bool), rating (1-5)
```

`sparks` gets two new columns: `template_id` (nullable), `generation_tier` (`template|adapted|generated`).

### 2. Seed the starter library

Seed ~25 canonical templates extracted from your existing 12 Sparks plus the canonical patterns the system already knows it needs (one per common Component intent: *baseline metric*, *interview a stakeholder*, *audit current state*, *draft v1*, *find missing data*, *validate assumption*, etc.). Each tagged with the journeys/maturity levels it applies to.

### 3. Rewrite the generator (`generate-component-sparks` v2)

Server function does this in order:

1. **Library lookup** — query `spark_templates` matching the component's journey + current maturity + (not already used in last 30 days for this component). If ≥3 hits, return them as proposals. **No AI call.** Tier = `template`.
2. **Adapt** — if 1–2 library hits, fill the gap by AI-adapting the closest template's slots (e.g. `{stakeholder_role}`, `{metric_name}`) using the Component's context. Tier = `adapted`.
3. **Generate fresh** — only if 0 library hits, call Gemini as today. Tier = `generated`. Result is auto-marked `candidate_for_library`.

Each returned Spark carries `template_id` (when applicable) and `generation_tier` so the UI can show provenance.

### 4. UI: provenance + curation

- `**/components/$id` Sparks panel** — each Spark shows a tiny tier chip: `📚 Library` / `🧩 Adapted` / `✨ AI`. Library Sparks show "Used 14× across 6 components" on hover.
- **Spark detail** — when human marks `kept` or rates the Spark, that writes to `spark_template_usages`. AI-generated Sparks rated ≥4 surface a "Promote to library" button.
- `**/settings/spark-templates**` (new route) — admin curation page. Filter by status, see reuse_count + avg_rating, edit body, retire/promote, add new templates manually.

### 5. Memory + canon

New memory file `mem://features/spark-library.md` documenting the three-tier rule. Index entry. Core rule added: *"Sparks try library → adapt → generate, in that order. Library grows from rated AI generations."*

---

## Why this matches what you asked for

- **"Bank of the best sparks, tested and reused"** → `spark_templates` table + reuse_count + avg_rating + curation route.
- **"Only when they don't suit, create more"** → tier fallthrough logic in the generator; Tier 3 (fresh AI) only fires when library is empty for that context.
- **"Marry deterministic with probabilistic"** → Tier 1 is fully deterministic; Tier 2 is AI-bounded by a template; Tier 3 is unbounded AI but feeds back into the deterministic layer via promotion.

---

## What this is NOT

- Not removing AI generation — keeping it as the safety valve.
- Not auto-promoting AI Sparks — promotion is human-gated in `/settings/spark-templates`.
- Not touching SparkPath Phase B/C, Blockers/Wins routes, or Erica migration — those resume after.
- Not changing the existing 12 Sparks — they stay; they get backfilled with `generation_tier='generated'` and become promotion candidates.

---

## Order of operations (one pass)

1. **1 schema migration** — `spark_templates`, `spark_template_usages`, 2 new columns on `sparks`, RLS.
2. **1 data migration** — seed ~25 starter templates + backfill existing 12 Sparks with `generation_tier='generated'`.
3. **Rewrite** `supabase/functions/generate-component-sparks/index.ts` with the 3-tier logic.
4. **3 file edits**: `sparks-for-component-panel.tsx` (tier chips), `_app.sparks.$id.tsx` (rate + promote button), `app-sidebar.tsx` (Settings → Spark Templates link).
5. **1 new route**: `_app.settings.spark-templates.tsx` (curation page).
6. **1 memory file** + index update.

Approve and I run the migrations + edge function rewrite + 4 UI files + memory in one pass.  
  
  
see where else this logic would benefit the entire system as well