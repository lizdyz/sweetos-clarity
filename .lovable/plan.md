# Wave 3 — Handoff inbox + `handoff_events` table

Fill the empty slot left in Wave 2's operator cockpit. Make handoffs between operators (human → agent, agent → human, workflow step → reviewer) a first-class, auditable event with an inbox UI.  
  
operator - should be able to handle tasks, project, campaigns, etc...

&nbsp;

## What you'll see when this lands

### 1. Operator cockpit → Handoffs tab becomes real

Replaces the "lands in Wave 3" placeholder. Shows two stacks:

```text
┌─ Inbound (3) ──────────────────────────────┐
│ 🤖 Drafter Agent → you      2h ago         │
│ "Brief draft ready for review"             │
│ Task: Q1 launch brief    [Accept] [Decline]│
├────────────────────────────────────────────┤
│ ⚙ Workflow: Onboard step 3 → you           │
│ Awaiting approval        [Open] [Reassign] │
└────────────────────────────────────────────┘

┌─ Sent (last 7d) ───────────────────────────┐
│ you → 🤖 Drafter Agent     yesterday  ✓    │
│ Task: Component spec       accepted        │
└────────────────────────────────────────────┘
```

Each row uses the walk-menu (built in Wave 2).

### 2. Handoff sheet — the new write surface

A slide-out triggered from any task row, workflow step run, or the operator cockpit's "Hand off" button:

```text
[ From  you            ]
[ To    ▾ pick operator ]   ← filtered by skills matching task tags
[ What  Task: Q1 brief  ]
[ Why   ▾ ready for review / blocked / escalation / FYI ]
[ Note  optional context to receiver ]
[ Due   inherits, editable ]
                       [ Cancel ] [ Hand off ]
```

On submit:

- Inserts a `handoff_events` row (status=`pending`)
- Reassigns `tasks.operator_id` (or `workflow_step_runs.assignee_id`) to the receiver
- Sets task `waiting_on` to receiver name if `reason='blocked'`
- Bumps `handoff_count` on the operator_workload-fed view

### 3. Cross-cockpit visibility

The capacity strip on `/operators/$id` gains a 5th tile when handoffs are pending:

```text
[ Open 12 ] [ Blocked 2 ] [ Overdue 1 ] [ Next Nov 24 ] [ Handoffs 3 ]
```

Flightdeck (later wave) and Today (Wave 4) will read the same `handoff_events` table.

## Schema change (one migration)

```sql
create type public.handoff_status as enum ('pending','accepted','declined','cancelled','auto_completed');
create type public.handoff_reason as enum ('ready_for_review','blocked','escalation','fyi','reassign');

create table public.handoff_events (
  id uuid primary key default gen_random_uuid(),
  from_operator_id uuid references public.operators(id) on delete set null,
  to_operator_id   uuid not null references public.operators(id) on delete cascade,
  subject_kind text not null check (subject_kind in ('task','workflow_step_run','session','project')),
  subject_id   uuid not null,
  reason public.handoff_reason not null default 'ready_for_review',
  status public.handoff_status not null default 'pending',
  note text,
  due_date date,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  created_by uuid references auth.users(id)
);

alter table public.handoff_events enable row level security;

create policy "team can read handoffs"  on public.handoff_events for select using (public.is_team_member(auth.uid()));
create policy "team can write handoffs" on public.handoff_events for insert with check (public.is_team_member(auth.uid()));
create policy "team can update handoffs" on public.handoff_events for update using (public.is_team_member(auth.uid()));

create index handoff_events_to_status_idx on public.handoff_events (to_operator_id, status, created_at desc);
create index handoff_events_from_idx     on public.handoff_events (from_operator_id, created_at desc);
create index handoff_events_subject_idx  on public.handoff_events (subject_kind, subject_id);

-- view used by the cockpit + capacity strip
create or replace view public.operator_handoff_inbox as
select
  he.*,
  case he.subject_kind
    when 'task' then (select name from public.tasks where id = he.subject_id)
    when 'workflow_step_run' then (select s.name from public.workflow_steps s
                                   join public.workflow_step_runs r on r.step_id = s.id
                                   where r.id = he.subject_id)
    when 'session' then (select title from public.sessions where id = he.subject_id)
    when 'project' then (select name from public.projects where id = he.subject_id)
  end as subject_label;
```

No data migration needed — table starts empty, fills as handoffs happen.

## Files I'll touch

**New:**

- `src/components/handoff-sheet.tsx` — slide-out form (shadcn Sheet)
- `src/components/handoff-inbox.tsx` — Inbound + Sent stacks for the Handoffs tab
- `src/components/handoff-row.tsx` — single inbox row with Accept/Decline/Open
- `src/lib/handoffs.ts` — `createHandoff()`, `respondToHandoff()` helpers (server functions via `createServerFn` + `requireSupabaseAuth`)
- `supabase/migrations/<ts>_handoff_events.sql` — schema above

**Edited:**

- `src/components/operator-queue-tabs.tsx` — Handoffs tab renders `<HandoffInbox operatorId={id} />`
- `src/components/operator-capacity-strip.tsx` — adds 5th tile when `handoff_count > 0`
- `src/components/operator-edit-drawer.tsx` — no change
- `src/routes/_app.operators.$id.tsx` — passes operator id to inbox; adds "Hand off" button in header that opens `<HandoffSheet>`
- `src/components/walk-menu.tsx` — adds "Hand off" as a quick action in the About verb section

**Memory:**

- `mem://features/handoffs.md` — new file: handoff_events schema, lifecycle, who-can-do-what

## Lifecycle rules (enforced in helpers, not triggers)

1. **Create** — `pending`. Reassigns subject to `to_operator`.
2. **Accept** — receiver clicks Accept. Status → `accepted`, `responded_at = now()`. Subject stays assigned to receiver.
3. **Decline** — receiver clicks Decline. Status → `declined`. Subject reassigns back to `from_operator` (or unassigned if null). Sender gets a bot_alert.
4. **Cancel** — sender can cancel a `pending` handoff before response. Status → `cancelled`, subject reassigns back.
5. **Auto-complete** — when subject status becomes Done while handoff is `pending`, status → `auto_completed` (cron-style, deferred to Wave 5 cleanup).

No DB triggers in Wave 3 — keeps the migration small and the logic visible in app code. Triggers can be added later once the lifecycle is proven.

## What I'm NOT doing

- **Not** adding email/notification fanout — bot_alerts row is enough for in-app visibility
- **Not** auto-suggesting a receiver yet (skill matching is Wave 5 polish)
- **Not** wiring Today / Flightdeck consumption — those waves own their own surfaces
- **Not** building bulk-handoff or handoff templates
- **Not** touching the existing `Awaiting` tab (workflow_step_runs awaiting_approval is a parallel concept; we may merge in Wave 5 once we see how they overlap in practice)

## Sequencing inside Wave 3

1. Migration: enums + table + RLS + view (~15%)
2. `handoffs.ts` server functions + types (~20%)
3. `<HandoffSheet>` write surface (~25%)
4. `<HandoffInbox>` + `<HandoffRow>` read surface (~25%)
5. Wire into Handoffs tab + capacity strip + operator header button (~10%)
6. Memory canon (~5%)

## Risks

- **Reassignment race**: two people respond to the same handoff. Mitigation: `respondToHandoff()` does an `UPDATE ... WHERE status='pending'` and returns affected rows; UI shows "already handled" if 0.
- **Workflow_step_runs assignee column name**: Wave 2 verified this exists. If subject_kind=`workflow_step_run`, helpers use that column; Wave 5 unifies if needed.
- **Empty state**: first-time users see no handoffs. Empty state copy: "No handoffs yet. Use the **Hand off** button on any task to route it to another operator."

After Wave 3 lands, every operator has a real inbox, every task can be routed with an audit trail, and Wave 4 (Today as decision surface) can pull `handoff_events` into the morning brief.

Reply **"Run Wave 3"** to ship, or push back on the lifecycle / schema / verbs first.