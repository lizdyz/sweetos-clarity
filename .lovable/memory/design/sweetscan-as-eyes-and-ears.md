---
name: SweetScan as eyes & ears
description: SweetScan is the outside-in intelligence layer; lives in Think; embedded views on Domain/Relationship/Today/Flightdeck.
type: design
---

SweetScan is the **outside-in intelligence layer** of SweetBOS — what the world is telling us before it arrives.

**Home:** `/sweetscan` (Think group). Three tabs:
1. Forward radar — global KtiPanel across every Domain + Relationship.
2. Rubric scanner — pick a Domain, pull external best-practice signals into Excellence-Rubric proposals.
3. Signal inbox — chronological audit of recent KTI scans + rubric proposals.

**Embedded views** (same data, scoped):
- Domain detail — `<SignalScannerConfig>` scoped to that domain.
- Relationship detail — `<KtiPanel relationshipId={id} />`.
- Today — `<FiredKtisStrip />` showing last-24h fires across all clients.
- Flightdeck — fired-KTI count column per relationship (future).

**Hard rules:**
- SweetScan is NOT a Library catalog and NOT a Today action — it's a Think-layer surface ("what is the world telling us?").
- Never confuse with Measures (backward) or Sparks (atomic interactions).
