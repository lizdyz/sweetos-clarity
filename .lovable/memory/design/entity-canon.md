---
name: entity-canon
description: Every entity kind has a canonical definition row in entity_canon. Detail pages render canon guardrails. Drift is surfaced, not hidden.
type: design
---

# Entity Canon — the reinforcement loop

Every entity kind in the system (Quest, Spark, Component, Mission, Outcome,
Workflow, Session, Operator, Domain, Tenet, Relationship, Project, Task,
Journey) has exactly one row in `public.entity_canon` describing:

- `one_liner` — single sentence definition
- `what_it_is` — long-form explanation
- `what_good_looks_like` — checklist of criteria a great instance meets
- `what_bad_looks_like` — anti-patterns
- `inputs` / `outputs` — what feeds it / what it produces
- `reinforcement_loop` — how the canon itself self-improves
- `example_ids` — exemplar instances
- `alternate_viewpoints` — refinement angles (jsonb)
- `status` — draft | defined | needs_review

Edits append a snapshot to `entity_canon_revisions` via `trg_entity_canon_snapshot`.

## Where canon shows up

- `/settings/canon` — full editor (admin-only writes; team-wide reads)
- Every entity detail page (`/quests/$id`, `/sparks/$id`, `/components/$id`,
  `/missions/$id`, …) mounts `<CanonGuardrail entityKind="…" />` near the top
  to surface the "what good looks like" checklist for sanity-checking.

## Reinforcement loop rules

- A great instance can be promoted to an `example_ids` exemplar.
- An off-canon instance can either be refined (instance fix) or trigger a
  canon edit with rationale (recorded in `entity_canon_revisions`).
- Drift = instances that fail any `what_good_looks_like` criterion.
  The Canon dashboard surfaces drift; it never hides it.
- Canon edits never auto-mutate existing instances. Every change is
  human-confirmed.

## Quest canon — special note

Quests have two flavors that the canon must respect:

- **Canonical templates** (`is_template=true`, `kind='canonical'`) — Liz's
  20 user-journey templates. These advance Components from one maturity
  level to the next for a client.
- **Reflection prompts** (`kind='reflection'`) — Liz's own internal
  "What if…" questions on her practice. These do not need a level
  transition or deliverable type and live alongside but separately.
- **Instances** (`kind='instance'`, `template_id` set) — clones of a
  canonical template bound to a specific relationship.
