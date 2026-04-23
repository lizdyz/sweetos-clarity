---
name: Gap-Closer mode
description: When ON, a 6-hourly cron walks active entities and drops agent-attributed Sparks wherever entity_canon.coverage_rules say coverage is thin
type: feature
---
- Toggle: `org_settings.key='gap_closer' value->>'enabled'`. Surfaced via `<GapCloserToggle>` in the topbar.
- Cron: `pg_cron` hits `/api/public/hooks/gap-scan` every 6h.
- Rules per entity kind live in `entity_canon.coverage_rules` (jsonb): `stale_capture_days`, `require_jtbd_link`, `require_active_kti`, `min_sparks_per_quarter`.
- Scanner walks: relationships (stale contact), personas (missing JTBD link), KTIs (no readings in 14d), quests (no Sparks in 90d).
- Output: agent-attributed Sparks (`generated_by_kind='agent'`, `generated_by_label='gap_scanner'`) with `subject_kind`/`subject_id` set so they triage through the universal Spark surface.
- Dedupe: skips if an open agent-Spark for the same subject was created in the last 7 days.
- Audit: `gap_scan_runs` records each pass.
