
# Phase 1 — Completion Pass

The foundation is mostly built. This pass fills the remaining gaps so Phase 1 fully matches the approved plan, then we're ready for Phase 2 (Capture + AI staging).

## What's missing today

1. **Sidebar links exist for Components, Playbooks, Domain Assessments — but the transformation chain entities (Personas, Missions, Journeys, Quests, Sparks, Outcomes) have schemas and entity defs and no routes.** Navigating to them today would 404.
2. **SweetCycle phase ladder** is not yet visualized on Session detail.
3. **Per-client `workflow_states`** has a table and field defs but no UI on Workflow detail to view/edit which clients are at which state.
4. **No team / settings page** for Liz to invite collaborators (admin-only) and edit her profile.
5. **Index route** still relies on a redirect — fine, but the sidebar's "Today" link points to `/` instead of `/today` which is the actual route.
6. **Polish gaps:** empty states + skeletons on entity lists; light/dark parity check on chips; keyboard nav on the command palette stub.

## What this pass adds

### Routes for transformation chain entities
Add list + detail routes for: `personas`, `missions`, `journeys`, `quests`, `sparks`, `outcomes`. All use the existing `EntityListPage` / `EntityDetailPage` components (entity defs already exist). Add them to a new sidebar group **"Transformation"** so the operator can browse the scaffolding without it cluttering the main flow.

### SweetCycle ladder on Session detail
A horizontal phase ladder rendered above the session form: Seed → Synthesize → Session → Sync → Ship. Current phase is highlighted with iridescent glow; completed phases get a check; upcoming phases are muted. Each step shows its sub-status pill (seed_status, sync_status, ship_status) and days-in-phase derived from `updated_at`. Clicking a phase scrolls to its field group.

### Per-client workflow state panel on Workflow detail
A right-rail card on the Workflow detail page listing every `workflow_states` row for that workflow. Inline editor per row: client (ref to relationships), state_of_the_thing (full ladder), source_of_advancement, notes. "+ Add client state" button opens a small form. Uses the existing `WORKFLOW_STATE_FIELDS` definition.

### Team & settings page
New `/settings` route, two tabs:
- **Profile** — display name, avatar URL, role label (everyone)
- **Team** — list of members with role badges (visible to all, mutable by admin); admin-only "Invite member" form using `supabase.auth.admin.inviteUserByEmail` via a server function (avoids exposing service role to client). On invite, the new user signs in and gets the `member` role automatically via the existing `handle_new_user` trigger.

### Small fixes
- Sidebar "Today" → `/today` (currently `/`).
- Add `errorComponent` and `notFoundComponent` to `__root.tsx` and key routes per TanStack guidelines.
- Loading skeletons on entity list and dashboard sections.
- Empty-state illustrations (lightweight SVG using iris gradient) for "no data yet".

## What's still deferred to Phase 2

- Universal Capture input + LLM intent/object/action parsing (BYO key requested at Phase 2 start)
- Staging cards with contradiction detection
- Dashboards C–H (Active Delivery, Delegation, Sessions Follow-Through, SweetCycle Tracker, Client Intelligence, Workflow Library)
- Command-palette search execution
- Quest/Spark interactivity, evidence graph, BizzyBot logic, content pipeline, voice input

## Build order

1. Routes for personas, missions, journeys, quests, sparks, outcomes + sidebar group
2. SweetCycle ladder component + wire into Session detail
3. Workflow-states panel on Workflow detail (read + write)
4. Settings route with Profile + Team tabs; admin invite via server function
5. Sidebar fix, error/notFound boundaries, loading skeletons, empty states
6. Light/dark parity sweep on chips and panels

Once approved, I'll implement in this order in default mode.
