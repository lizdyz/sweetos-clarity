---
name: Idea Sandbox
description: /sandbox is the triage layer between Capture and the rest of the OS. Raw inputs → framed by overlays → promoted to task/project/spark/decision input/component canon/archive.
type: design
---

**Idea Sandbox = the triage table between raw inputs and structured work.** Lives at `/sandbox` in the **Think** group.

## Flow
```
Capture (port) → Sandbox (triage) → {Task | Project | Spark | Decision input | Component canon | Archive}
```

## States
- **raw** — untriaged
- **framed** — at least one overlay (5Ps, BizzyBot lens, KTI candidate, Domain/Tenet fit, Decision-readiness, Op Alpha) has been applied
- **routed** — promoted to a downstream entity
- **archived** — soft-deleted with reason

## Inbox feed
The `sandbox_inbox` SQL view auto-unions: manual sandbox items + pending Captures + KTI fires (last 30d) + pending inbound_signals. The Raw lane is always live without manual inserts.

## Rules
- **Never auto-promote** — every promote is a human click; AI only suggests via overlays
- **Provenance always** — promoting writes both `sandbox_items.routed_to_*` and `tasks/projects/sparks.spawned_by_*`
- **Capture stays the input port** — don't move triage UI into Capture
