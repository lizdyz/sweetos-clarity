

# Phase 2.10p — Capture-as-Vault, JTBD home, Components-that-ship-assets, SweetCycle clarity, Engagement Plan explainer, Decisions vs Delegation

Six concrete things you asked, answered with build + explainer. No fluff.

---

## 1. Answers first (no code) — what these things ARE

### 🟣 Engagement Plan
**The contract for one client over a stretch of time (3–12 months).** It bundles:
- **Services purchased** (e.g. *1 Mirror + 3 Maps + 1 Sync*) → `engagement_services` rows.
- **Roadmap** of which Domains/Tenets we'll move (`expected_domains`, `machine_roadmap`).
- **Revenue terms** (`total_revenue_usd`).
- **Expected sessions** — services consume sessions, those sessions appear in SweetCycle.

It's the **wrapper**: Relationship → **Engagement Plan** → Services → Sessions → Deliverables.
A relationship without a plan = ad-hoc work. A plan = a real engagement.

I'll add a one-paragraph explainer card at the top of `/engagement-plans` AND `/engagement-plans/$id` so this is never a mystery again.

### 🟣 SweetCycle
The 5-phase rhythm a single session moves through: **Seed** (client preps) → **Synthesize** (we analyze) → **Session** (live) → **Sync** (recap & confirm) → **Ship** (delivered). It's a **board view of all sessions for one client**, grouped by which phase they're in. Useful when you're juggling 5 sessions for one client and want to see "what's mine to do right now vs waiting on them."

The page exists but feels thin. I'll fix that (see §4).

### 🟣 Decisions vs Delegation
- **Decisions** (`decisions` table) = **a choice made**, with rationale. Fields: `decision`, `context`, `implications`, `made_by`, `date_made`, `supersedes`. Lives in OCDA → Decide column. *"On 2026-04-12 we decided to use Stripe over Paddle because…"*
- **Delegation** (`delegation` table) = **work that should leave Liz's plate**. Fields: `task_or_responsibility`, `currently_done_by`, `can_be_delegated_to`, `effort_to_hand_off`, `only_liz_can_do_this_because`, `what_would_make_it_delegatable`. *Delegation register* — not "do this task," but "this is something we want to systematize and hand off."

They look similar but solve different jobs. I'll add canonical PageHeader copy to both so this is obvious on the page.

### 🟣 Where Jobs-To-Be-Done live
**Right now: nowhere explicitly.** The schema has no JTBD field. They're implicit inside Personas (`audience_primary_concern`), Components (`questions_it_answers`), and Outcomes. I'll add a real home (see §6).

---

## 2. Capture = the Vault (clean storage, browsable per-person, per-resource)

**Today:** `/capture` uploads files to the `captures` bucket attached to a proposal. Once approved → file is "kind of there" but there's no browsable Vault.

**Fix:**
- **Promote `capture_attachments` into a real Vault** — every uploaded file (from Capture, from Sessions, from Documents) lands in one queryable surface.
- **New route `/vault`** under Library — searchable / filterable by: Person, Relationship, Domain, Tenet, Component, MIME type, source (capture | session | document | external_ai). Grid view with thumbnails for images, type-badge for PDFs/docs.
- **Per-Person Vault tab** on `/people/$id` — every file ever attached to anything tagged with this person.
- **Per-Resource Vault tab** on Components, Personas, Domains, Tenets — files tagged to that subject.
- **Client portal vs internal Vault separation:** add `visibility text CHECK ('internal' | 'client_shared' | 'public')` to `capture_attachments`. Client portal (relationship_portals) only ever sees `client_shared`. The internal Vault sees everything.
- **Better extraction at capture time:** extend `extractTextIfPossible` to also handle PDFs (use `pdf-parse-fork` lite at edge) and images (Lovable AI vision OCR via `gemini-2.5-flash`) so attached files are searchable, not opaque.
- **Audit log every file event** (uploaded · linked · shared-with-client · removed) into `entity_audit_log`.

This makes Capture's promise real: **anything you drop in is filed, tagged, searchable, and visible in the right place.**

---

## 3. SweetCycle — make it actually useful

**Today:** pick a relationship → see sessions in 5 columns. Functional but "so what?".

**Fix:**
- **Default to "all my active relationships"** so you don't have to pick one. Compact swimlane per relationship, each row = one client's SweetCycle in 5 mini-columns.
- Pick a relationship → expand to the current full board.
- **Phase blockers surface at the top:** "🟠 3 sessions blocked at Sync waiting on client confirm" with click-through.
- **Owner badges on every card:** `you` / `liz` / `client` / `both` — color-coded so "what's on my plate today" is obvious.
- **Phase-due heatmap strip** above the board: red/amber/green by `phase_due_date` so you see overdue at a glance.
- **Each card** shows mini service-progress (`2/4 Map sessions used`) and links to the underlying engagement_plan.
- **Empty state** gets a real CTA: "Schedule the first session for {client}" → opens the planner-add popover prefilled.

---

## 4. Components that ship usable assets (emails, newsletters, PRDs, etc.)

You asked: *"can [Components] produce usable assets like emails or newsletters, or PRDs?"* — yes, this is exactly what they should do.

Schema today: `components` has `name`, `maturity_level`, `quality_status`. There's no link to an actual produced thing. Fix:

**New table `component_outputs`** (the deliverables a Component produces):
```sql
CREATE TABLE component_outputs (
  id uuid PK,
  component_id uuid → components,
  output_kind text CHECK (output_kind IN
    ('email','newsletter','prd','playbook','one_pager','spec','script',
     'template','presentation','workflow_doc','training','other')),
  title text,
  status text CHECK (status IN ('draft','in_review','approved','published','retired')),
  storage_path text,           -- the file in the captures bucket
  body_md text,                -- inline content for short outputs (emails, snippets)
  generation_prompt text,      -- the system prompt used (links to system_prompts)
  generated_by_operator_id uuid → operators,
  version int DEFAULT 1,
  supersedes uuid → component_outputs,
  visibility text CHECK ('internal','client_shared','public') DEFAULT 'internal',
  approved_by uuid, approved_at,
  created_at, updated_at
);
```

**On every Component detail page** new section: **"Outputs this Component produces"** — tile grid of output kinds. Click → preview / download / share with client. "+ Generate output" → picks an Output Kind → runs the lens-attached prompt against the Component's content + Persona context → drafts an email/newsletter/PRD as `status='draft'`. Human reviews, edits, approves → status moves to `approved` → file becomes available in Vault and (if `client_shared`) in the client's portal.

**Each Output Kind has its own editable system prompt** in the Prompt Console (`system_prompts.key='output.email'`, `output.newsletter`, `output.prd`, etc.) — so "what a great PRD looks like" is editable, modular, versioned.

This wires the loop: **Component matures → it ships things → those things land in the Vault and the client portal.**

---

## 5. Jobs-To-Be-Done — give them a real home

JTBD is core to your model but has no table. Add one:

```sql
CREATE TABLE jobs_to_be_done (
  id uuid PK,
  statement text NOT NULL,           -- "When I'm onboarding a new client, I want to…"
  job_type text CHECK ('functional','emotional','social'),
  context text,                      -- the situation
  desired_outcome text,              -- the success measure
  current_solution text,             -- what they do today
  pain_severity int CHECK (1..5),
  -- linkage
  persona_id uuid → personas,
  relationship_id uuid → relationships,
  related_domains text[],
  related_components uuid[],
  related_outcomes uuid[],
  status text CHECK ('discovered','validated','addressed','retired') DEFAULT 'discovered',
  source text,                       -- 'session','capture','interview','signal_scanner'
  source_ref text,
  created_at, updated_at
);
```

**New route `/library/jtbd`** — list, filter by Persona / Domain / pain severity. Detail shows: linked Components that *address* the job, linked Outcomes that *measure* progress, sessions/sparks that *surfaced* it.

**Surfaced everywhere it matters:**
- Persona detail → "JTBDs this persona has."
- Component detail → "JTBDs this component addresses."
- Capture → AI parser learns to detect JTBD-shaped statements and stage them as `entity_type='jtbd'` proposals.
- OCDA Cockpit → JTBDs can sit in the **Observe** column.

So the answer to *"where do my jobs-to-be-done live?"* becomes: **`/library/jtbd`, surfaced wherever they're relevant.**

---

## 6. Decisions & Delegation — clarify the page purpose

Two tiny but high-value fixes:

- **`/decisions`** PageHeader: *"A choice you made and why. Decisions are the **Decide** stage of OCDA — they capture what was chosen, the context, the implications, and what they supersede."* Add an **"Open in OCDA Cockpit"** link.
- **`/delegation`** PageHeader: *"The register of work that should leave your plate. Each row = a responsibility currently owned by you that we want to systematize, train someone on, or hand to an agent. Different from Tasks (which are doing) — Delegation is **planning to hand off**."* Add a "Convert to Workflow" CTA on each row (creates a draft workflow scaffold from `task_or_responsibility` + `what_would_make_it_delegatable`).

Both keep their existing data; they just stop being mysterious.

---

## 7. ERD reality check (the deep look you asked for)

I read the schema — 80 tables. The shape is sound. Three observations worth your time:

1. **Components are already the spine** — they're linked from projects (`project_components`), tasks (`task_components`), workflows (`workflow_components`), sessions (`session_components`). Adding `component_outputs` (§4) closes the missing loop: *what a mature Component actually produces.*
2. **`capture_attachments` is underused** — it has `entity_table` + `entity_id` already, so promoting it to a Vault is mostly a UI / extraction job, not a schema rebuild.
3. **`relationship_portals`** already exists — that's the client-facing surface. The visibility flag in §2 is the bridge: the portal renders only `client_shared` items.

No table renames, no destructive migrations.

---

## 8. Files & migration

**Migration `<ts>_vault_outputs_jtbd.sql`:**
- `capture_attachments`: add `visibility`, `tagged_domains text[]`, `tagged_tenets text[]`, `tagged_components uuid[]`, `tagged_personas uuid[]`, `extracted_text text`, `audit_logged bool`.
- New `component_outputs` table + RLS + audit triggers.
- New `jobs_to_be_done` table + RLS.
- Seed `system_prompts` rows: `output.email`, `output.newsletter`, `output.prd`, `output.one_pager`, `capture.parse.jtbd`.

**New components:**
- `src/components/vault-grid.tsx` — searchable file grid with type icons + thumbnails.
- `src/components/vault-filters.tsx` — Person/Relationship/Domain/Tenet/Component/Visibility filters.
- `src/components/component-output-tile.tsx` — single output card with preview + actions.
- `src/components/component-output-generator.tsx` — kind picker + prompt editor + run button.
- `src/components/jtbd-card.tsx` + `src/components/jtbd-list.tsx`.
- `src/components/sweetcycle-multi-rel-board.tsx` — all-relationships compact swimlane view.
- `src/components/sweetcycle-blockers-strip.tsx` — top-of-page blocker surface.
- `src/components/decisions-explainer.tsx` + `src/components/delegation-explainer.tsx`.

**New routes:**
- `src/routes/_app.vault.tsx`
- `src/routes/_app.library.jtbd.tsx`
- `src/routes/_app.library.jtbd.$id.tsx`

**Edited:**
- `src/routes/_app.capture.tsx` — also write `tagged_*` to `capture_attachments`; add "View in Vault" link.
- `src/routes/_app.sweetcycle.tsx` — multi-relationship default, blockers strip, owner badges.
- `src/routes/_app.engagement-plans.index.tsx` — explainer card at top.
- `src/routes/_app.engagement-plans.$id.tsx` — explainer line in header.
- `src/routes/_app.decisions.index.tsx` + `_app.delegation.index.tsx` — PageHeader copy + CTAs.
- `src/routes/_app.components.$id.tsx` — Outputs section.
- `src/routes/_app.personas.$id.tsx` — JTBDs tab.
- `src/routes/_app.people.tsx` (or person detail if it exists) — Vault tab.
- `src/components/app-sidebar.tsx` — add **Library → Vault**, **Library → JTBD**.
- `supabase/functions/parse-capture/index.ts` (or the existing capture parser) — add JTBD detection.
- `src/integrations/supabase/types.ts` — auto-regenerated.

**Edge function (new):**
- `supabase/functions/generate-component-output/index.ts` — takes (component_id, output_kind), pulls Component context + Persona + Relationship, runs the matching `system_prompts` row, writes a draft `component_outputs` row.

**Memory updates:**
- `mem://design/canon-vault.md` (new) — Vault is the unified file surface; client portal sees `client_shared` only.
- `mem://features/component-outputs.md` (new) — Components produce typed Outputs (email, newsletter, PRD…); each kind has an editable system prompt.
- `mem://features/jtbd.md` (new) — JTBD lives in `jobs_to_be_done`, surfaced under Library and on Persona/Component detail.
- `mem://design/sidebar-ia.md` — append: Library now includes Vault and JTBD.

---

## What I'm NOT doing this pass

- Real PDF OCR pipeline beyond Lovable-AI vision (good enough for MVP).
- Building the client portal renderer for `client_shared` items — schema flag goes in; portal UI in next pass.
- Bulk-tagging existing `capture_attachments` retroactively (you'll tag as you go, or I can run a one-shot AI tagger if you want).
- Output kinds beyond the 12 listed.

## Suggested order after

1. **2.10p (this plan)** — Vault + Component Outputs + JTBD + SweetCycle clarity + Decisions/Delegation copy.
2. **First Component-shipped Email** — pick one Component, generate its email, ship to one client.
3. **Client portal renderer** that displays `client_shared` Vault items.
4. **JTBD-aware Lens prompts** — feed the BizzyBot generation with this Persona's JTBDs.

