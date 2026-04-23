---
name: SweetScan Watchlist-first
description: SweetScan opens to the Watchlist dashboard — what you've decided to watch — not the Forward Radar firehose. Captures can propose new watches.
type: design
---

## Rule
The default tab on `/sweetscan` is **Watchlist**, not Forward Radar.

## Why
Forward Radar is the *output* — every KTI in the system. The Watchlist is the *home* — what you've decided to watch and how each watch is doing. Users land on a dashboard, not a firehose.

## Layout
- **Header strip** — totals: KTIs watching · fired this week · quiet · needs config · suggested from captures.
- **Tri-pile**:
  - 🔥 Active fires — KTIs with `status='fired'` or a recent fired scan.
  - 👁 Watching — KTIs scanning normally.
  - ⚠ Needs setup — paused, stale beyond cadence, or missing threshold.
- **Suggested from recent captures** — `inbound_signals` with `suggested_kti_payload IS NOT NULL` and `status != 'routed'`. One click → pre-filled KTI sheet.

## Drill-downs (other tabs)
- Forward radar (firehose of all KTIs)
- Rubric scanner (active scan tool)
- World Watch (per-client lens)
- Signal inbox (results queue)

These are *tools you reach for from the Watchlist*, not destinations.

## Capture → SweetScan loop
The `scan-signals` edge function in `classify_inbound` mode populates `inbound_signals.suggested_kti_payload` (jsonb) when content matches a recurring trend pattern. The Watchlist surfaces these; clicking creates the KTI and marks the signal `routed`.

## Files
- `src/components/sweetscan/watchlist-dashboard.tsx`
- `src/components/sweetscan/kti-suggestion-from-capture.tsx`
- `src/routes/_app.sweetscan.tsx` (Watchlist is the default `defaultValue`)
