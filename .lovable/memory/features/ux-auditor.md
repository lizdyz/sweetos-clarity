---
name: UX Auditor
description: Two-layer (deterministic presence-check + AI judgment) auditor at /settings/ux-audit; canon score is hard-capped by missing required components; persists in ux_audit_runs
type: feature
---

# UX Auditor loop

Manual-fire auditor that grades any route against canon and stores results.

**Surface**: `/settings/ux-audit` — pick a route, optionally paste known UX issues, click "Run audit". Cockpit shows a Canon-misses leaderboard (headline KPI) above per-route cards.

**Edge function**: `supabase/functions/ux-audit/index.ts`

## Two-layer audit

1. **Deterministic presence check** (regex over route source) — runs FIRST, produces auto-HIGH findings tagged `detected_by: "presence_check"`. Cannot be softened by the AI.
2. **AI judgment pass** (Lovable AI `google/gemini-3-flash-preview`) — nuanced findings on hierarchy, density, states, a11y. Told NOT to duplicate presence findings.

## Required-presence rules (PRESENCE_RULES const)

| Key | Applies to | Detects |
|---|---|---|
| `CANON_REQUIRES_CANON_GUARDRAIL` | entity_detail, actionable_detail, measure_subject | missing `<CanonGuardrail entityKind=...>` |
| `CANON_REQUIRES_TIME_CONTROLS` | actionable_detail | missing `<TimeControls ...>` |
| `CANON_REQUIRES_MEASURES_PANEL` | measure_subject | missing `<MeasuresPanel ...>` |
| `CANON_FORBIDS_MERGED_DOMAIN_TENET` | all detail/index | merged `[...tagged_domains, ...tagged_tenets]` |
| `CANON_REQUIRES_STAGE_AS_BOARD` | index, actionable_detail | status `<Select>` without `<StageSwimlanes>` / `useDragToStatus` |
| `CANON_FORBIDS_HUMAN_SPARK_CREATION` | all surfaces | client `.from('sparks').insert()` or "New Spark" button |
| `CANON_REQUIRES_VIEW_BACKED_ROLLUPS` | index, operate | client-side `.reduce()` on raw tables when canonical view exists |

## Route classifier (ROUTE_CLASSIFIER const)

Literal lookup table — `entity_detail` · `actionable_detail` · `measure_subject` · `index` · `operate` · `library` · `settings` · `other`. Adding a new route requires adding a row (intentional friction). `other` and `settings` opt out of presence rules.

## Canon-score cap formula

```
0 violations → AI judges 1–5 freely
1 violation  → canon score capped at 3
2 violations → capped at 2
3+ violations → capped at 1
```

Applied after AI returns, before insert. The AI can't paper over missing components.

## Schema

`ux_audit_runs(route_path, source_path, scores jsonb, findings jsonb, guardrails_missing text[], ux_issues_user_reported text[], status open|acknowledged|fixed)`

Findings shape adds (vs original): `detected_by`, `rule_name`, `axis`, `canon_ref`, `description`. Cockpit splits presence findings (red-bordered group) from AI findings.

## Score axes (1–5)

hierarchy · density · states · a11y · canon (capped)

## Cost control

Never auto-fires. Click required.

## Adding a new required-presence rule

One file to edit: `supabase/functions/ux-audit/index.ts`. Append to `PRESENCE_RULES` with `key`, `rule_name`, `appliesTo`, `detect(src)`, `fix_hint`, `canon_ref`. No DB migration needed.

## Adding a new route to the cockpit

Append to `AUDIT_TARGETS` in `src/routes/_app.settings.ux-audit.tsx`. If the route is canonical, also add a row to `ROUTE_CLASSIFIER` in the edge function.

## Prompt iteration

System prompt lives in the edge function. Polished version produced via `/mnt/documents/ux-auditor-briefing.md`. Update the `SYSTEM_PROMPT` constant when iterated.

## Tone & exclusions (locked)

- **Tone**: one sentence per finding, imperative voice. Banned hedging words: "consider", "might", "could", "maybe", "perhaps". Every finding must contain violation + line + fix.
- **Roadmap exclusions**: never flag missing realtime, mobile/native apps, third-party integrations, or peer community features. These are product roadmap items, not UX failures.
- Both rules are mirrored in `/mnt/documents/ux-auditor-briefing.md` §8/§9 AND the edge function `SYSTEM_PROMPT` — keep in sync when editing.
