# Phase 2.10s — Capture hint-tags, JTBD sampler, smarter sidebar naming

Three things you asked. One ranked recommendation for each, with the alternates noted so you can override.

---

## 1. Capture — optional "hint tags" expander (you suggest, AI confirms, queue approves)

**Today:** capture is pure brain-dump. AI infers everything. You can't whisper to it.

**Add:** a collapsed "**Add hints (optional)**" disclosure under the textarea. Click → expands a 4-row mini-panel:

- **Domains** — multi-pick from the 22 (typeahead chips).
- **Tenets** — filtered to your active industry.
- **Components** — typeahead from existing Components.
- **Relationship / Person** — link this capture to a client or contact.
- **Free-form keywords** — comma-separated; passed verbatim to the parser.

These travel with the proposal as `user_hints` (jsonb on `proposals`). The parser **uses them as priors, not gospel** — the AI still proposes its own tags, and the queue review screen shows your hints with a **"You suggested"** chip next to AI's chips so you see exactly where they agreed/disagreed before approving. Nothing writes until you click approve in the queue. Resonance preserved, trust layer intact.

*Tiny touch:* the disclosure is closed by default so the page stays calm when you don't care.

---

## 2. Sidebar reorg — four scenarios, one recommendation

You're right that the IA is dense. Here are four ways to cut it, with pros/cons.

### Scenario A — Verb-first ("What am I doing right now?") **← recommended**

Reframe groups by *action*, not *layer*. Tucks Library/Taxonomies behind one entry.

```
TODAY        Today · Planner · Calendar · Capture · Queue · My tasks
DELIVER      OCDA Cockpit · Sessions Bank · SweetCycle · Flightdeck
              Engagement Plans · Pipeline · Campaigns
THINK        BizzyBots · Decisions · Delegation Register
              Measures · Documents
SWEETSYNC    SweetSync (per client) · Missions · Journeys · Quests · Sparks
PEOPLE       Relationships · People · Operators · Projects · Tasks
LIBRARY ▸    (collapsed) Workflows · Session Templates · Playbooks
              Components · Personas · Outcomes · JTBD · Vault
              Domains · Tenets
SETTINGS ▸   Prompts · Excellence · BizzyBot prompts · Open decisions · Team
```

**Pros:** matches how you actually work ("I'm delivering" / "I'm thinking" / "I'm building the catalog"). Drops from 7 groups to 5 visible. Library + Taxonomies merge — one collapsible vault of definitions.
**Cons:** "Think" is fuzzier than the others; Decisions/Delegation moving out of Operate may need a beat to relearn.

### Scenario B — Noun-first, fewer groups

Keep current structure but merge: **Library + Taxonomies → "Catalog"**, **People + Operators stay**, drop Today subdivision.
**Pros:** least disruption. **Cons:** still 6 groups; Operate stays bloated (12 items).

### Scenario C — Three groups only ("DO / KNOW / TUNE")

DO = Today + Operate + SweetSync. KNOW = Library + Taxonomies + People. TUNE = Settings.
**Pros:** maximally minimal. **Cons:** DO becomes a 25-item wall.

### Scenario D — Per-relationship-first

Top of sidebar = your active relationships; everything else lives under "Workspace".
**Pros:** client-first feel. **Cons:** big rebuild; doesn't help the naming problem you raised.

**My pick: Scenario A.** Concrete moves it requires:

- **Operate → renamed "Deliver"**, trimmed to 7 items.
- **New "Think" group** holds OCDA's downstream registers (Decisions, Delegation, BizzyBots, Measures, Documents).
- **Library + Taxonomies merged** into one collapsible "Library" with a thin separator before Domains/Tenets.

---

## 3. Naming fixes you flagged

### a. "Sessions" → **"Sessions Bank"** (in the sidebar) / page title stays *"Sessions"* but the PageHeader becomes *"All Mirror, Map, Machine, and Sync sessions — past, scheduled, and templated."* Live ones stay distinguishable via the existing status chip + a new **"Today"** filter chip. Removes the "is this a live thing?" confusion without renaming the URL or table.

### b. "Delegation" → keep route, **rename label to "Delegation Register"** with subtitle *"Work to hand off — the systematize list."* This is the single move that disambiguates it from JTBD on first read.

### c. "Jobs-to-be-done" — promote to **a sampler picker**, not just a list

You nailed it — JTBD should be **selectable** from a pre-seeded library, scoped by Domain + Tenet. Build it in two parts:

- **Seed a JTBD sampler library** — ship ~80 canonical JTBD statements grouped by Domain (e.g., *People: "When I onboard a new advisor, I want to ramp them in 30 days, so I can recover billable capacity"*). Stored as `is_template = true` rows on `jobs_to_be_done`. Filterable by `related_domains` + `related_tenets`.
- `**<JTBDPicker>` component** — opens from any Persona, Component, or Relationship detail page. You browse the sampler, click to **adopt** a JTBD into that subject (creates a non-template row with `source_jtbd_id` pointing back). On `/library/jtbd` add a **"Sampler / Adopted / All"** tab strip.

Result: JTBD stops being abstract — you click from a real bank of starter statements and they instantly attach to the right Persona/Component, ready to drive lens prompts later.

---

## What this builds

**Migration**

- `proposals.user_hints jsonb` (Capture hints).
- `jobs_to_be_done.is_template boolean default false` + `source_jtbd_id uuid` self-ref.
- Seed ~80 template JTBD rows grouped across the 22 Domains (industry-agnostic first pass).

**New components**

- `src/components/capture-hints-panel.tsx` — collapsible disclosure under the textarea.
- `src/components/hint-vs-ai-diff.tsx` — small chip diff used on the proposal review screen.
- `src/components/jtbd-picker.tsx` — sampler browser + "Adopt" action.

**Edited**

- `src/components/app-sidebar.tsx` — Scenario A reorg + naming changes.
- `src/routes/_app.capture.tsx` — mount `<CaptureHintsPanel/>`; pass hints to `captureProposal`.
- `src/utils/proposals.functions.ts` — accept `user_hints` and forward to the parser.
- `supabase/functions/parse-capture/index.ts` (or current parser) — read hints as priors; never as overrides.
- Proposal review screen (in `/queue` or capture-queue-strip) — show **"You suggested"** vs **"AI suggested"** chips side-by-side.
- `src/routes/_app.library.jtbd.tsx` — Sampler / Adopted / All tabs.
- `src/routes/_app.personas.$id.tsx` + `_app.components.$id.tsx` + `_app.relationships.$id.tsx` — "+ Add JTBD" opens `<JTBDPicker>`.
- `src/routes/_app.sessions.index.tsx` (or wherever the list lives) — add "Sessions Bank" PageHeader copy + Today filter chip.
- `src/routes/_app.delegation.index.tsx` — title becomes "Delegation Register" + subtitle.

**Memory**

- `mem://design/sidebar-ia.md` — rewrite to Scenario A.
- `mem://features/jtbd.md` — add the sampler/adopted pattern.
- `mem://design/canon-vocabulary.md` — append: "Sessions Bank, not just Sessions; Delegation Register, not just Delegation."

---

## What I'm NOT doing this pass

- Per-relationship-first sidebar (Scenario D).
- Auto-generating JTBDs from Capture text (sampler-first; AI-from-text is next pass once we see what good looks like).
- Industry-specific JTBD seeds (start universal-by-Domain; add per-Tenet later).
- Renaming the `sessions` route or table.

## Suggested order

1. **Sidebar reorg + naming** (Scenario A + Sessions Bank + Delegation Register) — instant readability win, zero migration.
2. **Capture hints panel + queue diff** — gives you the "tag-as-I-drop" affordance.
3. **JTBD sampler + picker** — turns the empty list into a real first interaction.

Each ships independently. Approve and I'll start at #1.  
  
go with; 

A 