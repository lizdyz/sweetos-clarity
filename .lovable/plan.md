
# SweetBOS — Phase 1: Foundation

A transformation-aware operating system for SweetBot Inc. Phase 1 stands up the data model, auth, navigation shell, core entity CRUD, and the two highest-leverage dashboards. Universal Capture + AI staging + remaining dashboards land in Phase 2 once the foundation is solid.

## What Phase 1 delivers

### 1. Auth & team
- Email/password auth via Lovable Cloud
- `profiles` table (display name, avatar, role label) auto-created on signup
- `user_roles` table with `admin` / `member` enum + `has_role()` security-definer function
- Invite-by-email flow (admins only) so Liz can add collaborators
- All entity tables RLS-protected; visible to any authenticated team member, mutable by owner or admin

### 2. Database — full MVP schema
Built per `05-schema-appendix.md`, with all canonical enums as Postgres types:
- **Operational (full CRUD in Phase 1):** Relationships, Projects, Tasks, Sessions, Workflows (+ per-client `workflow_states`), Documents/Deliverables, Decisions, Delegation, Campaigns
- **Transformation scaffolding (tables + IDs only, viewable, light edit):** Components, Domain Assessments, Engagement Playbooks, Personas, Missions, Journeys, Quests, Sparks, Outcomes
- **Hooks present but inert:** Captured Answer, Atomic Intelligence Unit fields distributed across Sessions/Domain Assessments per the extensibility doc
- Linkage tables for many-to-many (deliverables_produced, components_advanced, domain_assessments per session, related_components/domains/tenets on workflows, etc.)
- Shared enums: progression_state, source_of_advancement, sweetcycle_phase, state_of_the_thing, intelligence_confidence, pipeline_stage, mirror_status, prompt_status, etc.

### 3. Navigation shell — operator side
Persistent left sidebar, collapsible to icon rail. Routes:
- Home / Today · Capture (placeholder for Phase 2) · Relationships · Projects · Tasks · Sessions · Workflows · Components · Playbooks · Domain Assessments · Delegation · Decisions · Documents · Campaigns · Review Queue (placeholder) · Search

Top bar with global search (⌘K command palette stub), profile menu, theme toggle.

### 4. Entity workspaces (built this phase)
For each operational entity (Relationships, Projects, Tasks, Sessions, Workflows, Documents, Decisions, Delegation, Campaigns):
- **List view** — dense table with column visibility, multi-filter (status, owner, stage, date), saved views, inline status edits
- **Detail view** — left: structured fields grouped by purpose (identity, state, progression, intelligence, links); right rail: linked objects (related tasks, sessions, deliverables, contradictions log)
- **Create/edit** — side-sheet forms; smart defaults per entity
- **Cross-linking** — Tasks ↔ Projects ↔ Relationships ↔ Sessions ↔ Workflows always navigable in both directions

For scaffolding entities (Components, Playbooks, Personas, Domain Assessments, Missions, Journeys, Quests, Sparks, Outcomes):
- List + detail viewer, basic edit form, linkable from operational entities
- Quests/Sparks: read-only list — IDs and names exist, no interaction engine

### 5. Dashboards (Phase 1 set)
Two of the eight ship now; the rest are placeholders with the same shell:
- **A. Today / This Week** — sections for Due today, Due this week, Overdue, Blocked, Waiting on, Active sprints, Pending sessions, Overdue relationship next-actions. Each row jumps to the entity.
- **B. Pipeline / Relationship Motion** — kanban by `pipeline_stage`, plus toggle to grouped table by status. Filters: service, geography, owner. Shows next action + days since last touch, mirror status pill.

Phase 2 builds C–H (Active Delivery, Delegation, Sessions Follow-Through, SweetCycle Tracker, Client Intelligence, Workflow Library) on the same dashboard shell.

### 6. SweetCycle phase tracking
Sessions carry `sweetcycle_phase`, completion signals, governing playbook, persona. Session detail view shows the phase ladder (Seed → Synthesize → Session → Sync → Ship) with current position, days in phase, blockers. Per-engagement view computed from active Sessions + Workflow state per client.

### 7. State tracking primitives (live now)
- Workflows-per-client: editable `state_of_the_thing` selector with full ladder
- Sessions + advancement objects: `progression_state`, `source_of_advancement` selectors using full enums
- Relationships + Sessions: `intelligence_confidence` indicator (visual chip)

### 8. Design system — "Crystal-clear, light-first"
- **Light:** opal/lavender-white surfaces, soft iridescent cyan→violet→pink accent gradient reserved for primary actions, focus rings, and confidence chips. Polished glass panels for elevated cards (subtle backdrop blur, inner highlight).
- **Dark:** deep indigo-violet atmosphere, same gradient accents at higher saturation, controlled glow on active/focus, identical hierarchy.
- Typography: large, highly legible sans for headings; clean sans body; mono for IDs and enum codes.
- Generous spacing, rounded-2xl panels, sharp 1px borders, calm motion (150–250ms ease-out).
- Components: confidence chip, progression-state chip, source-of-advancement badge, contradiction marker, BizzyBot orientation slot (visual placeholder, no logic yet).
- Fully themed light + dark from day one. All colors as oklch tokens in `styles.css`.

## What Phase 1 does NOT include (saved for Phase 2+)
- Universal Capture input + LLM intent/object/action parsing
- Staging cards with contradiction detection + confirm/edit/reject flow
- Dashboards C–H
- Command palette search execution (shell ships, full search in Phase 2)
- Quest/Spark interactivity, SweetSync client side, evidence graph, BizzyBot logic, intelligence scanners, content pipeline, voice input

## Build order within Phase 1
1. Auth + profiles + roles + RLS helpers
2. Full schema migration (operational + scaffolding + enums + linkage)
3. App shell, sidebar, theme system, design tokens, core UI primitives (chips, panels, side-sheet)
4. Relationships → Projects → Tasks workspaces (highest-traffic loop)
5. Sessions + Workflows + per-client workflow state + SweetCycle phase UI
6. Documents, Decisions, Delegation, Campaigns workspaces
7. Scaffolding entity viewers (Components, Playbooks, Personas, Domain Assessments, Missions, Journeys, Quests, Sparks, Outcomes)
8. Dashboard A (Today/This Week) + Dashboard B (Pipeline)
9. Polish pass: empty states, loading skeletons, light/dark parity, keyboard nav

## After approval
Once you click Implement, I'll: enable Lovable Cloud, run the schema migration, then build in the order above. The BYO LLM key for parsing comes in at the start of Phase 2 — I'll request it then so it isn't sitting unused.
