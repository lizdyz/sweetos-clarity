

# Refine the Think view — make it feel like a room you actually want to think in

The Think view exists and works (canvas + notes + questions + candidates + linked), but right now it's a vertical stack that feels like a form. For a thinking surface it needs **focus, breathing room, and clear modes** — the canvas should dominate when you're writing, side-rails should be there when you need them but not shout.

## What changes

### 1. Layout: a proper 3-pane workbench
```text
┌────────┬──────────────────────────┬──────────┐
│ Topics │ CANVAS (dominant)        │ Side     │
│ rail   │ — prompts collapsed top  │ rail     │
│ 240px  │ — large prose surface    │ 300px    │
│        │ — word count + saved     │ tabs:    │
│        │                          │ Notes ·  │
│        │                          │ Questions│
│        │                          │ Candidates│
│        │                          │ Linked   │
└────────┴──────────────────────────┴──────────┘
```
- Canvas grows to fill height (`min-h-[60vh]`), feels like the room.
- Side rail uses a tabs control so Notes / Questions / Candidates / Linked don't all fight for vertical space — pick one at a time.
- Topics rail unchanged in shape, slightly tightened.

### 2. Topic header upgrades
- Inline-editable **title** + **description** (click to edit, blur to save).
- **Pin** + **delete** stay top-right but become icon-only with tooltips.
- Add **journey link picker** (optional select of an existing Journey) — finally wires the `journey_id` column we already migrated for.
- Tiny **last-saved** timestamp under the title.

### 3. Canvas focus mode
- "Focus" toggle button → hides the side rail and topics rail, canvas centers at `max-w-3xl`. Press again or `Esc` to exit.
- Live **word count** + saved indicator in the corner.
- Bigger, more comfortable typography (leading-relaxed, slightly larger text).

### 4. Prompts move into a single collapsible strip
Right now seeded starter prompts render as 3 stacked cards above the canvas — heavy. Combine into one collapsible "Prompts" strip that shows count (`Prompts · 3`) and expands inline. Cleaner first impression.

### 5. Side-rail tabs (the key UX shift)
Replace the current "two-column grid + stacked sections" with a **Tabs** control:
- **Notes** (default) — quick bullets, same component
- **Questions** — open questions with promote-to-Decision
- **Candidates** — proto-objects with promote dropdown
- **Linked** — attached canonical objects

Each tab shows a count badge (e.g. "Notes 4"). Vertical scroll inside the rail, never the whole page.

### 6. Empty state for new topics
When a topic has zero items: show a soft inline hint inside the canvas placeholder ("Start anywhere — paste a draft, jot a sentence, list constraints"). Today the canvas just shows a generic placeholder.

### 7. Topics rail polish
- Group **Pinned** at the top with a tiny "Pinned" subheader, then **Recent**.
- Show a tiny dot if a topic has unpromoted candidates (signals "something to action here").
- Hover row reveals quick pin/unpin toggle.

## What we'll build

**New**
- `src/components/planning/topic-side-rail.tsx` — tabs wrapper around Notes / Questions / Candidates / Linked with count badges.
- `src/components/planning/topic-header.tsx` — inline-editable title/description + journey picker + pin/delete + saved timestamp.
- `src/components/planning/topic-prompts-strip.tsx` — single collapsible replacing the stack of prompt cards.
- `src/components/planning/topic-focus-shell.tsx` — focus-mode container with `Esc` handler and centered canvas.

**Edited**
- `src/routes/_app.planning.think.tsx` — adopt 3-pane layout, group Pinned/Recent, mount new components, wire focus toggle.
- `src/components/planning/topic-canvas.tsx` — add word count, larger leading, smarter empty placeholder, expose `onWordCountChange` for the header.
- `src/lib/use-thinking.ts` — add a tiny `useThinkingItemCounts(topicId)` helper for the tab badges (single query, grouped client-side).

**No DB changes.** Everything reads/writes existing `thinking_topics` + `thinking_items` (including the already-present `journey_id` column).

## What we're explicitly not doing

- No AI "suggest candidates from canvas" yet — that stays in the Tier-3 backlog.
- No rich-text / markdown rendering — plain textarea remains v1 (focus is on UX, not editor tech).
- No drag-reorder of topics — pinned vs recent grouping is enough for now.
- No realtime collaboration.

## Sequencing

1. New components scaffolded (header, prompts strip, side rail, focus shell) (~30%)
2. Route refactored to 3-pane + focus toggle + Pinned/Recent grouping (~35%)
3. Canvas upgrades (word count, typography, smarter empty state) (~15%)
4. Journey picker + last-saved timestamp + tab count badges (~15%)
5. Polish pass: tooltips, hover states, keyboard `Esc` for focus exit (~5%)

After this the Think view feels like a deliberate thinking room — canvas-first, side tools tucked away, focus mode for deep work — not a stacked form.

