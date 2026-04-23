

# Planning that lets you think — not just fill forms

You're right. The 6-step stepper at `/planning` is good for **seeding the canon** (Mission → Journey → Quest → …) but it forces a top-down march. What you actually want right now is a **thinking surface** — a place to wrestle with cash flow, service language, what to track, what to decide — *before* it has to fit into a Quest or Project.

We already have most of the raw material in the system. We just haven't given you a room to think in.

## The shift

Keep `/planning` (the stepper) as it is — it's the right tool when you know the shape. Add a second mode beside it: a **Thinking Room** that's free-form, durable, and converts into canonical objects only when *you* decide it's ready.

```text
/planning
   ├─ Seed       ← the existing 6-step stepper (top-down, structured)
   └─ Think      ← NEW — free-form workbench (bottom-up, exploratory)
```

## What the Thinking Room is

A single page (`/planning/think`) organized as **Topics**. A Topic is just a named thinking space — e.g. "Cash flow", "Service offering language", "What to track", "Pricing model". Each Topic holds:

- **A canvas** — long-form prose. Write, paste, draft. No structure imposed.
- **Loose notes** — quick bullets you jot as ideas land (each note is one row, draggable, taggable).
- **Open questions** — things you haven't decided. One-liner each.
- **Candidates** — proto-objects you *might* turn into Quests, Projects, JTBDs, Decisions, Components, KPIs. Each candidate has a kind chip (`?Quest` `?Project` `?Decision` `?KPI`) and a "Promote" button that opens the right create-sheet pre-filled.
- **Linked objects** — anything already in the system that's relevant (existing Quests, Decisions, Components). Searchable, attachable.

Topics can be **pinned to a Journey** (optional) so later you can see "all my thinking that fed Journey X." Unpinned topics float.

## Three starter Topics we'll seed for you

So the room isn't empty on first open:

1. **Cash flow** — prompts: "What revenue do we need by when? What can we sell now? What are the constraints?"
2. **Service offering language** — prompts: "What do we call each service? Who's it for? What outcome?"
3. **What to track** — prompts: "What KPIs would tell us we're winning? What leading indicators?"

Each starter Topic comes with a few **prompt cards** (collapsed questions you can answer or ignore) so the page guides without boxing.

## The promotion flow (this is the key bit)

Thinking → canon, on your terms:

```text
You write a candidate:        "Define 'Mirror Sprint' as the entry service"
You tag it:                   ?Component  +  ?Decision (price?)
You hit "Promote":            opens Component create-sheet pre-filled
                              + opens Decision create-sheet for the open question
The candidate stays linked    so the Topic shows "→ promoted to Component #123"
```

Nothing is auto-promoted. The Thinking Room is durable scratch; promotion is deliberate. That's how you avoid the "everything is a Project" canon-drift problem and still get to think freely.

## What we'll build

**New**
- `src/routes/_app.planning.think.tsx` — the Thinking Room (Topics list on the left, active Topic on the right).
- `src/components/planning/topic-canvas.tsx` — long-form editor (textarea-with-autosave, no fancy WYSIWYG for v1).
- `src/components/planning/topic-notes.tsx` — quick-bullet list with inline add, drag-reorder, optional tag chips.
- `src/components/planning/topic-questions.tsx` — open-question list; each row has "→ Decision" promote button.
- `src/components/planning/topic-candidates.tsx` — candidate proto-objects with kind chip + Promote dropdown (Quest / Project / JTBD / Decision / Component / KPI).
- `src/components/planning/topic-linked.tsx` — search + attach existing canonical objects.
- `src/components/planning/topic-prompt-card.tsx` — collapsible prompt cards used by the seeded starter Topics.

**Edited (light)**
- `src/routes/_app.planning.tsx` — add a top toggle: **Seed | Think** so both modes live under one route.
- `src/components/sidebar-nav.tsx` — keep the Planning entry; update hint to *"Think · Seed · Decide"*.
- The existing create-sheets (Quest, Project, Decision, Component, JTBD) — accept an optional `prefill` prop so promotion lands clean.

**Database (one small migration, additive only)**
Two new tables, nothing existing changes:

- `thinking_topics` — `id, title, description, journey_id (nullable), pinned, created_at, updated_at`
- `thinking_items` — `id, topic_id, kind ('canvas' | 'note' | 'question' | 'candidate' | 'linked'), body, candidate_kind (nullable: 'quest'|'project'|'decision'|'component'|'jtbd'|'kpi'), promoted_to_kind (nullable), promoted_to_id (nullable), position, created_at, updated_at`

RLS: standard owner pattern matching the rest of the workspace. No view changes. No touching existing tables.

## What this does NOT do

- Doesn't replace the stepper — that stays for when you know the shape.
- Doesn't auto-create Quests/Projects from your notes. Promotion is always explicit.
- Doesn't try to be Notion or Roam. One canvas + lists, that's it. The value is the **promotion bridge to canon**, not the editor.
- No AI generation in v1 — pure thinking surface. (We can add a "Suggest candidates from this canvas" button in a later wave once you've used it.)

## Sequencing

1. Migration for `thinking_topics` + `thinking_items` + RLS (~10%)
2. Thinking Room route + Topic list/detail shell (~25%)
3. Canvas + Notes + Questions components (~25%)
4. Candidates + Promote bridges to existing create-sheets (~25%)
5. Linked-objects search/attach + 3 seeded starter Topics (~10%)
6. Seed/Think toggle on `/planning` + sidebar hint update (~5%)

After this you can sit down with your dev, open **Cash flow**, write freely, jot questions, mark candidates, and only push to canonical Quests/Decisions when you're actually ready.

