

# Wave 2 — Operator Dashboard rebuild + universal walk-menu

Turn `/operators/$id` from a profile editor into a real cockpit that answers "what is on this operator's plate, what's stuck, what just landed?" — and ship the reusable **walk-menu** that every later wave will mount.

## What you'll see when this lands

### 1. `/operators` index — capacity-visible grid

Each tile becomes a glanceable workload card (reads `operator_workload` view):

```text
┌──────────────────────────────────┐
│ 🤖 Drafter Agent      [agent]    │
│ ● available · 3 skills           │
│                                  │
│   12     2       1     Nov 24    │
│  open  blocked overdue  next     │
│                                  │
│ [ writing  research  +1 ]        │
└──────────────────────────────────┘
```

Filter chips stay (All/Human/Workflow/Agent). Cards sort by open_tasks desc by default; toggle to "alphabetical".

### 2. `/operators/$id` — six-tab cockpit

Replaces the current edit-form layout. New structure top-to-bottom:

1. **Header** — avatar/icon, name, kind badge, availability picker (kept), edit-profile drawer trigger (skills/likes/dislikes/agent config moves here so they don't dominate)
2. **Capacity strip** — 4 stat tiles from `operator_workload`: Open · Blocked · Overdue · Next due. Color: blocked>0 red, overdue>0 amber.
3. **Six-tab queue** with live counts:
   - **Now** — tasks with `scheduled_for = today` OR `due_date = today`, not done
   - **Queue** — tasks assigned to operator, status not Done/Cancelled, not in Now, not blocked
   - **Blocked** — tasks where `blocked = true` OR `waiting_on` is set
   - **Awaiting** — workflow_step_runs where assignee = this operator and `status = 'awaiting_approval'` (humans/agents only)
   - **Handoffs** — empty placeholder card: "Handoff inbox lands in Wave 3" with a disabled outline
   - **History** — recently completed (status in Done/Complete, ordered by updated_at desc, limit 25)
4. **Measures panel** (kept)
5. **Agent canon block** (agents only) — collapsed by default; expand to see model + system prompt
6. **Story trail** (kept)

Every row in every tab uses the new walk-menu (see §3).

### 3. The walk-menu (the cross-cutting piece)

A small popover trigger (`⋯` button) on every work-item row across the app. Six verbs, tuned per entity kind:

```text
┌─────────────────────────┐
│ ↑ Up        Project     │
│ ↓ Down      Subtasks (3)│
│ → Produces  Component   │
│ ← Consumes  Brief, Lens │
│ ✓ Advances  Quest, KR   │
│ ⓘ About     Open detail │
└─────────────────────────┘
```

Resolution rules per item type:
- **Task**: Up = project, Down = task_dependencies, Produces = task_components, Consumes = source_kind/proposal_id, Advances = measures attached to project
- **Project**: Up = relationship, Down = tasks, Produces = project_components, Consumes = playbook, Advances = mission/quest
- **Workflow run**: Up = workflow def, Down = step runs, Produces = component output, Consumes = inputs, Advances = session
- **Session**: Up = engagement plan, Down = session items, Produces = documents/decisions, Consumes = template, Advances = sweetcycle phase

Built once as `<WalkMenu kind="task" id={...} />`, fetches lazily on open. Mounts in Wave 2 on operator cockpit; reused in Today (Wave 4), Sandbox, Flightdeck, all detail pages later.

### 4. Universal detail shell (proven on `/operators/$id`)

A reusable `<DetailShell>` wrapper used by the new operator page and ready to extend to other detail routes in later waves:

```text
[ back link ]
[ canonical header — icon + name + kind chip + status chips ]
[ work-context strip — capacity / health / next due ]
[ tabs OR connection rail + content ]
[ evidence footer — story trail / audit ]
```

Operator dashboard is the proof. Component / Workflow / Session / Task / Project detail pages adopt it incrementally in Waves 3–5.

## Files I'll touch

**New:**
- `src/components/walk-menu.tsx` — the reusable popover (uses shadcn Popover)
- `src/lib/walk-menu-resolvers.ts` — per-kind resolver functions returning `{ up, down, produces, consumes, advances, about }`
- `src/components/detail-shell.tsx` — header + strip + slot composition primitive
- `src/components/operator-capacity-strip.tsx` — 4-tile strip reading `operator_workload`
- `src/components/operator-queue-tabs.tsx` — the 6-tab component (renders one query per tab, lazy on tab activation)
- `src/components/operator-edit-drawer.tsx` — moved skills/likes/dislikes/agent-config into a slide-out

**Edited:**
- `src/routes/_app.operators.$id.tsx` — rewritten around `<DetailShell>` + `<OperatorCapacityStrip>` + `<OperatorQueueTabs>`. `OperatorAssignmentsPanel` removed (queue tabs replace it). Edit fields move into the drawer.
- `src/routes/_app.operators.index.tsx` — tiles show full capacity (open/blocked/overdue/next_due) instead of just open count

**Memory updated:**
- `mem://design/operator-dashboard.md` — new file canonizing the six-tab structure
- `mem://design/walk-menu.md` — new file canonizing the six verbs and resolver contract
- `mem://design/sidebar-ia.md` — note that walk-menu is the universal navigation primitive

## Data sources (no new tables in Wave 2)

- `operator_workload` view — capacity strip + index tiles ✓ exists
- `tasks` filtered by `operator_id` — Now / Queue / Blocked / History tabs ✓
- `workflow_step_runs` filtered by assignee — Awaiting tab (verify column name on first read; fall back to assigned_operator_id if `assignee_id` doesn't exist)
- All schema changes deferred to **Wave 3** (`handoff_events` table)

## Risks and what I'm NOT doing

- **Not** building the handoff sheet yet — Handoffs tab is a stub so Wave 3 has a slot to fill
- **Not** breaking `OperatorAssignmentsPanel` consumers — it's only used on `/operators/$id`, so removal is local
- **Not** retrofitting the walk-menu into other pages this wave — the build proves the API; rollout follows
- **Not** changing the index route, just the tile contents
- **Not** touching `routeTree.gen.ts` or any Supabase schema

## Sequencing inside Wave 2

1. Build `<DetailShell>` + `<WalkMenu>` + resolvers (foundation, ~30%)
2. Build `<OperatorCapacityStrip>` + `<OperatorQueueTabs>` (~40%)
3. Rewrite `_app.operators.$id.tsx` around the new pieces, move edit fields into drawer (~20%)
4. Refresh `_app.operators.index.tsx` tiles (~10%)
5. Update memory canon files

After Wave 2 lands you can navigate any operator → see their actual workload at a glance → walk from any task up/down/across the graph without leaving the cockpit. The Handoffs tab will be the only visibly empty slot, ready for Wave 3.

Reply **"Run Wave 2"** to ship, or push back on any of the six tabs / walk-menu verbs before I start.

