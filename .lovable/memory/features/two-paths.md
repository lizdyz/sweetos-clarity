---
name: two-paths
description: Sessions and SweetSync are twin paths over one shared truth. Quests/Sparks declare scope (client vs internal) and a core_workflow_id.
type: feature
---

**Core rule:** every workflow/capability is the core object. Map, Machine, and SweetSync are delivery variations of that same underlying thing. Sessions advance through guided cadence; SweetSync (Quest → Spark) self-paces between sessions. Both write to the same Components.

## Schema anchors

- `quests.relationship_id` — which client this Quest is for (nullable for `scope='internal'`).
- `quests.scope` — `'client' | 'internal'`. Default `'client'`. Existing rows backfilled to `'internal'`.
- `quests.core_workflow_id` — the underlying workflow/capability this Quest advances. Used to bridge to Sessions.
- `sparks.relationship_id` + `sparks.scope` — auto-synced from parent Quest via `trg_spark_inherit_scope` trigger. Never set directly.

## UI rules

- Every Spark/Quest row in any list MUST show a `<ScopeChip>` so internal vs client work is visually obvious.
- `/sparks` and `/quests` lists default-filter to **Internal** — Liz's workspace should not be polluted with client work.
- The per-client self-paced board lives at `/sweetsync` with `?rel={id}`.
- `/relationships/$id` shows a `<TwoPathsStrip>` that pairs each Quest with its matching sessions (joined by `core_workflow_id` ↔ `sessions.related_workflow_id`).

## Bridge logic (where the two paths meet)

A Session's `related_workflow_id` and a Quest's `core_workflow_id` referencing the same workflow row is what links the two paths. Anything that derives "what advanced this Component" must read from BOTH sides.

## Open (not yet wired)

- Auto pre-fill: a completed Spark in SweetSync should pre-answer matching Session inputs (and vice versa). Schema supports it (`source_of_advancement`, `confidence`); auto-equivalency wiring deferred until first real client runs both paths.
