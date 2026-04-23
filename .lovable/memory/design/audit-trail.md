---
name: Audit Trail vs Story Trail
description: Audit Trail is the formal append-only system-of-record at /audit; Story Trail stays narrative
type: design
---
Audit Trail (`/audit`) and Story Trail are different surfaces with different jobs.

- Audit is **append-only**, formal, filterable, exportable. Lives at `/audit`. Reads `entity_audit_log` only. Dense table, monospace IDs, side-by-side diffs, severity pills, click-to-filter on every cell. Three default presets: Operational review, Security & change visibility, Compliance traceability.
- Story is **narrative**, summarized, no diffs. Lives bottom-of-detail and top-of `/today`. Sparks + outputs + decisions + filtered audit beats.

Every meaningful write goes through `logAuditEvent` (`src/utils/audit.server.ts`). Generic CRUD trigger `trg_generic_audit` keeps coverage automatic on the curated table allow-list (components, journeys, quests, missions, tasks, projects, decisions, sessions, workflows, operators, relationships, engagement_plans, sparks).

Deep linking: every `EvidenceFooter` and `AuditTrailPanel` carries a "View in audit" link with `?subject_kind=…&subject_id=…` so per-entity history opens the global console pre-filtered.

`entity_audit_log` is immutable — UPDATEs are blocked by trigger; only admins can DELETE.
