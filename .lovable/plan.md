
# Where we are vs. where you need to be

You're right — what's built is **plumbing** (entities, queue, capture, cadence). What's missing is **the part you actually operate from**: domain checklists, tenets, "what excellence looks like," and intelligence workflows you can activate. Let me name the gap honestly, then propose the next pass.

## What Phase 2 already shipped
- Entity tables (Personas, Missions, Journeys, Quests, Sparks, Outcomes, Components, Playbooks, Domain Assessments, etc.)
- Capture page (talk/type → AI normalizes → proposal)
- Proposals Queue (review/approve/edit/reject)
- Cadence settings (tunable numbers)
- SweetCycle ladder on Sessions
- Workflow states panel

## What's still NOT built from the original plan
1. **Domains as a first-class thing** — no Domains page, no tenets, no per-domain assessments shown
2. **"What excellence looks like"** — no rubrics, no checklists, no scoring against tenets
3. **Intelligence Workflows** — Workflows exist as a *table* but you can't *activate* one against a relationship/project to actually run it
4. **Notion MCP pull rail** — capture works, Notion sync was deferred
5. **Persona templates per industry** — deferred
6. **Industry field on Relationships** — deferred
7. **Connective tissue** — nothing visually shows how Domain → Tenet → Assessment → Workflow → Quest → Spark → Session flows. It's all separate pages.

## What you actually need (reframing the product)

You don't want "12 entity tables in a sidebar." You want **three operational surfaces**:

### 1. Intelligence Dashboards (per Domain)
A real Domain page. For each domain (Strategy, Brand, Offer, Pipeline, Delivery, Ops, Mindset, etc.):
- The **tenets** of excellence in that domain
- A **checklist / rubric** of what excellent looks like (scored 0–5 or red/yellow/green)
- Current **assessment score** for the active relationship
- The **workflows** available to lift that domain
- The **quests/sparks** currently in motion against it
- A "what would move this most" recommendation

This is the dashboard you keep asking for. It's not a list of records — it's a **state-of-excellence view** per domain, per client.

### 2. Activatable Intelligence Workflows
Workflows become **runnable templates**, not static records:
- A workflow has steps, prompts, and expected outputs
- "Activate" against a Relationship/Project → instantiates Quests + Sparks + Sessions automatically
- The workflow run shows progress, what's done, what's next, what it produced
- Outputs land back as proposals in the queue for your approval

This is the "amplifies excellence" piece. Workflows aren't shelf-ware — they generate the work.

### 3. The Connective Spine (one screen that shows it all)
A new **Relationship Workspace** view:
```text
[Relationship: Acme Co.]
├─ Industry · Stage · Tenets in focus
├─ Domain Excellence Heatmap  (8 domains, each with score + trend)
│    └─ click → Domain Intelligence Dashboard
├─ Active Workflows (running)  → progress bars
├─ Active Quests / Sparks      → next actions
└─ Recent Sessions + Outcomes
```
This is the page you open in the morning. Everything else feeds it.

## Proposed next pass — Phase 2.5: "Make it feel like the product"

Build order, opinionated:

1. **Domain model upgrade** — `domains`, `tenets`, `rubric_items` tables. Seed with a real starter set (you'll edit). Each tenet belongs to a domain; each rubric_item belongs to a tenet with a 0–5 scale and "what excellent looks like" text.
2. **Domain Intelligence Dashboard** route at `/domains/$slug` — tenets, rubric checklist, current scores, recommended workflows, in-flight quests/sparks. Per-relationship filter at the top.
3. **Relationship Workspace** at `/relationships/$id` — the heatmap + active workflows + next actions spine.
4. **Workflow activation** — "Run this workflow on [Relationship]" button. Creates a `workflow_run` row, generates the planned Quests/Sparks/Sessions as **proposals** in the queue (so you confirm). Run page shows live status.
5. **Industry field + persona templates** — finally wired so personas auto-suggest fields based on the relationship's industry.
6. **Notion MCP pull** — the Sources page so canon (domains, tenets, components) pollinates from your existing Notion instead of you typing it.
7. **Sidebar reorganization** — group by what you *do*, not by table name:
   - **Today** · **Capture** · **Queue**
   - **Relationships** (workspaces)
   - **Domains** (intelligence dashboards)
   - **Workflows** (activate)
   - **Library** (Personas, Components, Playbooks, Documents — collapsed)
   - **Settings**

## What I need from you before building

Two quick decisions and one source pull:
1. **Do I seed Domains + Tenets from a starter set I draft, or pull them from a specific Notion page first?** (Pulling is more accurate but slower; seeding lets us see the UI sooner and edit later.)
2. **Rubric scale: 0–5 numeric, or red/yellow/green, or both?** (I'd recommend both — score drives the heatmap, color is the at-a-glance.)
3. If pulling from Notion: paste the Notion URL of your domains/tenets/excellence canon and I'll fetch via MCP as step 0.

Once you answer, I build in the order above. The first three steps alone will make the app feel like the intelligence cockpit you've been describing instead of a CRUD shell.
