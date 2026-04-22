---
name: Two progression paths — Session path and SweetSync path
description: Session path (Evidence → Judgment → Decision) and SweetSync path (Decomposition: Journey → Quest → Spark) both write to one truth model
type: design
---

# Two paths, one truth

Per Master Guide v4 there are **two progression paths**, and both write into the same data model.

## Session path
**Evidence → Judgment → Decision.** Linear, advisor-led. Captured during Sessions; the SweetCycle stages (`Seed → Synthesize → Session → Sync → Ship`) carry it.

## SweetSync path
**Decomposition: Mission → Journey → Quest → Spark.** Self-paced, client-led between sessions. A Mission can be top-down (defined by Liz) **or** emergent (bubbles up from accumulated Spark evidence).

## Truth model

Both paths write to the same canonical entities:
- `missions`, `journeys`, `quests`, `sparks` (decomposition)
- `sessions`, `decisions`, `outcomes` (session-led)
- `components` advance via either path (`project_components` / `task_components` / `spark.advances_component_id`)

**Implication:** Don't model these as competing funnels in UI. They are two *entry rhythms* into one truth.
