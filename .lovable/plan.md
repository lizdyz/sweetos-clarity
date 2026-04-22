
# Phase 2.6 build plan — confirmed inputs

You answered the two open questions:

- **Tenets are independent of Domains.** Anything (proposal, entity) can be tagged with **N domains and N tenets** (and N components). Tenets carry their own **Category** (Foundation / Specialization / Advanced / Mastery).
- **Canon is the 22 Domains (D1–D22)** + the **22 Tenets** in your screenshot/text. Both seeded verbatim.

Build proceeds top-to-bottom.

## 1. Confirm workflow fix
The build error (`Cannot find name 'user'` at lines 56/87) is stale — current `src/utils/workflows.functions.ts` already uses `userId` from `context`. No-op; will re-trigger build to clear it.

## 2. Migration A — canon reseed (Domains + Tenets, many-to-many)
- **`tenets`** table reshaped: `id, name, slug, category (enum: Foundation|Specialization|Advanced|Mastery), description, sort_order, enabled` — NO `domain_id` foreign key (tenets stand alone).
- **`domain_tenets`** join table (`domain_id`, `tenet_id`) — optional affinity mapping, empty by default. Lets a tenet *suggest* relevant domains without forcing 1:1.
- Wipe prior seed: `delete from rubric_items; delete from rubric_scores; delete from tenets; delete from domains;`
- Seed **22 domains** (D1 Strategy & Positioning … D22 Monetization) with slug, sort_order 1–22.
- Seed **22 tenets** verbatim from your list, with category.
- Seed one starter `rubric_item` per tenet (`prompt = tenet name`, `excellence_definition = tenet description`, scale 0–5) so dashboards render immediately.

## 3. Migration B — capture upgrade + universal tagging
- **Storage bucket** `captures` (private). RLS: team members read/insert their own; owner/admin delete.
- **`capture_attachments`** table: `id, proposal_id (nullable fk), entity_table, entity_id, storage_path, mime_type, size_bytes, original_name, created_by, created_at`. After approval, attachments get re-pointed from proposal to the written record.
- **Tag columns** added everywhere they're missing:
  - `proposals.tagged_domains text[], tagged_tenets text[], tagged_components uuid[]`
  - On entity tables that don't already have them: `tasks, projects, campaigns, sessions, documents, decisions, delegation, outcomes, missions, playbooks, personas, relationships` get the same three columns. (`quests`, `sparks`, `journeys`, `components` already have variants — keep those, don't duplicate.)

## 4. Capture page upgrade (`/capture`)
- Drag-drop / file-picker zone above the textarea. Multi-file, 25 MB cap each.
- Three searchable multi-select tag pickers (chips): **Domains** (22), **Tenets** (22, grouped by Category), **Components** (live from DB).
- Submit flow: upload files to `captures` bucket → call `captureProposal` with `{ text, attachment_paths[], tagged_domains, tagged_tenets, tagged_components }`.
- AI normalizer receives: user text + filenames + extracted text from `.txt`/`.md` only. PDFs/images attach but only filename feeds AI (Worker can't run `pdf-parse`; honest limitation, swap to a parsing service later).
- AI gets the tag context as a hint to pick `entity_type` and pre-fill fields.

## 5. Queue page upgrade (`/queue`)
- Each proposal card shows: tag chips (domain / tenet / component), attachment list with download links.
- Approve flow: copy tags onto written entity (where columns exist), re-point attachments from proposal_id to the new record's id.

## 6. Workflow activation UI
- "Activate workflow" button on `/workflows/$id` with relationship + project pickers → calls `activateWorkflow` (already wired, file is correct).
- Show resulting `workflow_runs` row state and a link into the queue for the staged kickoff quest.

## 7. EntityWorkspace — view switcher + Kanban
- Add **Table / Board / Cards** toggle to `EntityWorkspace` header (top of every entity index).
- Saved-view memory in `localStorage` per entity.
- **Board (Kanban):** group-by column inferred from each entity's status-like field:
  - `status` → tasks, projects, campaigns, documents
  - `progression_state` → quests, sparks, sessions
  - `pipeline_stage` → relationships
  - `current_maturity_level` → components
  - `spec_status` → personas, playbooks
- Drag between columns via `@dnd-kit/core` (new dep) → optimistic write.
- Card shows: primary field, owner, due date, tag chips, source/confidence pill.
- Filter bar: status, owner, source, tag.
- Per-entity defaults: tasks/quests/sparks/pipeline → Board; documents/components/personas/playbooks → Cards; everything else → Table.

## 8. Sidebar regroup
Reorder into operator groups:
- **Today** · **Capture** · **Queue** · **Pipeline**
- **Relationships** · **Domains** · **Workflows**
- **Library** (collapsed): Personas · Components · Playbooks · Documents · Decisions · Delegation · Sparks · Quests · Journeys · Missions · Outcomes · Domain Assessments · Sessions · Projects · Tasks · Campaigns
- **Settings**

(Library defaults collapsed so the daily-driver routes sit above the fold.)

## Files touched

**Migrations**
- `supabase/migrations/<ts>_phase2.6_canon_reseed.sql` (Domains + Tenets + join + rubric_items)
- `supabase/migrations/<ts>_phase2.6_capture_files_tags.sql` (bucket + attachments + tag columns)

**Code**
- `src/utils/proposals.functions.ts` — accept attachments + tags, propagate on approve
- `src/utils/workflows.functions.ts` — already correct, no edit
- `src/routes/_app.capture.tsx` — file zone + tag pickers
- `src/routes/_app.queue.tsx` — render attachments + tags, propagate on approve
- `src/routes/_app.workflows.$id.tsx` — Activate button + run view
- `src/components/entity-workspace.tsx` — view switcher + filter bar
- `src/components/kanban-board.tsx` (new) — reusable board with `@dnd-kit/core`
- `src/components/tag-picker.tsx` (new) — searchable multi-select for domains/tenets/components
- `src/components/file-drop.tsx` (new) — upload zone
- `src/components/app-sidebar.tsx` — regroup + collapsible Library
- `package.json` — add `@dnd-kit/core`, `@dnd-kit/sortable`

No destructive changes to existing data outside the explicit domain/tenet reseed (which had only my placeholder seed in it).
