# Wave 10 — IA cleanup: nest SweetCycle under Engagement Plans + retire ghost routes

You spotted two real issues. Both are symptoms of the same drift: routes listed in the sidebar that either duplicate other surfaces or only exist as legacy redirects. Here's the cleanup, plus the rest of what I found while looking.

## What you flagged

### 1. SweetCycle belongs under Engagement Plans

You're right. SweetCycle is **the rhythm of an active engagement** — Seed → Synthesize → Session → Sync → Ship. It's only meaningful when:

- a Relationship has an **Engagement Plan**, and
- that plan has **Services** that consume sessions.

Today SweetCycle sits as a peer in the WORK group, which makes it look like a separate destination. It should be a **view inside Engagement Plans** (and reachable from a Relationship detail too).

**Move:**

- Keep the `/sweetcycle` route alive (deep links work) but **remove it from the sidebar**.
- Add a **"SweetCycle"** tab to `/engagement-plans/$id` showing that plan's sessions on the 5-phase board (filtered by `relationship_id` + plan's services).
- Add a top-level **"View all SweetCycles"** link inside the Engagement Plans index header that opens `/sweetcycle` (multi-rel board) — for the "show me every active client's rhythm at once" use case.
- Update `mem://design/sidebar-ia.md` to reflect: SweetCycle is a *view*, not a sidebar destination.

### 2. `/pipeline` is dead weight

`/pipeline` is a 7-line redirect to `/flightdeck` (Wave 2A retirement). It still shows in the WORK sidebar group with a `GitBranch` icon, which is misleading — clicking it just teleports you.

**Remove:** Delete the `/pipeline` sidebar entry. Keep the redirect file so old bookmarks/links don't 404.

(The "pipeline" word is fine elsewhere — `pipeline_stage` is a real column on relationships, used by the funnel filter on `/relationships`. That stays.)

## Other ghost/duplicate routes I found while looking


| Route                      | Status                                                                                                      | Recommendation                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/my-tasks`                | Redirect-only stub                                                                                          | Remove from any nav (already not in sidebar — confirm)                                                                                                                            |
| `/queue`                   | Redirect-only stub                                                                                          | Same                                                                                                                                                                              |
| `/planner`                 | Redirect-only stub                                                                                          | Same                                                                                                                                                                              |
| `/sweetsync`               | Live page but not in sidebar; SweetSync entities are now reachable as tabs on `/relationships/$id` (Wave 9) | Keep as a **catch-all hub** OR retire. Recommend: **retire as a sidebar concept**, keep the route as a deep-link landing that lists relationships with active SweetSync activity. |
| `/portals/$relationshipId` | Public-facing client portal                                                                                 | Keep, no sidebar (correct)                                                                                                                                                        |
| `/p/$slug/seed`            | Public seed page                                                                                            | Keep, no sidebar (correct)                                                                                                                                                        |


## Other cleanup wins worth bundling

While I had the sidebar open:

- **"Sandbox" + "Capture" overlap.** Capture is the inbox ( this is where you can share multi node thought drops to pollinate many different entities in the system, ex this replace filling in a note in a crm or creating a task as it does it all from what you drop in, and then allows you to decide to save some as ideas to further explore in sandbox ; Sandbox is the triage table. After Wave 7 they share `<TriageCard>`. Add a one-line caption on each so the difference is obvious: Capture = "in", Sandbox = "frame & route".
- **"Sessions Bank" naming.** Currently labeled "Sessions Bank" in IA canon but the route is `/sessions`. Confirm the label stays "Sessions Bank" (per canon) — verified, no change.
- **"People" vs "Operators" vs "Relationships"** — three entities in the PEOPLE group, easy to confuse. Add one-line captions:
  - Operators = *who does work* (humans · workflows · agents)
  - Relationships = *clients & key relationships*
  - People = *contacts within those relationships*

## Files

**Edited:**

- `src/components/sidebar-nav.tsx` — remove `/pipeline` and `/sweetcycle` entries from WORK group; add captions to Capture / Sandbox / Operators / Relationships / People
- `src/routes/_app.engagement-plans.$id.tsx` — add tabs: **Anatomy** (current content) + **SweetCycle** (the 5-phase board scoped to this plan's sessions) + **Audit** (existing audit panel)
- `src/routes/_app.engagement-plans.index.tsx` — add a "View all SweetCycles →" link in the header that goes to `/sweetcycle` (multi-rel)
- `src/routes/_app.sweetcycle.tsx` — add a small banner: "SweetCycle is the rhythm of active engagements. Pick a plan to drill in, or [browse Engagement Plans →]"
- `mem://design/sidebar-ia.md` — update WORK group list (remove SweetCycle + Pipeline); add note "SweetCycle is a view, not a destination"

**New:**

- (none — pure consolidation)

**Not deleted:** `/pipeline`, `/my-tasks`, `/queue`, `/planner`, `/sweetcycle` route files all stay so old links keep redirecting cleanly.

## Sequencing

1. Sidebar cleanup — remove `/pipeline` + `/sweetcycle`, add captions (~20%)
2. Engagement Plan detail gets SweetCycle tab (~50%)
3. Engagement Plans index gets "View all SweetCycles" link + SweetCycle page banner (~15%)
4. Memory canon update (~15%)

## Not in this wave

- No route file deletions
- No sidebar regroup (locked at 5 groups)
- No new entities or migrations
- No edits to auto-generated files

Reply **"Run Wave 10"** to ship in this order, or **"Just the SweetCycle nesting first"** to land the conceptual fix before the smaller cleanups.