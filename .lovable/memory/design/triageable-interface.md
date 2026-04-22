---
name: Triageable interface
description: Shared TS interface + <TriageCard> + <FrameworksRail> components so every triageable entity (sandbox item, spark, KTI fire, inbound signal) gets identical select→overlay→frame→promote mechanics.
type: design
---

**Goal:** the gesture "select item → run overlay → see frame → promote" must feel identical across the OS even though the underlying entity differs.

## Shared shape (`src/lib/triageable.ts`)

```ts
interface Triageable {
  id: string;
  kind: "sandbox_item" | "spark" | "kti" | "task" | "decision_input" | "inbound_signal";
  title: string;
  source: { kind: string; id: string; label: string };
  state: "raw" | "framed" | "routed" | "archived" | "active";
  frames: Frame[];
  promote_options: PromoteAction[];
  provenance: { upstream: Ref[]; downstream: Ref[] };
}
```

## Components
- **`<TriageCard item={triageable} />`** — universal card UI. Mounts in `/sandbox`, Sparks page, Tasks Next-up, SweetScan inbox, OCDA Observe lane.
- **`<FrameworksRail target={triageable} />`** — overlay rail. Mountable on any detail page.

## Overlay registry (v1)
- 5Ps · BizzyBot lens (F1–F8) · KTI candidate · Domain/Tenet fit
- v2: Decision-readiness, Operational alpha test
