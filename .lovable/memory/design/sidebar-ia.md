---
name: sidebar-ia
description: Locked 7-group "verb-first" (Scenario A) sidebar IA. Today / Deliver / Think / SweetSync / People / Library / Settings.
type: design
---

**Scenario A — Verb-first.** Groups answer "what am I doing right now?" not "what layer is this?"

Order, exact labels, and rationale:

1. **TODAY** *(always open)* — Today · Planner · Calendar · Capture · Queue · My tasks
2. **DELIVER** *(always open)* — OCDA Cockpit · Sessions Bank · SweetCycle · Flightdeck · Engagement Plans · Pipeline · Campaigns
3. **THINK** *(always open)* — BizzyBots · **SweetScan** · Decisions · Delegation Register · Measures · Documents
4. **SWEETSYNC** *(collapsible)* — SweetSync (per client) · Missions · Journeys · Quests · Sparks · Domain Assessments
5. **PEOPLE** *(collapsible)* — Relationships · People · Operators · Projects · Tasks
6. **LIBRARY** *(collapsible)* — Workflows · Session Templates · Playbooks · Components · Personas · Outcomes · JTBD · KTIs · Vault · Domains · Tenets
7. **SETTINGS** *(collapsible)* — Prompt Console · Excellence rubric · BizzyBot prompts · Open decisions · Team & profile

**Mobile pattern:** Below `md` (768px) the desktop `<aside>` hides; the topbar exposes a hamburger that opens the same `<SidebarNav>` inside a `<Sheet>` drawer (left side). The drawer auto-closes on route change.

**Hard naming rules** (also in `mem://design/canon-vocabulary.md`):
- "Sessions" in the sidebar is **"Sessions Bank"** — disambiguates from "live session today".
- "Delegation" in the sidebar is **"Delegation Register"** — disambiguates from JTBD/Tasks.
- Library + Taxonomies are **one collapsed group** called "Library". Do not split them again.
- Decisions and Delegation live in **Think**, not Deliver.
- **SweetScan** is the outside-in intelligence surface and lives in **Think** — not Library, not Today.
