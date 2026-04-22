
# Phase 2.6: Fix workflows, expand canon, capture+files, Kanban tabs

Four scoped jobs in one pass.

## 1. Fix the workflow build error
`src/utils/workflows.functions.ts` imports a non-existent `getSupabaseServerClient`. Replace with the real auth pattern used everywhere else:

```ts
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const activateWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ActivateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context;
    // …existing logic, replace `user.id` with `userId`
  });
```
That alone clears the build. Also wire an **"Activate workflow"** button on `/workflows/$id` (already imports `WorkflowStatesPanel`) — small relationship picker → calls `activateWorkflow`.

## 2. Seed 22 Domains + 22 Tenets
Migration that:
- Wipes the seed rows from the previous migration (`delete from rubric_items`, `delete from tenets`, `delete from domains where created_by is null or seeded`)
- Inserts your **22 canonical domains** + **22 tenets** (one tenet per domain, 1:1 mapping — confirm in Q1 below if you want a different shape)
- Re-seeds a default rubric_item per tenet so the Domain Intelligence dashboard renders immediately

I need you to confirm the exact 22 names. Two options in Q1.

## 3. Universal Capture: files + tagging
Upgrade `/capture` and the proposals pipeline:

**Storage**
- New Supabase Storage bucket `captures` (private, RLS: team read/insert)
- New table `capture_attachments` (`id`, `proposal_id` nullable, `storage_path`, `mime_type`, `size_bytes`, `original_name`, `created_by`, `created_at`)
- Tagging columns on `proposals`: `tagged_domains text[]`, `tagged_tenets text[]`, `tagged_components uuid[]`

**UI on `/capture`**
- Drag-drop / file-picker zone above the textarea (multi-file, 25MB each)
- Three tag pickers (Domains, Tenets, Components) — multi-select, searchable, shown as chips
- On submit: upload files first, then call `captureProposal` with `{ text, attachments[], tagged_domains, tagged_tenets, tagged_components }`
- AI normalizer receives file names + extracted text from PDFs/MD/TXT (PDF parsing via `pdf-parse` is Worker-incompatible — for MVP we extract text only from `.txt`/`.md`; PDFs/images are attached but only the filename+user text feed the AI. Honest limitation, easy upgrade later via an external parsing service)

**Queue impact**
- Proposal cards show attached files (download links) and tag chips
- Approving a proposal copies tags onto the written entity (when columns exist there) and links attachments to the new record

## 4. Kanban + intuitive tabs
Add a **view switcher** (Table / Board / Cards) at the top of every entity index page. Pulled into `EntityWorkspace` so all 12 entities get it for free.

**Board (Kanban) view**
- Group-by column comes from each entity's "status-like" enum: `status` for Tasks/Projects/Campaigns/Documents, `progression_state` for Quests/Sparks/Sessions, `pipeline_stage` for Relationships, `current_maturity_level` for Components, `spec_status` for Personas/Playbooks
- Drag a card between columns → optimistic update + write
- Card shows primary field, owner, due date, key chips, source/confidence pill
- Empty columns render with a soft "+ add" prompt

**Tab intuitiveness**
- Sidebar reordered into the operator groups already planned (Today · Capture · Queue · Relationships · Domains · Workflows · Library · Settings) — Library collapses Personas/Components/Playbooks/Documents/Decisions/Delegation/Sparks
- Each entity index gets: filter bar (status, owner, source), saved view memory in `localStorage`, and the new view switcher
- Per-entity sensible default view: Tasks/Quests/Sparks/Pipeline → Board; Documents/Components/Personas/Playbooks → Cards; everything else → Table

## Build order
1. **Fix** `workflows.functions.ts` + add Activate button on workflow detail
2. **Migration A**: storage bucket + `capture_attachments` + tag columns on `proposals` + tag columns on entity tables (`tagged_domains/tenets/components` where missing)
3. **Migration B**: wipe + reseed 22 domains, 22 tenets, default rubric items
4. **Capture upgrade**: file uploads, tag pickers, server function changes
5. **Queue upgrade**: render attachments + tags on cards, propagate on approve
6. **EntityWorkspace**: view switcher + Kanban board component (reusable, drag-and-drop via `@dnd-kit/core` — already common, add as dep)
7. **Sidebar regroup** + per-entity default view

## Two quick confirmations before I build

**Q1 — Domains/Tenets shape:** You said "22 domains and 22 tenets." Do you want:
- (a) **1 tenet per domain** (1:1 — simplest, scoring is per-domain)
- (b) **22 domains, 22 tenets distributed across them** (some domains have 2-3, others have 1) — if so, paste the list or point me at the Notion page and I'll fetch via MCP first

**Q2 — Domain/tenet names source:** Should I (a) draft the 22 from canon I've seen and you edit in Settings, or (b) pull from a specific Notion page (paste URL)?

Once you answer those two, I execute the build order top to bottom.
