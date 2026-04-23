---
name: walk-menu
description: Universal six-verb popover (Up/Down/Produces/Consumes/Advances/About) mounted on every work-item row to walk the entity graph without leaving context.
type: design
---

# Walk-menu — universal navigation primitive

`<WalkMenu kind="task|project|workflow_run|session" id={uuid} />` mounts on every actionable row across the app. Lazy-loads edges on open via `resolveWalk()` in `src/lib/walk-menu-resolvers.ts`.

## The six verbs

| Verb | Meaning | Example for a Task |
|------|---------|-------------------|
| **↑ Up** | Parent / container | Project |
| **↓ Down** | Children / sub-items | task_dependencies |
| **→ Produces** | Outputs / artifacts | task_components → Components |
| **← Consumes** | Inputs / sources | proposal, brief |
| **✓ Advances** | Goals being moved forward | Measures attached to project |
| **ⓘ About** | Open detail page | `/tasks/$id` |

## Resolver contract

`resolveWalk(kind, id)` returns `WalkEdges = { up, down, produces, consumes, advances, about }`. Each entry is `{ label, to, params?, hint? }`. Empty arrays render as "—".

Adding a new entity kind: add it to `WalkKind`, add a `resolveX(id)` function, dispatch from `resolveWalk`. Don't extend the verb set — six is canon.

## Where it mounts

- **Wave 2**: every row in `<OperatorQueueTabs>` (Now/Queue/Blocked/Awaiting/History)
- **Wave 4**: Today decision bar
- **Future**: any list of work items (Sandbox, Flightdeck, sweetcycle board, planner)
