---
name: Story Trail
description: Canonical narrative timeline for any subject's progress; replaces flat audit lists.
type: design
---

Story Trail is the canonical *narrative read* of progress for any subject (Quest, Journey, Component, Relationship).

It composes existing data into chapters — never a new table:
- `sparks` (chapter beats; pulse when active)
- `component_outputs` (📎 artifacts shipped, inline)
- `decisions` (◆ inline diamonds)
- `entity_audit_log` (filtered, last 12 meaningful events)

Rules:
- Audit/progress reads as a Story Trail timeline; never a flat log when a Story Trail will do.
- `done` = emerald check; `active` = pulsing iris ring; `locked` = dim.
- Ordered chronologically by `done_at ?? created_at`.
- Mounted as the bottom panel on `/quests/$id`, `/journeys/$id`, `/components/$id`, `/relationships/$id`, `/operators/$id`.
- `subjectKind="workspace"` is the **Master Story Trail** — last N beats across the whole workspace; mounted at the top of `/today` (collapsible) as the daily narrative glance.
- `subjectKind="operator"` traces an operator's sparks (via `generator_operator_id`), component outputs (via `generated_by_operator_id`), and audit log entries (via `operator_id`).
- This is the basis of the future client portal recap.
