

# Wave 8 (continued) — Finish the rollout + form-control canon

Picking up where the last batch stopped. Two things to land: (1) the unfinished Wave-7/8 mounts, (2) a written rule for when to use dropdown vs multi-select vs chips vs toggle so the UI stops drifting.

## Part 1 — Finish the mounts

| Surface | Mount | Replaces |
|---|---|---|
| `/sweetscan` | `<TriageCard>` for inbound signals via `inboundSignalToTriageable` | `<InboundSignalCard>` |
| `/sparks` index | `<TriageCard>` via `sparkToTriageable` | bespoke spark cards |
| `/decisions` index | `<TriageCard>` via `decisionToTriageable` (state='proposed' only) | bespoke decision rows |
| `/operate/ocda` Observe lane | `<TriageCard>` rows | bespoke observe cards |
| `/decisions/$id` · `/sparks/$id` | `<EntityFrameworksRail>` in right rail | (additive) |
| ~12 detail routes | wrap content in `<EntityShell>` — tasks, projects, components, sessions, workflows, quests, sparks, decisions, relationships, missions, journeys, playbooks | (one-line wraps) |
| `/start/ship-status` | new route + `<ShipStatusBoard>` (live route/table/view tally) | new |
| `/relationships/$id` | additive SweetSync tabs (Missions · Journeys · Quests · Sparks · Mirror) | (additive) |

## Part 2 — Form-control canon (`mem://design/form-controls.md`)

The drift you're feeling is that we pick controls ad-hoc. Lock the rule:

| Cardinality | Use | Component | Example |
|---|---|---|---|
| 1 of 2–4 mutually exclusive | **Toggle group / Segmented** | `<ToggleGroup type="single">` | View density · Component kind |
| 1 of 5–20 | **Dropdown (Select)** | `<Select>` | Owner · Status · Lens (F1–F8) |
| 1 of 20+ searchable | **Combobox** | `<Command>` in `<Popover>` | Relationship · Operator · Persona |
| Many of 5–20 | **Multi-select dropdown** | `<Popover>` + checkbox list | Domains on a Spark · Tenets on a Tenet picker |
| Many of 20+ searchable | **Tag picker / Combobox-multi** | `<TagPicker>` (already exists) | Tags · Components on a Task |
| Many of small fixed set, always visible | **Chip group / Toggle multi** | `<ToggleGroup type="multiple">` | 5P filter · Lens filter |
| Boolean | **Switch** (settings) or **Checkbox** (forms) | `<Switch>` / `<Checkbox>` | Auto-confirm · Include archived |
| Free text constrained | **Combobox with allow-create** | `<Command>` + create item | New tag · New skill |
| Date | `<Calendar>` in popover | `<Popover>` | Due · Scheduled |
| Range | `<Slider>` | `<Slider>` | Confidence threshold |

**Filter bars specifically** (this is where it matters most for you right now): always **multi-select chips** for small enums (5P, Lens, State) and **searchable dropdown** for large sets (Domain, Tenet, Owner). `<UniversalFilterBar>` will be refactored to follow this rule so every list filters identically.

**Promote actions** (the six verbs on TriageCard): always **dropdown menu** triggered by one button, never six buttons in a row. Keeps card height predictable.

## Files

**New:**
- `src/components/start/ship-status-board.tsx`
- `src/routes/_app.start.ship-status.tsx`
- `src/components/relationship-sweetsync-tabs.tsx`
- `mem://design/form-controls.md`
- `mem://design/universal-entity-shell.md`

**Edited (mounts only):**
- `src/routes/_app.sweetscan.tsx` · `_app.sparks.index.tsx` · `_app.decisions.index.tsx` · `_app.operate.ocda.tsx` — TriageCard rollout
- `src/routes/_app.decisions.$id.tsx` · `_app.sparks.$id.tsx` — FrameworksRail
- ~12 detail routes — wrap in `<EntityShell>`
- `src/routes/_app.relationships.$id.tsx` — sweetsync tabs
- `src/components/universal-filter-bar.tsx` — refactor to honor the form-control canon (chips for small enums, combobox for large)

## Sequencing

1. Form-control canon memory + UniversalFilterBar refactor (~15%)
2. TriageCard rollout to 4 surfaces (~25%)
3. EntityShell wraps on 12 routes (~30%)
4. FrameworksRail on Decision/Spark detail (~10%)
5. `/start/ship-status` page (~10%)
6. Relationship SweetSync tabs (~10%)

## Not in this wave

- No sidebar regroup (locked)
- No route deletions (Wave 9)
- No new entities or migrations
- No edits to auto-generated files

Reply **"Run Wave 8 finish"** to ship in this order, or name a subset (e.g. *"Form-control canon + filter bar refactor first"*).

