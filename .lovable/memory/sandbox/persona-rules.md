---
name: Persona rules R1–R5
description: Real but needs decision — enforce as DB constraints (R1 NOT NULL jtbd_id) or only as auditor presence checks
type: feature
---

R1: persona must have a JTBD
R2: persona must trace to ≥1 Domain and ≥1 Journey
R3: persona must have a primary Component anchor
R4: persona ranking is comparative within a relationship
R5: persona is a lens, not a segment

**Decision needed:** enforce R1 as `personas.jtbd_id NOT NULL`, or only enforce via UX Auditor presence check on `/personas/$id`.
