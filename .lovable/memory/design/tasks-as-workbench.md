---
name: Tasks as a workbench
description: Tasks page is a workbench, not a list — provenance + downstream chips, Next-up lane, pipeline ribbon
type: design
---

The Tasks page must answer three questions on every glance:

1. **Why does this task exist?** → `spawned_by_kind` + `spawned_by_id` columns drive a provenance chip on every row (KTI fire · Spark · Decision · Capture · Workflow · Manual). The chip links back to the source.
2. **What's it part of?** → relationship/project chips already exist; keep them.
3. **What does it block?** → `task_blockers` view drives the "Blocks N" chip and the inline "Blocked by …" line.

**Top of page:**
- **Pipeline ribbon** — Capture → Queue → Tasks(open/blocked) → Done this week. Each segment is a link.
- **Next up lane** — composed top-8 across:
  - Unblocked & due today
  - Unblocked & spawned by a fired KTI (high signal)
  - Unblocking the most other work (leverage)
  - Started but stalled ≥3 days

**Hard rules:**
- Every task auto-spawned by the system MUST set `spawned_by_kind` + `spawned_by_id`.
  - KTI fire → trigger `trg_kti_scan_fired` already does this when `trigger_action` is `task` or `all`.
  - Inbound signal → `convertToTask` mutation in `<InboundSignalCard>` sets `spawned_by_kind='capture'`.
- Manual creates leave both NULL (or set kind='manual').
- Provenance chip is always visible — never hide behind a hover.
