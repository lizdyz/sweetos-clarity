---
name: sidebar-ia
description: Locked verb-first sidebar IA — 3 always-open + 2 collapsed groups. Today / Work / People + Library / Settings. 5 Ps stay as a framework overlay, not a shelf.
type: design
---

**Verb-first.** Groups answer "what am I doing right now?" not "what layer is this?"

## The IA — order, exact labels, rationale

1. **TODAY** *(always open)* — Today · Calendar · Capture
2. **WORK** *(always open)* — Sandbox · OCDA Cockpit · Flightdeck · Sessions Bank · SweetScan · Engagement Plans · Campaigns · Decisions · Delegation Register · Measures
3. **PEOPLE** *(always open)* — **Operators (first)** · Relationships · People · Projects · Tasks · Missions · Journeys · Quests · Sparks
4. **LIBRARY** *(collapsed)* — BizzyBots · Workflows · Session Templates · Playbooks · Components · Personas · Outcomes · JTBD · KTIs · Documents · Domain Assessments · Vault · Domains · Tenets
5. **SETTINGS** *(collapsed)* — Entity Canon · Lens Canon · Prompt Console · Spark Library · Excellence rubric · BizzyBot prompts · Open decisions · UX Audit · Team & profile

## Hard naming rules

- **Operators is the first item under PEOPLE** — humans + workflows + AI agents all live there. As the team grows, this is where you see "who's doing what."
- "Sessions" in the sidebar is **"Sessions Bank"** — disambiguates from "live session today".
- "Delegation" in the sidebar is **"Delegation Register"** — disambiguates from JTBD/Tasks.
- **SweetScan** is the outside-in intelligence surface — lives in **Work**.
- **Sandbox** is the triage table — lives in **Work** (top), not Think, not Library.
- **OCDA Cockpit** stays as its own page (renamed "Decision Factory" framing inside the page itself).

## Captions (shown under each group label)

- **TODAY** = "Live working surface"
- **WORK** = "Run the work · triage · decide"
- **PEOPLE** = "Operators, relationships, projects"

Per-item captions clarify the easily-confused ones:

- **Capture** = "In — drop multi-node thoughts; auto-pollinates entities, save ideas to Sandbox"
- **Sandbox** = "Frame & route — triage raw ideas, run framework lenses, promote to work"
- **Operators** = "Who does the work — humans · workflows · AI agents"
- **Relationships** = "Clients & key relationships (the orgs you work with)"
- **People** = "Contacts within those relationships"

## What is NOT in the sidebar

- **No mode switcher.** Skipped intentionally — overkill at <3 operators. Re-evaluate when team grows.
- **No 5 Ps as a shelf.** The 5 Ps (Purpose · People · Process · Product · Profit) are a *diagnostic lens*, not a navigation taxonomy.
- **SweetCycle is a *view*, not a destination.** It only makes sense for an active Engagement Plan, so it lives as a tab on `/engagement-plans/$id`. The cross-relationship `/sweetcycle` page is reachable via the "View all SweetCycles →" link on the Engagement Plans index — kept out of the sidebar to avoid implying it's a peer destination.
- **`/pipeline` is not in the sidebar.** It's a Wave-2A redirect to `/flightdeck`; the route file stays alive for old bookmarks but the nav entry was removed. (`pipeline_stage` as a column on relationships is unrelated and stays.)
- **Redirect-only stubs (`/my-tasks`, `/queue`, `/planner`) never appear** in the sidebar.

## Topbar

- **⌘K command palette** — searches relationships, operators, tasks, projects, components, sparks, quests, plus every sidebar destination. The single feature that pays back daily.
- Bot alerts bell (existing).
- Theme toggle + profile menu (existing).
- **Not building** (yet): entity crumb trail, quick-capture button, mode indicator. Will revisit when there's evidence they pay back.

## Mobile

Below `md` (768px) the desktop `<aside>` hides; the topbar exposes a hamburger that opens the same `<SidebarNav>` inside a `<Sheet>` drawer (left side). The drawer auto-closes on route change.
