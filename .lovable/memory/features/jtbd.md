---
name: Jobs-to-be-done
description: JTBD lives in jobs_to_be_done; surfaced on Personas, Components, and OCDA Observe column
type: feature
---
JTBD is a first-class entity in `jobs_to_be_done`. Shape: "When [context], I want to [motivation], so I can [outcome]." Fields: statement, job_type (functional|emotional|social), context, desired_outcome, current_solution, pain_severity (1-5), persona_id, relationship_id, related_domains, related_components[], related_outcomes[], status (discovered|validated|addressed|retired). Home page: `/library/jtbd`. Surfaced on Persona detail (JTBDs this persona has) and Component detail (JTBDs this component addresses). Render via `<JTBDList personaId>` or `<JTBDList componentId>`.
