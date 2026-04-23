---
name: Canon tab rule
description: Every detail page exposes a read-only Canon tab via EntityShell. Editing canon happens in exactly one place — /settings/canon.
type: design
---

**Wisdom can be read everywhere, edited in one place.**

## Rule

- Every entity detail page wrapped in `<EntityShell>` automatically gets a "Canon" tab in Z4 (the tab strip).
- The Canon tab body is `<EntityCanonTab entityKind={kind} />` — read-only summary of: purpose · inputs · outputs · invariants · examples.
- Editing those fields lives **only** at `/settings/canon`. Detail pages never expose a Canon write affordance.
- This avoids drift: there is one canonical place where the meaning of an entity kind is authored.

## Why

The Canon tab is the "what is this thing supposed to be" pane. If we let it be edited from anywhere, drift and contradictions creep in. By making it a single-source-of-truth that every page reads, the same definition shows up identically on `/tasks/$id`, `/projects/$id`, `/sparks/$id`, etc.

## Implementation

- `<EntityShell>` auto-appends `{ key: "canon", label: "Canon", body: <EntityCanonTab .../> }` after the route's tabs.
- `<EntityCanonTab>` reads from `entity_canon` table (subject = entity kind, not row id).
- "Edit canon →" link inside the tab body deep-links to `/settings/canon` with the entity kind preselected.

## Not allowed

- Inline edit affordances on the Canon tab on detail pages.
- Per-row canon overrides (canon describes the kind, not the instance).
- Hiding the Canon tab on any detail page wrapped in `<EntityShell>`.
