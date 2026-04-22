---
name: Core object — Workflow is the truth; Map / Machine / SweetSync are delivery variations
description: Workflow is the underlying capability; Mirror / Map / Machine / SweetSync are how it's delivered
type: design
---

# The core object is Workflow

Per Master Guide v4, **Workflow** is the first-class capability. The four user-facing names — **Mirror**, **Map**, **Machine**, **SweetSync** — are *delivery variations* of that one underlying object, each tuned to a different client posture.

| Variation | Client posture | What it delivers |
|---|---|---|
| **Mirror** | "Tell me what I look like" | Diagnostic reflection |
| **Map** | "Show me the path" | Strategic roadmap |
| **Machine** | "Build it for me" | Productized execution |
| **SweetSync** | "Let me work between sessions" | Self-paced board |

**Implications:**
- One workflow definition can be delivered as Mirror or Machine via different `session_templates`.
- Do **not** create parallel database universes per variation.
- Service Shape (per relationship) records *which variations* a client has access to.

See `mem://features/service-shape.md` for the per-relationship taxonomy.
