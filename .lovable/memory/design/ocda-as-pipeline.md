---
name: OCDA as a real pipeline
description: OCDA must function as an actual operational pipeline (Observe → Choose → Decide → Act → Done), not a passive label. Every actionable subject mounts <OCDAStageChip>, the cockpit moves work between stages by drag, the Decide column has an inline composer, no read-only OCDA labels.
type: design
---

**Rule:** OCDA is a pipeline, not a label.

## What this means in code
- Every actionable detail page (task, project, decision, spark, proposal, sandbox item) **mounts `<OCDAStageChip>`** in the header. One click advances the stage.
- The OCDA Cockpit's four lanes are **drop targets**, not read-only buckets. Drag a card between lanes → writes `ocda_stage` on the underlying row.
- The **Decide lane has an inline composer** — "Log decision" button at the top of the column opens a sheet that writes `decisions` row with `ocda_stage='decide'`, `status='decided'`.
- The **Observe lane** unions all four sources: `proposals` + `sparks` + `inbound_signals` + `kti_scans` (last 24h).
- The **Act lane** unions running work: `tasks` in motion + `workflow_step_runs.status='running'` + today's scheduled sessions.
- Empty states and per-card hints show the verb: Observe → Frame, Choose → Weigh, Decide → Log, Act → Move it forward.

## What's banned
- Read-only OCDA badges that just display stage without affording change.
- OCDA being treated as analytics — it's a working surface.
- Auto-inferring stage from other fields. Stage advance is an **explicit human click** for trust.
