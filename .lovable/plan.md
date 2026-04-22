

# Phase 2.10w — Seed the full Library: Journeys, Quests, Missions, Sessions Templates, Playbooks, Workflows, Personas, JTBDs, Outcomes

You said "I wanted you to bring components, journeys, quests, mission etc." — meaning the previous seed only filled Components. The whole Library layer should be populated with solid, client-ready ideas that map to the SweetBOS platform we just seeded. Otherwise `/journeys`, `/quests`, `/missions`, `/session-templates`, `/playbooks`, `/library/jtbd`, `/personas`, `/outcomes` are all dead lists.

This pass seeds **all of them** with cohesive content anchored to the 10 SweetBOS Components and the canonical 5 Ps / 5 Ls.

---

## What gets seeded (all idempotent — `ON CONFLICT (name) DO NOTHING`)

### Journeys (long-arc transformations) — **5 records**
The five canonical advisor transformations:
1. **Solo → Systematized Practice** — L2 → L4 across People + Process
2. **Generalist → Niche Authority** — Strategy + Marketing maturity
3. **Founder-led → Team-led Delivery** — delegation + operators
4. **Service Business → Productized IP** — Product + Profit maturity
5. **Practice → Sellable Asset** — succession-ready, multi-year arc

Each: name · description · target_maturity · expected_duration · related_components (joined to seeded Components) · related_domains.

### Quests (SweetSync working questions) — **8 records**
Cross-cutting "what are we actually trying to figure out" prompts:
- *"What is my one-sentence positioning?"*
- *"Which 3 client types deserve a dedicated offer?"*
- *"What does a perfect first-90-days look like?"*
- *"What's the smallest viable Portal experience?"*
- *"Which decisions am I the only one who can make?"*
- *"What rituals would make my week un-skippable?"*
- *"What proof do I need to charge 2x?"*
- *"What would I keep if I had to delete 80% of my offerings?"*

Each: prompt · scope (`org`) · framing · expected output kind.

### Missions (focused 30–90 day campaigns) — **6 records**
Outcome-bound execution arcs:
1. **Q1 Niche Lock** — pick + commit
2. **Portal MVP Launch** — first 3 client portals live
3. **Onboarding Automation** — 50% time reduction
4. **Recurring Revenue Engine** — first 5 subscriptions
5. **Team Hire #1** — operator onboarded
6. **Annual Retreat Prep** — IP consolidation

Each: name · objective · target_date · success_criteria · related_components.

### Session Templates (canonical session types) — **9 records**
The Mirror / Map / Machine / SweetSync catalog:
- **Mirror — 5 P Audit** (90 min)
- **Mirror — Annual Reflection** (120 min)
- **Map — Niche Discovery** (90 min)
- **Map — Service Architecture** (90 min)
- **Map — Portal Wireframe** (60 min)
- **Machine — Workflow Build** (120 min)
- **Machine — Component Build** (90 min)
- **SweetSync — Spark Triage** (45 min)
- **SweetSync — Quest Working Session** (60 min)

Each: name · service_type · default_duration · pre_work · session_purpose · default_outputs.

### Playbooks (repeatable methodologies) — **5 records**
1. **The 5 P Audit Playbook** — full Mirror methodology
2. **The Niche Lock Playbook** — discovery → commitment in 4 sessions
3. **The Portal Build Playbook** — wireframe → live in 6 weeks
4. **The Onboarding Automation Playbook** — manual → workflow in 3 sprints
5. **The Subscription Conversion Playbook** — one-off → recurring

Each: name · summary · stages (JSON) · related_components · related_session_templates.

### JTBDs (Jobs To Be Done — canonical advisor jobs) — **8 records**
Functional/emotional/social jobs advisors hire SweetBOS for:
- *"Help me see my whole business clearly"*
- *"Help me stop reinventing the wheel for each client"*
- *"Help me sell my expertise without selling my time"*
- *"Help me prove my value in concrete deliverables"*
- *"Help me delegate without losing quality"*
- *"Help me decide what to say no to"*
- *"Help me make this practice sellable"*
- *"Help me work fewer hours without earning less"*

Each: job_statement · job_type · trigger · current_solution · success_definition.

### Personas (canonical advisor segments) — **6 records**
Anchored to the seeded `PERSONA_SECTOR` enum:
1. **Solo Wealth Advisor — Generalist** (IIROC, $50–150M AUM)
2. **Wealth Advisor — Niche Specialist** (post-niche, $150M+)
3. **Insurance Advisor — Estate Focus** (multi-rep team)
4. **Multi-Discipline Family Office Lead**
5. **Tech Consultant — Solo Operator** (independent strategist)
6. **Accounting Practice Owner — Succession Stage**

Each with sector · structure · autonomy · registration · primary_jtbd_ids · pain_signals.

### Outcomes (measurable wins) — **8 records**
Anchored to `OUTCOME_TYPE` enum:
- *"10 hrs/week reclaimed via automation"* (Time Saved)
- *"Recurring revenue ≥ 30% of total"* (Revenue Increased)
- *"NPS ≥ 70 from active clients"* (Satisfaction Improved)
- *"Onboarding time cut from 4h → 1h"* (Efficiency Gained)
- *"Tech stack cost down 40%"* (Cost Reduced)
- *"Portal adoption ≥ 80% of clients"* (Quality Improved)
- *"First operator hire successful at 90 days"* (Efficiency Gained)
- *"Practice valuation methodology established"* (Revenue Increased)

Each: name · outcome_type · target_metric · how_we_know · related_components.

---

## How everything links

The seed isn't 8 disconnected lists — entries cross-reference using the IDs of records seeded earlier in the same migration (CTEs):

- Each **Journey** references the **Components** + **Outcomes** that mark its completion.
- Each **Mission** references the **Components** it builds + the **Outcomes** it targets.
- Each **Playbook** references the **Session Templates** it sequences + **Components** it produces.
- Each **Persona** references the **JTBDs** it hires us for.
- Each **JTBD** references the **Outcomes** that satisfy it.

Result: clicking any seeded Journey on `/journeys/$id` will show real component anchors, outcome targets, and recommended playbooks — not stubs.

---

## What this builds

**One migration file.**
`supabase/migrations/<timestamp>_seed_sweetbos_library.sql` — ~55 inserts across 8 tables, all `ON CONFLICT (name|prompt|job_statement) DO NOTHING`, using CTEs to wire cross-references using freshly-inserted IDs.

**No code changes.** Index pages and detail routes for all 8 entity types already exist; they'll just suddenly have content.

---

## What I'll verify first (before writing the migration)

1. The actual columns + required fields on each table (`journeys`, `quests`, `missions`, `session_templates`, `playbooks`, `jtbds`, `personas`, `outcomes`) so every insert hits the schema cleanly.
2. Existing rows so duplicates are skipped.
3. Whether any of these tables have NOT NULL `created_by` / `owner_id` columns — I'll attribute to the same platform owner ID used in the Components seed (`65f0dbf1-...`).
4. RLS — confirm seed inserts succeed under the migration role.

If any table has a column shape that doesn't fit my plan, I'll adjust the field mapping for that table before inserting (no schema changes — pure data).

---

## What this is NOT

- Not seeding **Operators** (humans/agents/workflows) — needs your input on real names.
- Not seeding **Relationships** or **Engagement Plans** — these are per-client, not library.
- Not seeding **Domains / Tenets** — those already exist as canonical taxonomies.
- Not finishing 2.10v Steps 4–5 (Blockers/Wins routes, Ready-to-advance badges) — resumes after.
- Not modifying the 8 pre-existing components from your earlier work.

---

## Why now

You just populated 10 Components. Without Journeys/Missions/Playbooks/Templates pointing at those Components, the build-pipeline view `/components/$id` shows "0 active projects, 0 active tasks, 0 sessions" forever. Seeding the surrounding Library makes the **Components page light up** retroactively, and gives every relationship a real catalog to assign work from.

This is also the cheapest pass possible — one migration, no code, no AI cost, idempotent re-runs.

## Suggested order

1. **This pass** — seed all 8 Library tables in one migration.
2. **Resume 2.10v Step 4** — `/think/blockers` + `/think/wins` routes + sidebar entries.
3. **2.10v Step 5** — Engagement-plan rollups, subscription card on rollup, Ready-to-advance badges.

Approve and I run the verification queries + migration in a single pass.

