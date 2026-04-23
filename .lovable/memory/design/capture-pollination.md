---
name: capture-pollination
description: The 4-pass capture pipeline (intent → normalize → match-personas → scoped JTBD/Quest/KTI matches → tag) and persona-scoped JTBD loading rule.
type: design
---

# Capture Pollination — how a single capture lights up the whole graph

Every capture (text, voice, file) flows through a **multi-pass pipeline**, not
a single normalize step. Each pass is an editable prompt in `system_prompts`
and is loaded via `getPrompt(key, fallback)` — never inlined.

```
text ──▶ [classify intent] ──▶ [normalize entity] ──▶ [match-personas]
                                                        ↓
                                       [scoped match JTBDs]   ← only the
                                                        ↓        matched
                                       [match quests/sparks]    persona's jobs
                                                        ↓
                                       [match active KTIs]
                                                        ↓
                                       [suggest new KTI?]
                                                        ↓
                                              [tag domains/tenets/components]
                                                        ↓
                                              one proposal carrying ALL
                                              matched_* arrays
```

## The prompt set (`system_prompts.key`)

| key | role |
|---|---|
| `capture.intent` | classify input: observation · jtbd · task · question · trend_signal · client_update · idea |
| `capture.parse` | pick best entity_type and extract fields |
| `capture.parse.jtbd` | when intent=jtbd, extract full JTBD shape |
| `capture.match.persona` | which personas this lights up |
| `capture.match.jtbd` | which JTBDs (scoped to matched personas) |
| `capture.match.quest_spark` | which open Quests/Sparks to attach |
| `capture.match.kti` | which active KTIs got new evidence |
| `capture.suggest.kti` | propose a NEW KTI when input looks recurring |
| `queue.tag` | final domain/tenet/component tags |

All editable in `/settings/prompts`. Edits take effect within seconds (30s cache).

## Persona-scoped JTBD loading (the key rule)

Match passes are **scoped, not global**:

1. `capture.match.persona` first — small library (~6 rows).
2. Then **only the matched personas' JTBDs** are sent to `capture.match.jtbd`.
   Token-cheap and accurate. JTBDs belong to a persona; we honor that.
3. Quests/Sparks are filtered by `relationship_id` if a relationship was
   matched in the normalize step.

If no persona matches, fall back to top-20 most-recent JTBDs globally.

## What lands on the proposal row

`proposals.intent`, `matched_personas[]`, `matched_jtbds[]`,
`matched_quests[]`, `matched_sparks[]`, `matched_ktis[]`,
`suggested_kti_payload jsonb`. All nullable. All written by the pipeline.

## On approve

When a proposal becomes a Task / Project / Campaign, `matched_jtbds` is
written to `task_jtbds` / `project_jtbds` / `campaign_jtbds` so the JTBD
"Work in flight" rollup sees the link.
