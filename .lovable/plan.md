
# Phase 2 Kickoff: Capture, Pollination & Validation

You're naming the thing the system is missing: right now it's a **dashboard of empty tables** with no way to actually feed it. You don't want to click "+ New Persona" 40 times. You want to **talk at it**, have it **pull from your existing Notion**, and then **review and approve** what it proposes — not blindly write.

This pass turns SweetBOS into that.

## Three input rails into one review queue

Everything you say, paste, or pull becomes a **proposal** — never a direct write. All proposals land in a single **Staging Queue** where you confirm, edit, merge, or reject.

```text
Voice / Text Capture ─┐
Notion Pull (MCP)     ├──► Proposals Queue ──► You review ──► Writes to DB
External AI (paste)   ─┘                       (approve/edit/reject/merge)
```

### Rail 1 — Universal Capture (talk or type)
- Floating capture bar (already stubbed at `/capture`) becomes a real input: textarea + mic button + paste-from-anywhere
- On submit, calls a server function that sends the raw text to Lovable AI (`google/gemini-3-flash-preview` default, switchable)
- AI returns: `{ intent, entity_type, proposed_fields, matched_existing_record?, confidence, contradictions[] }`
- Result lands in the staging queue, not the DB

### Rail 2 — Notion MCP pollination
- New **Sources** page under Settings: lists Notion pages/databases you choose to sync from
- For each source you pick which SweetBOS entity it maps to (e.g. "this Notion DB → Personas")
- "Pull from Notion" button fetches via the Notion MCP, runs each row through the same AI normalizer, lands them in the staging queue
- Re-pull is incremental — already-staged or already-approved Notion rows are deduped by source URL + row ID

### Rail 3 — Bring-your-own AI output
- Paste-in box: "I worked this through with another AI, here's the output"
- Same normalizer parses it into proposals
- Provenance on the proposal records "external_ai" + your label (e.g. "ChatGPT", "Claude")

## The Proposals Queue (the trust layer)

A new top-level route `/queue` showing every staged proposal as a card:

```text
┌─────────────────────────────────────────────────────┐
│ PROPOSAL · Persona · confidence 0.82 · from Notion │
│                                                     │
│ Proposed:  "Burned-out founder, 35-50, SaaS"       │
│ Matches:   Existing persona "Founder, mid-stage"?  │
│            [merge]  [keep separate]                │
│                                                     │
│ Fields:    name, age_range, industry, pain_points  │
│            [edit inline]                           │
│                                                     │
│ Conflicts: industry says "SaaS" — existing says    │
│            "B2B Services"  ⚠                       │
│                                                     │
│ Source:    notion://page-abc123  (open original)   │
│                                                     │
│ [Approve & write]  [Edit]  [Reject]  [Hold]        │
└─────────────────────────────────────────────────────┘
```

- Filters: by entity type, by source, by confidence, by status
- Bulk approve for high-confidence + no-conflict proposals
- Every approval writes to the real table AND records provenance (`source`, `source_ref`, `confidence`, `approved_by`, `approved_at`) on the row

## Domains & personas — making them industry-aware

You're right that personas/domains depend on industry. Two changes:
1. **Industry** becomes a first-class field on `Relationships` (with a sensible enum + free-text fallback)
2. **Persona templates** — a small library of starter persona shapes per industry. When you create or pull a persona, the system suggests the matching template's fields to fill in. Templates are editable in Settings → Templates and seeded with a starter set.

## What I need from you (file context)

> "do you still have access to them"

I have the **summarized canon** from earlier in this conversation (the SweetBOS constitution, ERD, component master list, SweetCycle/SweetSync model, cadence vars). The raw uploaded files from earlier turns are no longer directly readable — they were summarized. That's been enough to design the schema correctly.

For Phase 2 specifically I'll need to **re-fetch from Notion via MCP** the canonical lists for:
- Domain taxonomy (so the dropdown matches your real list)
- Component master list (so pulled work items match real component IDs)
- Persona templates per industry (if you have these documented)

I'll do that as the first step of the build, using the already-connected Notion MCP — no extra setup from you.

## Build order

1. **Schema:** `proposals` table (status, entity_type, payload jsonb, source, source_ref, confidence, conflicts jsonb, matched_record_id, approved fields), `sources` table (Notion page/db registry), `industry` + provenance fields on existing entities
2. **Capture server function:** text → Lovable AI → normalized proposal → `proposals` table
3. **Notion MCP fetch server function:** pulls a registered source, normalizes each row, stages proposals (dedupe by source_ref)
4. **External-AI paste server function:** same normalizer path
5. **Proposals Queue UI** at `/queue` — cards, filters, approve/edit/reject/merge
6. **Capture UI** at `/capture` — textarea + mic (Web Speech API) + submit
7. **Sources UI** in Settings — register Notion pages/DBs, map to entity, "Pull now" button
8. **Persona templates** — seed table + Settings tab to edit
9. **Industry field** on Relationships + propagate into persona/domain suggestions
10. Re-fetch canonical lists from Notion to seed enums and templates

## What this gives you

- You talk at it, it stages a proposal, you tap approve. No form-filling.
- Notion stops being a separate world — it pollinates SweetBOS on demand, with your review.
- Anything you worked out in another AI lands the same way.
- Nothing writes without you confirming. Contradictions surface before they corrupt the graph.
- Industry-aware persona suggestions instead of one generic shape.

## Deferred (still Phase 3)
- Auto-pull on Notion changes (webhook) — manual pull only for now
- Voice transcription beyond Web Speech API (e.g. Whisper) — browser native first
- Multi-step agent that proposes whole campaigns/projects from a single capture — single-entity proposals first, chains next
