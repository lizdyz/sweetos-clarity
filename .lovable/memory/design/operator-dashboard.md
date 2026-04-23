---
name: operator-dashboard
description: /operators/$id is a six-tab cockpit (Now/Queue/Blocked/Awaiting/Handoffs/History) over the operator_workload view. Profile editing lives in a side drawer.
type: design
---

# Operator dashboard layout

`/operators/$id` is a **cockpit**, not a profile editor. Structure top-to-bottom:

1. **Header** — kind icon · name (inline-edit) · kind badge · availability select · `OperatorEditDrawer` trigger
2. **Capacity strip** (`<OperatorCapacityStrip>`) — 4 tiles from `operator_workload`: Open · Blocked · Overdue · Next due. Color: blocked>0 = rose, overdue>0 = amber.
3. **Six-tab queue** (`<OperatorQueueTabs>`):
   - **Now** — `tasks` where `operator_id = $id`, status not in (Done/Complete/Cancelled), `scheduled_for = today` OR `due_date = today`
   - **Queue** — same but no date filter, `blocked = false`, exclude Now
   - **Blocked** — `blocked = true` (covers `waiting_on` because trigger sets blocked)
   - **Awaiting** — `workflow_step_runs.operator_id = $id` AND `status = 'awaiting_approval'`
   - **Handoffs** — placeholder until Wave 3 ships `handoff_events`
   - **History** — last 25 in (Done/Complete/Completed) by `updated_at desc`
4. **Measures panel** (`<MeasuresPanel subjectType="operator">`)
5. **Agent canon** (collapsible, agents only) — model + system prompt
6. **Story trail**

## Editing

Profile editing (skills/likes/dislikes/agent model+prompt/notes) lives in `<OperatorEditDrawer>` — a sheet triggered from the header. Removed from the main page so the cockpit isn't dominated by inputs.

## Walk-menu

Every row in every tab mounts `<WalkMenu kind=... id=... />` — see mem://design/walk-menu.
