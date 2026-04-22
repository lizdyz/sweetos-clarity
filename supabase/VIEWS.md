# Database Views — Source of Truth Map

All views in `public` run with `security_invoker = true` so RLS applies as the caller. Index/detail pages MUST read from these views (never re-derive in JS). See `mem://design/views-as-truth.md`.

| View | Read by (route / component) | Purpose |
|---|---|---|
| `component_build_pipeline` | `/components`, `/components/$id`, `active-build-panel` | Active project/task counts per component |
| `engagement_service_rollup` | `/engagement-plans/$id`, `engagement-plan-anatomy` | Sessions shipped vs in-flight per service |
| `maturity_threshold_progress` | `/settings/excellence`, `maturity-threshold-sheet` | Checklist items passed at current level + ready-to-advance flag |
| `measure_health` | `/measures`, `measures-panel`, `entity-workspace` | Latest reading + pct-to-target + status color |
| `operator_workload` | `/operators`, `/flightdeck`, `operator-assignments-panel` | In-flight work per operator |
| `project_rollup` | `/projects`, `/projects/$id`, `kanban-board` | Project status + task counts |
| `recent_done_log` | `/today`, `audit-trail-panel` | Recently completed work across all kinds |
| `relationship_domain_maturity` | `/relationships/$id`, `excellence-matrix`, `heat-ring` | Per-domain L1–L5 score per relationship |
| `relationship_journey` | `/sweetcycle`, `/relationships/$id`, `sweetcycle-board` | Current Sweetcycle phase + session id per relationship |
| `task_blockers` | `/today`, `/my-tasks`, `kanban-board` | Tasks currently blocked + reason |
| `time_grid` | `/calendar`, `/today`, `/planner`, `mini-calendar` | Polymorphic scheduled/due/done timeline across all actionable kinds |
| `work_context` | `app-topbar`, `work-context-strip` | Cross-relationship "what's hot now" rollup |
| `workflow_step_pipeline` | `/workflows/$id`, `workflow-step-canvas` | Step status + assigned operator per workflow run |

## Rules
- **No new view ships without an entry here.**
- **No view ships without `security_invoker = true`.**
- **Every page that lists/aggregates entities reads from a view, not a join in JS.**
