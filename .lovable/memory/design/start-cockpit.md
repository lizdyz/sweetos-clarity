---
name: /start cockpit
description: The orientation front door. Composes Decision Factory health + OCDA position + Two Paths + Sidebar glossary. Uses ONLY existing canon vocabulary. Never invents new layer names.
type: design
---

# `/start` — the front door

**Purpose.** Answers three questions in one screen, in YOUR canon vocabulary:
1. What does this app DO? → Decision Factory (4 components)
2. Where am I right now? → OCDA position (Observe→Act)
3. How does work move? → Two Paths (Session · SweetSync)

Plus an expandable **Glossary of rooms** — the verb-first sidebar groups, surfaced with their canon intent.

## What it is NOT
- Not a redesigned `/today`. `/today` is the daily decision surface (Wave 4). `/start` is for orientation.
- Not a new IA layer. The sidebar is unchanged. `/start` simply sits *above* `/today` in the TODAY group.
- Not AI-generated copy. Every label is pulled from existing `mem://` files.

## Composes (no new frameworks)
- **Decision Factory** → `mem://design/decision-factory.md` (Data · Algorithms · Experimentation · Infrastructure)
- **OCDA** → existing `<OCDACockpit>` data shape (Observe · Choose · Decide · Act)
- **Two Paths** → `mem://design/two-progression-paths.md` (Session vs SweetSync)
- **Verb-first sidebar** → `mem://design/sidebar-ia.md` (Today · Work · People · Library · Settings)

## Page order
1. Hero header — "Where do I start?" + day/date.
2. Decision Factory · health (4-tile strip — same shape as `<FactoryHealthStrip>`, with live counts).
3. OCDA position — 4-stage progress with per-stage counts.
4. Two paths — side-by-side Session path / SweetSync path explainers.
5. Glossary of rooms — accordion of the 5 sidebar groups with canon descriptions.

## Empty-state copy (Liz's voice)
> "Inbox zero — your Decision Factory is humming. Want to scan for what's coming?" → `/sweetscan`

## Sidebar mount
First item under TODAY (above `/today`). Icon: `Compass`. No regrouping.
