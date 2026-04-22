---
name: SweetScan as eyes & ears (and hands)
description: SweetScan is the outside-in intelligence layer; lives in Think; now also has hands — fires spawn tasks/alerts, captures route to inbox, per-relationship World Watch.
type: design
---

SweetScan is the **outside-in intelligence layer** of SweetBOS — what the world is telling us before it arrives. It now has both **eyes** (radar/scanner/inbox) and **hands** (auto-spawn).

**Home:** `/sweetscan` (Think group). Four tabs:
1. **Forward radar** — global KtiPanel across every Domain + Relationship.
2. **Rubric scanner** — pick a Domain, pull external best-practice signals into Excellence-Rubric proposals.
3. **World Watch** — pick a relationship → outside-in view of just that client (radar + inbound).
4. **Signal inbox** — three columns:
   - **Inbound captures** (`inbound_signals` rows from Capture) with one-click "Make Task" / "Dismiss"
   - KTI scan history
   - Rubric proposals

**Embedded views** (same data, scoped):
- **Domain detail** — `<SignalScannerConfig>` scoped to that domain.
- **Relationship detail** — `<WorldWatchPanel relationshipId={id} />` (forward radar + inbound for that client).
- **Today** — `<FiredKtisStrip />` showing last-24h fires across all clients.
- **Topbar** — `<BotAlertsBell />` shows unread KTI fires (and other bot alerts) live.

**Auto-spawn (the hands):**
When `kti_scans.fired = true`, trigger `trg_kti_scan_fired` dispatches on `key_trend_indicators.trigger_action`:
- `task` → inserts a Task with `spawned_by_kind='kti'`, `spawned_by_id=<scan.id>`, due in 3 days.
- `bot_alert` → inserts a row in `bot_alerts` (surfaces in topbar bell).
- `flightdeck_flag` → handled at read time via the fired status.
- `all` → all of the above.
Tasks spawned this way are deduped per scan_id.

**Inbound capture pipeline:**
- Capture submission with substantial content (>40 chars or any file) inserts an `inbound_signals` row.
- AI classification (`scan-signals` mode `classify_inbound`) sets `classified_kind` + `classified_subject_type/id`.
- Inbox shows pending signals; one-click Make Task creates a task with `spawned_by_kind='capture'`, `spawned_by_id=<signal.id>` and marks signal `routed`.

**Hard rules:**
- SweetScan is NOT a Library catalog and NOT a Today action — it's a Think-layer surface.
- Auto-spawned tasks MUST set `spawned_by_kind` + `spawned_by_id` so the Tasks workbench shows provenance.
- Never confuse with Measures (backward) or Sparks (atomic interactions).
