

# Phase 2.10x — Replace bad Journey seed · Add canonical Components per Journey · Wire the Angela relationship + Session 1 SweetCycle as a real example

You're right — the Journeys I seeded were generic transformations, not the **12 canonical SweetBOS journeys** you'd actually use with clients. And the sample data has no real client to demonstrate the system on. This pass fixes both, plus seeds the canonical Components-per-Journey list and the Session 1 Interview-Map session as a worked example.

---

## What I got wrong (and will undo)

The 5 "transformation arcs" I seeded last pass (Solo→Systematized, Generalist→Niche, etc.) are **maturity narratives**, not Journeys. Your real Journeys are the **12 universal practice domains** every advisor business has to operate in. I'll delete the 5 wrong rows and replace them.

---

## What I will seed

### A. The 12 canonical Journeys (replacing the 5 wrong ones)

Exactly the list from your spreadsheet:

1. Strategic Vision & Positioning
2. Client Acquisition
3. Service Design
4. Team Development
5. Technology Integration
6. Financial Planning (Business)
7. Client Service Delivery
8. Operations Management
9. Compliance & Risk
10. Time Management
11. Knowledge Management
12. Performance Tracking

Each gets: name · description · related_domains (mapped to the canonical 5 Ps) · expected_duration · target_maturity (`L4 Leveraging`) · `created_by` = platform owner.

### B. The 72 canonical Components (6 per Journey)

Every Component listed in the spreadsheet seeded into `public.components` with:
- `name` (e.g. "Mission statement", "Lead generation")
- `description` — one-line plain-English purpose I'll write per component
- `related_domains` — mapped to 5 Ps based on the journey it belongs to
- `current_maturity_level` = `L1 Lacking` (default for unbuilt components)
- `quality_status` = `Approved`
- A new column-or-link tying the Component back to its Journey

  **Tying mechanism:** I'll check if `journeys` already has a `related_component_ids[]` array (likely, given prior schema). If yes, I'll backfill the array with the freshly-seeded Component IDs. If no, I'll add `journey_id uuid` to `components` (nullable, FK to `journeys.id`) in a tiny migration before the seed.

The 8 pre-existing "Recruiter Intelligence Dashboard"-style components and the 10 SweetBOS platform components stay untouched — they remain as project-specific or platform-layer components alongside the new universal ones.

### C. The Angela D'Angelo relationship — fully populated

This becomes the worked example every screen can demonstrate against.

**Relationship row:**
- Name: *Angela D'Angelo · Scotia Wealth Management*
- Sector: Wealth · Structure: Solo within enterprise
- Pipeline stage: **Cancelled** (was Booked → cancelled, no response)
- Temperature: **Cold**
- Drift: **High** (no response after cancellation)
- Awareness: Personal intro · Source: Scott Parsons referral
- Notes: "Booked clarity call for April 17 → cancelled → no response. Blocker: Scott Parsons. Portal published with full proposal."
- Recommended package: *Mirror + 3 Machines* ($6,100)
- Primary persona: *Wealth Advisor — Niche Specialist*

**Linked records:**
- One **Project** — *Recruiter Intelligence System (Angela)* — status `Stalled`, declares contributions to the 5 system layers via `project_components`.
- One **Decision** — *"Re-engage Angela or close out?"* — status `Open`.
- One **Document** — *Angela Portal — April 2026* — links to your portal copy as the artifact.
- A **Note/Audit entry** — captures the cancellation chain and Scott Parsons block.

This single relationship will make `/relationships`, `/pipeline`, `/projects`, `/decisions`, and the SweetCycle view all light up with realistic data the moment you open them.

### D. The Session 1 · Client Interviews · Map — as a real Session

Your Seed/Synthesize/Session/Sync/Ship copy is **already a perfect SweetCycle session spec**. I'll seed it as:

**A Session Template** — *"Map — Client Voice-of-Customer Interviews"*
- service_type: Map
- default_duration: 90 min (orchestration) + 20–30 min × N interviews
- pre_work: the Seed checklist (confirm client list · send warm intros · review framework)
- session_purpose: "Capture voice-of-customer intelligence from 4–6 client interviews to fuel positioning sharpening"
- default_outputs: Voice-of-customer bank · Approval-ready testimonials · Positioning seeds

**A Workflow** — *"Voice-of-Customer Interview Map"* with 5 sequential `workflow_steps` matching your SweetCycle stages (Seed → Synthesize → Session → Sync → Ship), each with:
- `position`, `name`, `description` (your exact copy condensed)
- `requires_human_approval = true` on Seed (client confirms list) and Ship (revision window)
- `default_operator_kind`: client for Seed, human (Liz) for Synthesize/Session/Ship, conditional for Sync

**A Playbook** — *"The Voice-of-Customer Playbook"* sequencing this template + the existing Mirror playbook.

This becomes the canonical session template that every future "interview a client's clients" engagement runs from.

---

## Schema changes (minimal)

Only if needed after I check current schema:

1. **Possibly:** add `components.journey_id uuid REFERENCES journeys(id)` (nullable) if no array link exists on `journeys`. Decided after a column inspection.
2. **No other schema changes.**

---

## Migration plan (single migration file)

`supabase/migrations/<timestamp>_seed_canonical_journeys_components_angela.sql`

Order of operations:

1. (If needed) `ALTER TABLE components ADD COLUMN journey_id uuid REFERENCES journeys(id)`.
2. `DELETE FROM journeys WHERE name IN (...the 5 wrong names...)` — guarded by exact-name match so nothing else gets touched.
3. CTE-style insert of the 12 canonical Journeys.
4. CTE-style insert of the 72 Components, each tied to its Journey via the link mechanism. `WHERE NOT EXISTS` on `(name, journey_id)` so re-runs are safe.
5. Insert Angela relationship + linked project, decision, document, audit note. All guarded by `WHERE NOT EXISTS` on stable keys.
6. Insert the Session Template, Workflow + 5 workflow_steps, and Playbook for Session 1. Guarded by name.

All inserts attribute to platform owner ID `65f0dbf1-d933-43cd-ae2a-50b12b7e9962`.

---

## Verification I'll run BEFORE writing the migration

1. Inspect `journeys` table for an existing related-components array column.
2. Inspect `relationships`, `projects`, `decisions`, `documents`, `audit_log` schemas to confirm column names + required fields.
3. Inspect `session_templates`, `workflows`, `workflow_steps`, `playbooks` schemas.
4. Confirm RLS allows the platform-owner inserts (likely yes — same owner ID worked for last two seeds).

Any field shape mismatch → I adjust the seed values, never the schema (except the one possible `journey_id` column).

---

## What this is NOT

- Not modifying the 10 SweetBOS platform Components or the 8 pre-existing project Components.
- Not seeding Domains/Tenets — they're canonical and already in place.
- Not touching the existing Personas, Outcomes, JTBDs, Quests, Missions seeded last pass — those were anchored correctly.
- Not finishing 2.10v Steps 4–5 (Blockers/Wins routes, Ready-to-advance badges) — resumes after.
- Not seeding more relationships beyond Angela. One real worked example is enough; you'll add more from the UI.

---

## Why this order matters

1. **Journeys are the spine.** Every Component, every Tenet score, every Project rolls up to a Journey. Seeding the wrong 5 corrupted the rollups. Replacing them with the canonical 12 makes `/journeys` and every "which Journey is this Component in?" query correct.
2. **72 universal Components turn `/components` into a reference library**, not just a project log. Every advisor's business has a Mission statement and a Lead generation system whether they've built them or not. They should exist as records at `L1 Lacking` until proven otherwise.
3. **Angela makes everything demonstrable.** Right now `/relationships` is empty, `/pipeline` is empty, the SweetCycle view has nothing to show. With Angela's full record + project + decision + portal document seeded, every screen has a live, real, instantly-understandable example to render.
4. **Session 1 as a Workflow proves the SweetCycle.** Your interview-map copy is already production-grade — it deserves to be the canonical Workflow that the system runs, not a doc sitting in a chat.

## Suggested order

1. **This pass** — verification queries → single migration with all of the above.
2. **Resume 2.10v Step 4** — `/think/blockers` + `/think/wins` routes (Angela will be the first row in Blockers).
3. **2.10v Step 5** — Engagement-plan rollups, Ready-to-advance badges.

Approve and I run verification + migration in one pass.

