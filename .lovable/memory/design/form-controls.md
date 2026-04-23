---
name: Form-control canon
description: Hard rule for which control to use given cardinality + selection semantics. Stops the ad-hoc drift between dropdowns, multi-selects, chips, toggles, comboboxes.
type: design
---

**One question, one control.** Pick by **cardinality** (how many options) and **selection** (single vs multi vs always-visible).

| Cardinality | Selection | Use | Component | Example |
|---|---|---|---|---|
| 2–4 | one | **Toggle group / Segmented** | `<ToggleGroup type="single">` | View density · Component kind toggle |
| 5–20 | one | **Dropdown (Select)** | `<Select>` | Status · Owner (small) · Stage |
| 20+ searchable | one | **Combobox** | `<Command>` in `<Popover>` | Relationship · Operator · Persona |
| 5–20 | many | **Multi-select dropdown** | `<Popover>` + checkbox list | Domains on a Spark · Tenets picker |
| 20+ searchable | many | **Tag picker / Combobox-multi** | `<TagPicker>` (existing) | Tags · Components on a Task |
| Small fixed set, always visible | many | **Chip group / Toggle multi** | `<ToggleGroup type="multiple">` | 5P filter · Lens (F1–F8) filter · State filter |
| Boolean (settings) | — | **Switch** | `<Switch>` | Auto-confirm |
| Boolean (forms) | — | **Checkbox** | `<Checkbox>` | "Include archived" |
| Free text constrained | one | **Combobox with allow-create** | `<Command>` + create item | New tag · New skill |
| Date | one | `<Calendar>` in popover | `<Popover>` | Due · Scheduled |
| Range | one | `<Slider>` | `<Slider>` | Confidence threshold |

## Filter bars (`<UniversalFilterBar>`)
- **Small enums (5P, Lens F1–F8, State)** → multi-select chip groups, always visible.
- **Large sets (Domain, Tenet, Owner)** → searchable dropdown trigger that opens a `<Command>` combobox.
- Every filter bar carries a **Clear (n)** button when any filter is active.

## TriageCard promote
- The six promote verbs are always **one dropdown menu**, never six side-by-side buttons. Keeps card height predictable.

## Anti-patterns (do not ship)
- Native `<select multiple>` — never. Always a popover-checkbox list or chip group.
- Radio buttons for >4 options — promote to Dropdown.
- Dropdown for booleans — promote to Switch/Checkbox.
- Six-button row for promote actions — collapse to one dropdown.
