---
name: Co-Evolution vs SweetCycle — hard separation
description: Co-Evolution is a Lens (queryable layer); SweetCycle is the Session progression path. Never conflate.
type: design
---

# Hard separation rule (per Master Guide v4)

| | What it is | Where it lives |
|---|---|---|
| **Co-Evolution** | A **Lens** in the queryable-layers list. A way to interrogate any object through Explore/Exploit → Attune → Integrate → Recalibrate. | BizzyBots / Lens Library |
| **SweetCycle** | The **Session progression path**: Seed → Synthesize → Session → Sync → Ship. Owned by phase (client / us / both). | `sessions.sweetcycle_phase` |

**Never:**
- Treat Co-Evolution stages as workflow stages
- Add Co-Evolution stages to `sweetcycle_phase` enum
- Render Co-Evolution as a stage stepper on session detail

**Always:**
- Co-Evolution renders as a Lens perspective generation, like the other 9 BizzyBots
- SweetCycle renders as the phase board (`<SweetCycleBoard>`), nothing else
