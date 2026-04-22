

# Pause Phase 2.10v · Seed the Components library from your SweetBOS Inventory

## Where we are

Step 2 of 2.10v shipped (live index pages on rollup views). Steps 4–5 (Blockers/Wins routes, Ready-to-advance badges, engagement rollups) are still queued. **None of that is blocking** — the index pages work standalone.

You're asking the bigger question: *"my Components library is thin — can we fill it with solid ideas that actually make sense for clients?"* Yes. And it's worth doing **now**, before more rollup polish, because every page we just rebuilt (`/components`, `/projects`, project↔component contributions, ready-to-advance badges) is **dramatically more useful when there are real components to roll up against.** Eight components is barely enough to demonstrate the system. Twenty is a real library.

## What I propose to seed

Your inventory file describes **10 platform-level components** — Profile, Dashboard, Active Transformation, LizBot, Vault, Resource Library, Analytics, Sessions Hub, Community, Portal — each with rich, fully-fleshed metadata (purpose, what user does there, contains, USER value, SYSTEM value, plus the Portal's full audience-view spec).

These are **the most fully-flushed-out** ideas in the file. They're the SweetBOS product surface every advisor relationship will eventually map against, so they're a genuinely valuable library entry, not filler.

I'll seed **all 10** as Components with these field mappings:

| Inventory column | Components column |
|---|---|
| `Component_Name` (with icon prefix) | `name` |
| `Primary_Purpose` + `User_Goes_Here_To` (joined) | `description` |
| Inferred from richness | `current_maturity_level` (L3 Launching for 8, L4 Leveraging for Portal + Dashboard since they have explicit audience/curation specs) |
| `Contains` (split into bullet list) | `maturity_threshold_definition` *(the "what good looks like" criteria)* |
| Derived from purpose | `questions_it_answers` |
| `["Product","Process"]` for all | `related_domains` |
| `"60-90 min discovery + iterative build"` (Portal/Dashboard get longer) | `typical_session_length` |
| `["SweetBOS Platform"]` | `used_in_offerings` |
| Quality stamp | `quality_status = 'Approved'` |

**Special case — Portal:** the inventory has a full Page-2 audience spec (SELF/PROSPECT/PARTNER/COMMUNITY views, default visibility, control mechanism, data sources). I'll fold that into Portal's `description` + `maturity_threshold_definition` so it lands as the most-detailed component in the library, not a stub.

## What this builds

**One migration file.** Pure `INSERT … ON CONFLICT (name) DO NOTHING` so re-running is idempotent and existing components are untouched.

- `supabase/migrations/<timestamp>_seed_sweetbos_platform_components.sql` — 10 inserts with the field mapping above.

**No code changes.** No new components, no route edits, no memory changes. The existing `/components` index will immediately show the new entries with their maturity levels and (zero) build-pipeline activity. They become available as tag targets for tasks/projects/sessions that build them, and as link targets in Vault.

## What this is NOT

- Not finishing 2.10v Steps 4–5 (Blockers/Wins routes, Ready-to-advance badges). I can resume after.
- Not seeding Domains, Tenets, JTBD, Personas, Outcomes, or Workflows from the inventory. The file's Pages 3–20 are empty — the only fully-fleshed sheets are the Components one and the Portal spec. I'm not going to invent content for the empty sheets; if you have other sheets you want seeded, share them and I'll do the same disciplined mapping.
- Not deduping or rewriting your existing 8 components (Recruiter Intelligence Dashboard, Succession Spine Map, etc.). They stay as-is. The seed only adds names that don't exist.

## Why this order

1. **Right now** you have 8 components. Most are recruiter/succession-domain. The product-surface components (Vault, Portal, Sessions Hub) are referenced everywhere in the codebase but **don't exist as records**, so they can't be tagged, contributed to, or rolled up. That's a quiet hole.
2. After seeding, every project/task/session that touches the Vault page can declare `project_components` against the real Vault component → the build-pipeline view starts showing real heat.
3. The 2.10v polish steps (Ready-to-advance badges, blockers route) are *more impressive on a populated library* than on a stub one. Seeding first makes those steps land harder.

## Suggested order

1. **Seed the 10 inventory components** *(this pass — single migration, no risk)*.
2. **Resume 2.10v Step 4** — `/think/blockers` + `/think/wins` routes + sidebar entries.
3. **2.10v Step 5** — Engagement-plan rollups, subscription card on rollup, Ready-to-advance badges across Domain / SweetCycle / Today.

Approve and I run the seed migration. If you want me to **also** finish 2.10v Step 4 in the same pass, say so and I'll batch them.

