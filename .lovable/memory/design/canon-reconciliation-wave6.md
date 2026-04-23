---
name: Canon Reconciliation (Wave 6)
description: Resolution of the 8 reconciliation issues from the Apr-2026 canon dump. Database now matches the doc.
type: design
---

## What shipped vs the 8 issues

| # | Issue | Resolution | Where it lives |
|---|---|---|---|
| 1 | Component vs Module vs Capability | Component = stored. Capability = derived view (`capabilities_derived`). Module = tag (`module_tags` on `playbooks`, `workflows`). | `<CapabilitiesDerivedPanel>` on `/components`. |
| 2 | Quest = exactly 1 Deliverable | Rule held for Quests. Sessions/Workflows write to same Documents but tagged via `documents.deliverable_source` enum (`quest|session|manual|workflow`). | `<DeliverableSourceChip>` on Vault & Documents. |
| 3 | Map/Machine work counting in SweetSync | Trigger `trg_session_component_advance` bumps `components.last_reviewed` + `updated_at` whenever `session_components.advancement_type` is Primary/Secondary. Service work now retroactively counts. | DB trigger only — visible via Component detail. |
| 4 | Domain Assessment as living model | New `domain_assessment_versions` table. Mirror writes v1. Future Sessions/SweetScan append v2+. | `<DomainAssessmentTimeline>` on `/domain-assessments/$id`. |
| 5 | SweetCycle is state machine, not entity | Already correct in schema (`sessions.sweetcycle_phase`). Confirmed in canon — no UI treats it as a peer entity. | Memory note only. |
| 6 | Deliverable Catalog vs instances | `documents.catalog_entry_id` FK → `entity_canon`. Instances point home. | `<CatalogLinkChip>` on Document detail. |
| 7 | Reflection: Spark type vs lifecycle event | `sparks.kind='reflection'` for in-Quest. New `reflection_events` table for milestones. Triggers on Quest/Journey/Mission completion auto-spawn prompts. | `<ReflectionEventRow>` (mounts wherever needed). |
| 8 | 8 Modules → tags | `module_tags text[]` on `playbooks` + `workflows`. No `/modules` route exists or is needed. | Tag arrays only. |

## Framework Lens overlay (F1–F8)

`<FrameworkLensSwitcher>` + `<FrameworkLensBoard>` — view-only projection. Same rows, different grouping. Resolvers default to existing tag fields (`ocda_stage`, `current_maturity_level`, etc.). Unmapped rows land in an "Unmapped" column. This is the deterministic surfacing of `mem://design/lenses-bizzybots.md`.

## Hard rules preserved

- Sparks vs Tasks distinction (canon-sparks-vs-tasks.md) — untouched.
- No new entity vocabulary introduced. Capability stays a view. Module stays a tag. SweetCycle stays a state machine.
- No routes deleted or renamed.
- All new tables use `is_team_member(auth.uid())` RLS.

## Backlog (deferred)

- Wave 7: Data Class A/B/C/D + AI Routing (Family 7 infra).
- BizzyBot active-scanning intelligence (separate wave).
- Auto-write `domain_assessment_versions` row on every assessment update via trigger (currently manual append).
