---
name: Universal triage rollout (Wave 7)
description: UniversalDropZone + TriageCard + UniversalFilterBar mounted across the OS so intake/triage/promote feels identical everywhere.
type: design
---

**Wave 7 = the interaction model reconciliation.** Wave 6 fixed the data model; Wave 7 makes "drop anything → triage → promote" feel the same on every page.

## The three universal pieces

1. **`<UniversalDropZone />`** — accepts files, links, text, or a dragged entity card. Always lands as `sandbox_items` row in `state='raw'`. Files attach via new `sandbox_items.attached_documents` (uuid[]); dragged entities record provenance in new `sandbox_items.upstream_entity` (jsonb `{kind,id,label}`).
2. **`<TriageCard>` + `<FrameworksRail>`** — already existed; now the gesture (select → overlay → frame → promote) is the canonical UI for any triageable surface.
3. **`<UniversalFilterBar />`** — Domain · Tenet · 5P · Lens (F1–F8) · State · Owner. URL state via TanStack search params + `zodValidator(universalFilterSchema)` on the route.

## Mounted on

- Topbar: `<GlobalAddButton />` (everywhere)
- `/sandbox`: drop zone + filter bar + SandboxBoard
- `/sparks`, `/decisions`, `/tasks`, `/components`, `/quests`: filter bar
- (more surfaces in follow-up waves)

## Promote canon

Six verbs, written by `src/lib/triage-promote.ts`: **Task · Project · Spark · Decision input · Component canon · Archive**. Every promote writes `sandbox_items.routed_to_kind/id/at` AND sets the new entity's `spawned_by_kind='sandbox'` / `spawned_by_id` so provenance is bidirectional.

## Rules
- Never auto-promote — every promote is a human click
- Filter bar is opt-in per route via `validateSearch: zodValidator(universalFilterSchema)`
- Use `fallback()` from `@tanstack/zod-adapter`, never `.catch()`
