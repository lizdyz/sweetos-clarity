

# Phase 2.10k: Operator assignments — done right (not inside the create modal)

## Your instinct is right. The placement is wrong.

You're seeing the gap that an Operator should be hooked into **what they do**: projects, tasks, components, workflows. That belongs on the **operator detail page**, not the "New operator" creation modal. Here's the reasoning, then the fix.

### Why not in the create dialog
- A brand-new operator has no skills/availability filled in yet — assigning work *before* you know what they're good at produces bad assignments.
- Creation should stay a 5-second action. Pile on assignments and people abandon mid-flow.
- Real-world flow: create → describe (skills/likes/dislikes) → *then* assign work, often days later as needs come up.
- Workflows and components don't get *assigned to* operators the same way tasks do — they need different verbs (own, contribute, run-as).

### What "assign work to an operator" actually means per entity

| Entity | Verb | Already in schema? | Where it lands |
|---|---|---|---|
| **Tasks** | assign (`tasks.operator_id`) | ✅ yes | Operator detail → Tasks tab |
| **Projects** | own/lead (new `projects.operator_id`) | ❌ needs column | Operator detail → Projects tab |
| **Components** | contribute (uses existing `project_components` indirectly via project ownership; **direct** ownership = new `components.responsible_operator_id`) | ❌ needs column | Operator detail → Components tab |
| **Workflows** | run-as (already supported: `operators.workflow_id` makes the operator BE a workflow) | ✅ yes | Already shown |
| **Sessions** | facilitate (new `sessions.operator_id`) | ❌ needs column | Operator detail → Sessions tab |

## What I'll build

### 1. Schema migration — minimal, additive
Add nullable `operator_id` columns to:
- `projects` (lead/owner)
- `components` (responsible_operator_id)
- `sessions` (facilitator)

Each gets an index. RLS already covers via existing policies.

### 2. Operator detail page — new "Assignments" section with 4 tabs
Replace the current single "Open tasks" card with a tabbed assignments panel directly under skills/likes/dislikes:

```
┌─ Assignments ─────────────────────────────────────┐
│ [Tasks 7] [Projects 2] [Components 3] [Sessions 1]│
│ ─────────────────────────────────────────────────│
│ • Task name                       Due · Status    │
│ • ...                                              │
│                            [+ Assign existing →]   │
└────────────────────────────────────────────────────┘
```

Each tab:
- Lists current assignments (linked rows).
- Has a **"+ Assign existing"** button → opens a searchable picker (combobox) of unassigned-or-reassignable rows of that type, filtered to ones whose tags overlap with the operator's `skills`.
- Has a **"+ Create new"** quick action that opens that entity's create dialog with `operator_id` pre-set to the current operator.

### 3. Smart suggestions — small but high-value
Above each tab list, a "Suggested for {operator name}" strip surfaces 3 unassigned items where:
- **Tasks**: `tasks.operator_id IS NULL` and `tagged_components` overlaps with components this operator already owns, OR the task's tagged_domains/tenets overlaps the operator's `skills`.
- **Projects**: `projects.operator_id IS NULL` and tagged_domains overlaps skills.
- **Components**: `components.responsible_operator_id IS NULL` and `related_domains` overlaps skills.
- **Sessions**: upcoming sessions on engagement_services where the operator has a relevant skill OR is already on the relationship.

One-click "Assign" on any suggestion. No drag, no modal.

### 4. Reverse direction — show on the entity side too
On Project detail, Task detail, Component detail, Session detail: a small "Operator" pill near the header showing who owns/leads/facilitates. Click → opens an inline picker to reassign. (This uses the existing `OperatorChip` pattern from tasks.)

### 5. Keep create dialog clean
The "New operator" modal stays as-is — name, kind, profile/workflow/model/prompt only. After create, redirect to `/operators/{id}` so you immediately land on the page where assignments live. That's the natural next step.

## What this connects to that already exists

- **Flightdeck workload panel** already aggregates per-operator open task counts → it'll automatically pick up the new project/component/session counts via the same `operator_id` columns once we add them to the `operator_workload` view.
- **MeasuresPanel** at the bottom of the operator page stays — you can attach KPIs like "weekly tasks shipped" or "session NPS" to an individual operator.
- **Skills array** becomes the matching key for suggestions — already populated on the operator page, no new field needed.

## Files touched

- **Migration** `<ts>_operator_assignments.sql`:
  - `ALTER TABLE projects ADD COLUMN operator_id uuid REFERENCES operators(id) ON DELETE SET NULL;`
  - `ALTER TABLE components ADD COLUMN responsible_operator_id uuid REFERENCES operators(id) ON DELETE SET NULL;`
  - `ALTER TABLE sessions ADD COLUMN operator_id uuid REFERENCES operators(id) ON DELETE SET NULL;`
  - Indexes on each.
  - Update `operator_workload` view to include open projects + sessions counts.
- **New component**: `src/components/operator-assignments-panel.tsx` — tabbed panel + assign/create actions + suggestion strip.
- **New component**: `src/components/operator-chip.tsx` — small inline picker reused on project/task/component/session detail headers.
- **Edited**: `src/routes/_app.operators.$id.tsx` — replace single tasks card with `<OperatorAssignmentsPanel operatorId={id} />`. Keep MeasuresPanel.
- **Edited**: `src/routes/_app.operators.index.tsx` — after create, navigate to `/operators/{id}`.
- **Edited**: `src/routes/_app.projects.$id.tsx`, `_app.tasks.$id.tsx`, `_app.components.$id.tsx`, `_app.sessions.$id.tsx` — add `<OperatorChip>` to header row.
- **Memory append**: `mem://features/operators.md` — add: "Operators are assigned via `operator_id` on tasks/projects/sessions and `responsible_operator_id` on components. Assignment UI lives on the operator detail page (not the create modal). Suggestion engine matches `operators.skills` against entity tags."

## What I'm NOT doing this pass

- Drag-and-drop "drop a task on an operator card" from the operators index — nice-to-have, not essential. The picker + suggestions cover the same use case faster.
- Auto-assignment by AI ("which operator should own this?") — surfaces as suggestions only this pass; auto-route comes later.
- Workload-based load balancing (prefer the least-busy operator) — can add as a sort key on the picker once we see it being used.
- Per-operator capacity limits ("max 5 concurrent projects") — config later if needed.

## Suggested order after this

1. **2.10k (this plan)** — operator assignments panel + reverse chips.
2. **AI auto-suggest assignee** on capture/queue confirmation, using the same skill-matching logic.
3. **Workload balancing** — sort suggestion picker by `open_tasks ASC` so least-busy wins ties.
4. **Operator availability calendar** — block-out windows that hide them from suggestions.

