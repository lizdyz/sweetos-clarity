

# Phase 2.10z — Productize SparkPath: Primer · Seed · Mirror Portal · Clarity as a real authoring system

You hand-built four beautiful artifacts for Erica (Primer, Seed, Mirror Portal, Clarity). You want to be able to **produce that same quality (or better) for any client without rebuilding from scratch in HTML.** Right now SweetBOS has zero infrastructure for it — `relationship_portals` only stores a URL string.

This phase turns the four hand-built docs into **first-class entities** the system authors, hosts, and improves.

---

## What you actually built (the canon I'm extracting)

Reading all four live pages + the Erica Map-1 Seed HTML:

| Artifact | Role in SweetCycle | Audience moment |
|---|---|---|
| **Primer** | "Read this before the questionnaire" — frames the Mirror | Pre-Seed, sells the depth |
| **Seed (Mirror)** | The 22-domain questionnaire that fuels the Mirror | Required before Mirror session |
| **Seed (Map-N)** | Per-Map session questionnaire (confirm/correct, not start-from-scratch) | Required before each Map |
| **Mirror Portal** | The synthesis of everything — long-form reveal | Post-Mirror, the deliverable |
| **Clarity** | Decision-making working doc — pick your Map | Between Mirror and first Map |

These aren't four random pages. They're a **5-stage publication pipeline** that runs once per client, with the same structure, just different content.

---

## What this phase ships

### 1. Four new entity tables (the SparkPath publication graph)

```
client_primers              — pre-Seed framing doc
client_seeds                — questionnaire (Mirror or Map-N)
  └─ seed_sections          — 22 domain sections (or session-specific)
     └─ seed_questions      — Q01, L04a, etc. with type/badge/hint
        └─ seed_responses   — what the client typed/uploaded
client_mirror_portals       — long-form synthesis deliverable
  └─ portal_sections        — the 20 numbered sections you ship
client_clarity_docs         — post-Mirror decision-making doc
  └─ clarity_jobs           — react ✓📌– jobs with assets
```

Every record links back to a `relationship_id`. Every section/question is **structured data**, not blob HTML.

### 2. The canonical Seed bank (seeded data)

Extract the **22-domain Mirror Seed** from the Erica live page into a reusable `seed_template` table:
- 22 sections (Strategy, Economics, Growth, Partnership, Identity, Governance, IP, Tech Stack, Numbers, Life Design, etc.)
- ~150 canonical questions across them, tagged Foundational / Optional / Upload, each with hint copy
- Per-Map session seed templates (the Erica Map-1 "Knowledge System" template becomes the canonical *"Map — Operating Environment"* seed)

This becomes the **library you pick from** when launching a new client. No more rebuilding HTML.

### 3. The portal authoring routes (`/relationships/$id/sparkpath/*`)

Five new sub-routes under each relationship:

- `/relationships/$id/sparkpath/primer` — author the Primer (markdown editor + preview)
- `/relationships/$id/sparkpath/seed` — pick a seed template, customize per-client preamble, publish
- `/relationships/$id/sparkpath/mirror` — author Mirror portal sections (drag-reorder, per-section type)
- `/relationships/$id/sparkpath/clarity` — author Clarity jobs/assets, mark which need a session
- `/relationships/$id/sparkpath` — overview dashboard: status of all 4 + view counts + response %

### 4. The public client-facing renderer (`/p/$slug/*`)

The published pages your clients actually see — replicating the Erica look:
- Lora + DM Sans + DM Mono fonts
- Paper/ink color palette (`--paper #faf8f4`, `--ink #1c1a17`, `--accent #b5476a`)
- Sticky nav, callouts (record/data/how), badges (foundational/optional/upload)
- Auto-save responses every 30s into `seed_responses`
- Anyone with the link can view + answer (no auth — token-protected slug)

So **Erica's existing `portal.sweetbot.ai/sparkpath/erica/seed` becomes a SweetBOS-hosted page** at `/p/erica-2026/seed` with the same look, rendered from the database.

### 5. AI assist where it actually helps (your "AI slop" feedback)

The pushback you got — *"a lot of AI slop but also lots of valuable info"* — comes from AI being asked to write the whole Mirror in one shot. The fix is **scoped AI assists**, not full generation:

- **Primer:** AI suggests a 3-paragraph hook from the relationship's `intelligence_summary` + chosen package — you edit before publishing.
- **Seed:** AI never writes seed *responses*, but **does** rewrite each section's preamble in your voice using prior-session context (the "what we already know" callouts).
- **Mirror Portal:** Per-section assists only — *"draft the Strategy section from these 6 seed responses + my notes"* — one section at a time, always editable, with a "Regenerate with edits" button. Each section saves its `ai_draft` separately from `final_text` so you always see what it gave you vs. what you kept.
- **Clarity:** AI proposes which jobs need a session vs DIY based on response patterns — you confirm.

Three guardrails for the AI slop problem:
1. **Quote-locked passages** — sections marked "client's own words" never get AI-rewritten.
2. **Confidence flags** — every AI paragraph carries `inferred | observed | quoted` so you (and the client) see what's grounded.
3. **Per-section regeneration** — you never regenerate the whole portal, only the one section you're unhappy with.

### 6. Response capture loop

When a client fills out their Seed at `/p/erica-2026/seed`:
- Each answer auto-saves to `seed_responses` (debounced 30s)
- Completion % updates on `/relationships/$id/sparkpath` dashboard
- New `Spark` auto-generated when a response is unusually long, contradicts a prior answer, or matches a "watch phrase" you defined in the seed template
- Document uploads land in storage, attached to the response

This is where Sparks finally have a real source: *"Erica wrote 400 words on Q-12 about partnership friction → Spark: Partnership Decision Quest."*

---

## What gets touched

**5 small migrations:**
1. `add_sparkpath_entities` — 8 tables above + RLS (team read, owner write, public-token read for `/p/*`)
2. `seed_canonical_seed_templates` — 22-domain Mirror seed + Map-1 Operating Environment seed extracted from Erica HTML
3. `add_seed_response_storage_bucket` — Supabase Storage bucket `seed-uploads` + policies
4. `add_portal_sections_and_clarity_jobs` — sub-tables for the portal/clarity authoring
5. `add_sparkpath_view_count_trigger` — track viewed_at + per-section reads

**~15 new files:**
- `src/routes/_app.relationships.$id.sparkpath.tsx` (overview)
- `src/routes/_app.relationships.$id.sparkpath.primer.tsx`
- `src/routes/_app.relationships.$id.sparkpath.seed.tsx`
- `src/routes/_app.relationships.$id.sparkpath.mirror.tsx`
- `src/routes/_app.relationships.$id.sparkpath.clarity.tsx`
- `src/routes/p.$slug.primer.tsx` + `.seed.tsx` + `.mirror.tsx` + `.clarity.tsx` (public, unauth)
- `src/components/sparkpath/seed-question-renderer.tsx`
- `src/components/sparkpath/portal-section-editor.tsx`
- `src/components/sparkpath/sparkpath-status-dashboard.tsx`
- `src/styles/sparkpath-public.css` — the Lora/DM Sans paper-and-ink theme
- `supabase/functions/sparkpath-section-draft/index.ts` — per-section AI assist (Lovable AI, Gemini Flash)
- `supabase/functions/sparkpath-spark-watcher/index.ts` — response → Spark trigger handler

**1 sidebar update:** add "SparkPath" sub-item under each opened relationship in the right-rail.

---

## What this is NOT

- Not migrating Erica's existing live portal pages — those keep working at `portal.sweetbot.ai`. You can re-author her in SweetBOS at your own pace; the system supports both during transition.
- Not finishing 2.10v Steps 4–5 (Blockers/Wins, Ready-to-advance badges) — resumes after.
- Not re-doing Phase 2.10y's incomplete UI toggle — that gets folded into this pass since `/components` work overlaps.
- Not building a public account/login for clients — Seed/portal access is via tokenized URL only (same as your current Erica setup).
- Not auto-generating full Mirrors — only scoped per-section assists.

---

## Suggested order

1. **Phase A (this pass)** — migrations 1–3, public renderer for Seed only, authoring route for Seed, canonical Mirror Seed template seeded. *Deliverable: you can stand up Erica's exact Seed for any new client in 10 minutes.*
2. **Phase B** — Primer + Mirror portal authoring + per-section AI assists.
3. **Phase C** — Clarity + Spark watcher trigger + dashboard.
4. **Resume 2.10v Step 4** — Blockers/Wins routes (now they have real client data to draw from).

Approve Phase A and I run migrations 1–3 + the Seed authoring + public Seed renderer + canonical 22-domain seed template in one pass. If you want all three phases batched, say so and I'll do A→B→C atomically.

