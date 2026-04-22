---
name: Workflow completeness
description: Every workflow step carries success_criteria + deliverables + component links + outcome links. Workflow detail page rolls them up.
type: feature
---

Every workflow step must answer five questions on its card:

1. **What is this stage?** — `name` + `description`
2. **What does good look like?** — `success_criteria text[]` (checklist)
3. **What does it build?** — `workflow_step_components` link rows
4. **What does it serve?** — `workflow_step_outcomes` link rows
5. **What artifacts come out?** — `deliverables text[]`

Each step also has `expected_duration_minutes`.

The workflow as a whole has:
- `workflow_outcomes` (workflow-level outcome links)
- A rollup header on `/workflows/$id` showing total time, all components advanced across steps, all outcomes served, and the union of deliverables.

Voice of Customer Interview Map (`aa110002-0000-0000-0000-00000000c0c1`) is the canonical seeded example for this pattern.

When authoring a new workflow, fill in these fields per step — leaving them empty makes the workflow read as a stub, not a playbook.
