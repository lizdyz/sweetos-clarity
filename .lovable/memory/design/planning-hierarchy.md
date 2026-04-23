---
name: Planning hierarchy — the canonical 6-level rule
description: Mission → Journey → Quest → (JTBD · Component · Project · Decision) → Task. Never blur the levels.
type: design
---

The system uses one canonical hierarchy for planning real work. Do not invent
new entity layers; do not collapse layers; do not blur their meaning.

```text
Mission         — the long-term WHY (one per org, spans years)
  └─ Journey    — multi-quarter capability arc (2–4 active per Mission)
       └─ Quest — themed body of work that advances Components (weeks–months)
            ├─ JTBD       — what a user is hiring this for
            ├─ Component  — the reusable piece of product (L1→L5)
            ├─ Project    — time-boxed deliverable effort (days–weeks)
            │    └─ Task  — atomic unit of work, assigned to one Operator
            └─ Decision   — open architectural question OR logged choice
```

## Hard rules

1. **Sparks are system-generated only.** They appear under Quests after the
   pipeline runs. Never create a Spark by hand to plan work — create a Quest
   or a Task instead. (See `mem://design/canon-sparks-vs-tasks.md`.)
2. **A Project always rolls up to a Quest** (in spirit — the FK is optional in
   schema for legacy reasons, but new projects should declare their Quest via
   `tagged_components` overlap or be created from the Quest detail page).
3. **A Task always rolls up to a Project** (or a Quest directly for one-offs).
   Tasks must have a single Operator assignee.
4. **JTBDs and Components are NOT planning units.** They describe demand and
   supply. Plan via Quests and Projects; reference JTBDs/Components on them.
5. **Decisions block Quests.** An open Decision is a planning blocker, not a
   task. Settle it via `/decisions/open`, then unblock the Quest.

## Surfaces

- `/planning` — the seeding workspace. Walks Mission → Journey → Quest →
  Quest detail (JTBD/Component/Project/Decision) → Tasks → Operators.
- `<TodaysFocusStrip>` on `/today` surfaces the active Quest, active Project,
  and blocked Decisions so the operator never loses the higher context.
- `<EntityKindHelper>` is mounted on every create surface for these kinds. It
  shows a one-liner + 2 examples + 1 anti-example to prevent canon drift.

## Anti-patterns to reject

- "Project: Build the operator dashboard forever." → That's a Quest.
- "Task: Redesign capture." → That's a Project (or a Quest).
- "Quest: Mount SweetLensButton on /quests." → That's a Task.
- "Spark created by hand to track an idea." → Forbidden. Create a Task or Quest.
