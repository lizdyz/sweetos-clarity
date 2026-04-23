---
name: Page contract — what · why · do · connects · next
description: Every page must declare its purpose, what the user can do, what it connects to, and what the next steps are. Enforced via PageHeader props (purpose, whatYouCanDo, connectsTo, nextSteps). Pages missing these props are visibly incomplete.
type: design
---

**Rule:** Every page declares its operational contract via `<PageHeader>`.

## Required props
- `title` — short noun
- `purpose` — one sentence: "what this is and why it exists"
- `whatYouCanDo` — 2–4 verb-led bullets the user can act on right now
- `connectsTo` — chips linking to upstream/downstream surfaces (with `to` routes)
- `nextSteps` — verb-led counts/actions for the user's next move ("Triage 3", "Promote 2", "Archive 1")

## Why
- A page that can't fill these props doesn't yet have a clear operational reason to exist.
- The framing forces every page to declare its connections, killing orphans.
- "Next steps" turns a passive view into an active queue.

## Visual layout
```
icon  Title                                              [actions]
      One-sentence purpose.
      What you can do · here · here · here
      Connects to: Capture · Decisions · OCDA
      Next: Triage 3 · Promote 2 · Archive 1
```

## Banned
- Pages with only `title` + `purpose` and no `connectsTo` or `nextSteps` (visibly empty contract is the signal to fix them).
- Headers that duplicate page title in the body.
