---
name: Universal Entity Shell (Wave 8)
description: Every detail page composes the same Zone 1–5 shell — canonical header + work-context strip + connection rail + tabbed content (with always-on Canon tab) + collapsible Evidence footer.
type: design
---

**Wave 8 = same shape, every page.** One detail page = one shell so the gesture of "open something → see what it is → walk the graph → check evidence" feels identical from any starting point.

## The five zones

```
┌──────────────────────────────────────────────────────────────────────┐
│ Z1  [Icon] Name · kind · state · scope · 🛡 canon · ⋯ walk           │
├──────────────────────────────────────────────────────────────────────┤
│ Z2  Relationship › Plan › Service › Session › this entity            │
├──────────┬───────────────────────────────────────────────────────────┤
│ Z3       │ Z4  [Overview][Build][Story trail][Measures][Canon]       │
│  ↑ Up    │                                                            │
│  ↓ Down  │     Tab body                                              │
│  → Prod  │                                                            │
│  ← Cons  │                                                            │
│  ⤴ Adv   │                                                            │
│  # Tag   │                                                            │
├──────────┴───────────────────────────────────────────────────────────┤
│ Z5  ▾ Evidence · audit log · generation metadata · revisions         │
└──────────────────────────────────────────────────────────────────────┘
```

## Files
- `src/components/entity-shell.tsx` — composes the five zones
- `src/components/entity-canon-tab.tsx` — Z4 always-on tab body (read-only)
- `src/components/connection-rail.tsx` — Z3 (`resolveWalk()` data)
- `src/components/evidence-footer.tsx` — Z5 (audit log + generation metadata)
- `src/components/entity-frameworks-rail.tsx` — F1–F8 lens runner; logs `entity_audit_log.change_type='frame_run'`

## Rules
- **Canon tab is read-only on every detail page.** Editing is exclusively at `/settings/canon`. (Wisdom can read everywhere, edit in one place.)
- Connection rail renders only for entities with a `WalkKind` resolver — others skip Z3 cleanly.
- WorkContextStrip currently mounts only for `task` and `project`; other entities suppress Z2.
- Detail pages may pass `tabs={[…]}` — the shell auto-appends the Canon tab.
- Generation metadata (model, promptKey, generatedAt) goes through Z5, not the header.

## What it composes (already-built)
- `<CanonGuardrail>` (header chip)
- `<WorkContextStrip>` (Z2)
- `<WalkMenu>` (header pin, right side)
- `<MasterStoryTrail>` (used inside individual page tabs when needed)
