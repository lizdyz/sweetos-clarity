---
name: Key Trend Indicators (KTIs)
description: Forward-facing signal trackers — never confuse with KPIs (backward) or Sparks (atomic interactions)
type: feature
---

# KTIs — Forward radar

KTIs are first-class entities that track **forward-facing signals** — they tell us where things are going *before they arrive*. Different from KPIs, which measure the past.

## Tables

- `key_trend_indicators`: name, description, `domain_id`, `owner_operator_id`, `threshold_definition`, `trigger_action` (task / bot_alert / flightdeck_flag / all), `scan_frequency` (daily / weekly / monthly), `status` (active / paused / fired), `relationship_id` (NULL = universal, set = client-specific).
- `kti_scans`: per-scan record with `direction` (up / down / flat / fired / unknown), `fired` boolean, `observed_value`, `evidence` jsonb. When `fired=true`, parent KTI status flips to `fired` via trigger.

## Surfaces

- `/library/ktis` — index + detail (`/library/ktis/$id`)
- `<KtiPanel>` — radar component, mounts in three modes:
  - Global (no props) — all KTIs
  - Per-domain (`domainId`) — embedded on domain detail
  - Per-relationship (`relationshipId`) — universal + client-scoped, embedded on relationship detail
- `SignalScannerConfig` (SweetScan) — "Forward radar" tab alongside the rubric scanner

## Edge function

`scan-signals` has two modes:
- `mode: 'rubric'` — proposes Excellence checklist items (existing)
- `mode: 'kti'` — evaluates threshold against signals, writes `kti_scans` row, sets direction/fired

Cron via `/api/public/hooks/scan-ktis` evaluates `scan_frequency` against last scan time and fans out invocations.

## What KTI is NOT

- **Not a Measure.** Measures (Objective/KR/KPI/CSF) are backward-looking, attached to a subject. KTIs watch the outside world.
- **Not a Spark.** Sparks are atomic interactions inside Quests. A KTI fire can spawn a Spark or Task; the KTI itself is not one.
- **Not a Lens.** Lenses interrogate existing objects. KTIs watch external trends.
