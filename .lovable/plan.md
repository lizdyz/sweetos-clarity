

# Phase 2.8: Reconcile audit + add Engagement Plans, Maturity rollup, Funnel fields

You said "I don't actually know" on the A/B/C path question. That's fair — those options mixed scope and tooling. Let me pick for you based on what's lowest-risk and highest-leverage, and you can redirect after seeing it.

## My pick: **Path A** (Phase 2.8 only, no Notion runtime sync, Agents next)

Why:
- Notion runtime sync is a separate concern with its own failure modes (token rotation, rate limits, conflict resolution). Bolting it onto a schema migration doubles the surface area you'd review.
- Agents are net-new behavior; reconciliation is fixing what's already half-built. Fix the foundation first.
- You can still use Notion MCP at build time for me to mirror structure when you ask — that doesn't need Phase 2.8.5.

If you want runtime sync or Agents folded in, say so and I'll re-cut.

## What lands in Phase 2.8

### Migration 1 — Funnel fields on `relationships`
Add: `awareness_tier`, `temperature`, `drift_risk` (enums), `proposal_document_id` (FK→documents), `proposal_sent_at`, `proposal_expires_at`, `proposal_version`, `service_start_date`, `service_end_date`, `primary_service`, `service_status`.
Add generated column `days_since_last_contact` (computed from `last_contact`).

### Migration 2 — `engagement_plans` + `engagement_services`
- `engagement_plans`: relationship_id, plan_name, status (Proposed/Accepted/In Progress/Completed), start_date, end_date, total_revenue_usd, map_roadmap (text), machine_roadmap (text), expected_domains (text[]).
- `engagement_services`: plan_id, relationship_id, service_type (Mirror/Map/Machine/SweetSync/SweetConnect), start_date, end_date, status, total_value_usd. Replaces flat `active_services` array semantically (array stays for back-compat read).
- Sessions get `engagement_plan_id` FK so each session ladders up to a plan.

### Migration 3 — Maturity rollup view (no new table)
SQL view `relationship_domain_maturity` joining `excellence_scores` → `excellence_rubric` → `domains`, returning `(relationship_id, domain_slug, current_level, last_assessed_at, last_score_id)`. Reads from existing data, no duplication, auto-updates as scores change.

### Migration 4 — Audit reconciliation on existing tables
- `sessions`: add `sequence`, `domain_covered`, `outcome_findings`, `maturity_lift_from`, `maturity_lift_to` if missing.
- `components`: add `questions_it_answers`, `typical_session_length`, `prerequisite_component_ids` (uuid[]), `used_in_offerings` (text[]) if missing.
- `documents`: add `related_session_id`, `session_phase` (Pre-Engagement/Deliverable/Follow-up), `component_template_for` (uuid), `reusability_tier` (One-Time/Relationship/Org/System) if missing.

All new columns nullable; no data loss. RLS policies cloned from existing patterns on each table.

### UI deliverables
- New routes: `/_app/engagement-plans/index.tsx` and `/_app/engagement-plans/$id.tsx` via `EntityListPage`/`EntityDetailPage`.
- Add `engagement_plans` to `src/lib/entities.ts` with column config, kanban by status, filter by relationship.
- Add to sidebar under "Pipeline" group.
- On `/_app/relationships/$id.tsx`: new "Funnel" card (awareness/temperature/drift), "Proposal" card (doc link + dates), "Maturity Map" panel reading the new view, "Engagement Plans" list filtered by relationship.

### What I'm NOT doing in 2.8
- Notion runtime sync (Phase 2.8.5, separate)
- Agents — standalone prompt + workflow-bound (Phase 2.9, next)
- Touching cadence, queue, capture, kanban, workflows, excellence rubric, the 22 Domains/Tenets

### Files touched
- 4 new migrations under `supabase/migrations/`
- `src/lib/entities.ts` (add engagement_plans entity)
- `src/components/app-sidebar.tsx` (add nav item)
- `src/routes/_app.engagement-plans.index.tsx` + `.$id.tsx` (new)
- `src/routes/_app.relationships.$id.tsx` (add Funnel/Proposal/Maturity/Plans panels)

### Memory write
- `mem://features/engagement-funnel` — funnel field semantics (awareness tiers, temperature, drift), proposal lifecycle, and the plan→service→session hierarchy.
- `mem://features/maturity-rollup` — view definition, why it's a view not a table.
- Append index Core line: "Engagement = Plan → Services → Sessions. Maturity Map is a view over excellence_scores, never a duplicate table."

## After 2.8 ships
Next prompt I'll plan **Phase 2.9: Agents** (standalone prompt agents + workflow-bound agents, attachable to tasks/projects/workflows, runs feed the Queue). Then Phase 2.8.5 if you still want runtime Notion sync.

Approve this and I'll build it. If you want Agents first instead, say "Agents first" and I'll re-cut.

