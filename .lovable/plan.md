

# Wave 17 — Smart Ingestion: bulk import that thinks

A dedicated ingestion area that turns "drop a folder of Notion exports" into a guided conversation: detect → group → propose → clarify only where it matters → map → flag missing schema → import → learn. Lives alongside Capture (single-thought) and Vault (final files). This is the new front door for migrating Notion (or anything else) into SweetOS.

## Where it lives

New sidebar entry under **Today**: `Capture` (existing) gets a sibling **Import** (`/import`).

```text
Today
  ├─ Start
  ├─ Today
  ├─ Calendar
  ├─ Capture          ← single thoughts (existing)
  └─ Import           ← bulk file ingestion (new)
```

Capture stays for one-off drops. Import is for batches of 5–500 files where classification, grouping, and schema discovery are the value.

## The flow (six steps, one route, sequential reveal)

```text
/import
  1 Upload      drop / pick files → uploaded into 'ingestion' bucket
  2 Analysis    parse, group, classify → propose object types
  3 Mapping     review per-file mapping; bulk-edit by group
  4 Schema      review suggested new fields & object types
  5 Import      run the import, watch results stream
  6 Results     what landed, what was skipped, what to follow up
```

A persistent stepper at the top shows progress. Steps 2-4 can be re-entered until the user clicks Run.

## Data model

Eight new tables. All scoped per ingestion_run; nothing pollutes existing entities until step 5.

```sql
ingestion_runs               -- one per upload batch; status: draft|analyzing|review|importing|complete
ingestion_files              -- raw uploaded files: storage_path, filename, mime, size, sha256, parsed_text, structure_json
ingestion_file_groups        -- "these 14 files look the same" — heading_pattern, column_signature, sample_count
ingestion_classifications    -- per-file proposal: target_object_type, target_table, confidence, rationale, status (proposed|approved|excluded|needs_review)
ingestion_schema_suggestions -- "this column has no home": column_name, sample_values, suggested_type, suggested_destination, status
ingestion_object_suggestions -- "this looks like a NEW object type we don't model yet": proposed_name, evidence_files[], suggested_fields[]
ingestion_mapping_rules      -- learned aliases: pattern (column_name regex / heading regex / filename regex) → target_field, scope (global|per_run), hit_count
ingestion_results            -- per-file outcome: created_entity_kind, created_entity_id, status (created|updated|skipped|failed), notes
```

Plus a tiny lookup: `ingestion_object_registry` — the canonical list of importable object types (component, journey, persona, prompt, workflow_template, document, etc.) with their target tables and required fields. Seeded from the existing entity canon.

## Classification engine (placeholder-smart, AI-ready)

A single edge function `analyze-ingestion-batch` that runs after upload. v1 logic, deterministic and visible — no fake-AI hand-waving:

1. **File-type detection** — extension + magic bytes.
2. **Structure parse** — `.md` → headings/frontmatter; `.csv` → header row + 5 sample rows; `.json` → top-level keys; `.txt` → first 200 chars.
3. **Signature** — hash of (extension + heading-pattern OR column-set). Files with identical signatures group automatically.
4. **Type proposal per group** — rules table:
   - `frontmatter has "stage" + "owner"` → likely **Journey/Quest**
   - `H1 + ## "Inputs" + ## "Outputs"` → likely **Component**
   - `H1 + "Prompt:" + "Variables:"` → likely **Prompt template**
   - CSV header containing `name,description,domain,maturity` → likely **Components table**
   - CSV header containing `from,to,kind` → likely **Relationships table**
   - else → **Unknown / needs review** (never force-fit)
5. **Field matching** — column/key names matched against existing field names + learned `ingestion_mapping_rules` aliases.
6. **Schema suggestions** — any column/frontmatter key that didn't match goes into `ingestion_schema_suggestions` with sample values and a guessed type.
7. **New-object detection** — if a group has a coherent shape but no rule matched, write to `ingestion_object_suggestions` with the proposed fields.

Confidence is a real number (0-1) derived from rule strength + alias hits, not a vibe. Lovable AI (`google/gemini-2.5-flash`) is called only as a tiebreaker on ambiguous groups, and the prompt is editable in `/settings/prompts` like the rest.

## The six screens

### 1. Upload
Full-page dropzone (much larger than current FileDrop), supports folder drag, shows upload queue with per-file progress, sha256 dedupe (skip files we've already imported in any prior run).

### 2. Analysis
Left rail: groups, sorted by count. Right pane: group detail card showing file count, detected pattern, sample preview (first markdown headings or first CSV rows), proposed object type with confidence bar, and the rationale ("Matched: H1 + ## Inputs + ## Outputs"). Group-level actions: **Approve all**, **Change type for group**, **Split group**, **Exclude**.

### 3. Mapping Review
Table view, one row per file. Columns: filename · group · proposed type · destination · field-match summary (e.g. "8/10 mapped, 2 unmatched") · status chip · row-action menu. Inline edit per row. Bulk-select to reassign type or destination. Filters: by status, by group, by confidence.

### 4. Schema Suggestions
Two stacked cards:
- **Suggested new fields** — table of unmatched columns/keys with: source column · sample values · guessed type (text/number/date/enum/uuid-ref) · suggested destination table · approve/skip/rename. Approving writes a real migration via the migration tool (with explicit user confirmation).
- **Suggested new object types** — cards showing "We see ~14 files that look like {proposed_name} — they share fields {a, b, c}. We don't have an object for this. Create as new entity, map to existing X, or ignore?"

### 5. Import (run)
Big "Run import" button. Live progress strip with counts: created · updated · skipped · failed. Streams `ingestion_results` rows as they complete. Cancel button stops between files.

### 6. Results
Summary header (X created, Y updated, Z skipped, N follow-ups). Below: filterable table of every file with its outcome and a link to the created entity. Three follow-up CTAs:
- "Save as recipe" — persists the type/field decisions as `ingestion_mapping_rules` scoped global, so the next batch with the same shape skips review entirely.
- "Open Schema Suggestions" — anything deferred from step 4.
- "Open new entity proposals" — anything deferred from step 4 that needs design work.

## Learning (lightweight, visible)

Every approval in steps 2-4 writes a row to `ingestion_mapping_rules` with `hit_count=1`. Re-runs increment. The Analysis step always shows learned rules at the top of the group card ("Matched 3 saved rules · skipping ahead"). Rules are listed and editable on a small **Saved Rules** tab on `/import` so the user can prune them.

No black-box "AI learned" claims. Just visible, editable rules.

## UI language and feel

- Calm, structured cards. No walls of text — the value is the right question at the right moment.
- Confidence shown as a thin bar + percentage, not a vague label.
- Ambiguity is a first-class state — `needs_review` items have their own muted color and never auto-import.
- Copy: "We grouped 14 files that look like Journeys. Approve, or split them." Not "AI detected…"
- The header chip on every screen reads: **Run · 47 files · 6 groups · 2 schema suggestions · 1 new object proposal**.

## Files

**Migration:**
- 8 new tables above + storage bucket `ingestion` (private)
- Seed `ingestion_object_registry` with current entity canon

**New route:**
- `src/routes/_app.import.tsx` — top-level page with stepper + sub-views

**New components:**
- `src/components/import/import-stepper.tsx`
- `src/components/import/upload-dropzone.tsx` — folder-aware large drop area
- `src/components/import/group-card.tsx` — group preview + proposed type
- `src/components/import/file-mapping-row.tsx`
- `src/components/import/schema-suggestion-card.tsx`
- `src/components/import/object-suggestion-card.tsx`
- `src/components/import/run-progress-strip.tsx`
- `src/components/import/results-table.tsx`
- `src/components/import/saved-rules-panel.tsx`

**New server:**
- `supabase/functions/analyze-ingestion-batch/index.ts` — parse, group, classify, suggest
- `supabase/functions/run-ingestion-import/index.ts` — execute approved mappings, stream results
- `src/utils/ingestion.functions.ts` — server fns: `createRun`, `uploadFiles`, `analyzeRun`, `approveGroup`, `updateClassification`, `approveSchemaSuggestion`, `runImport`

**Edited:**
- `src/components/sidebar-nav.tsx` — add `Import` under Today
- `supabase/config.toml` — register the two functions (default verify_jwt)

**Memory:**
- `mem://design/smart-ingestion.md` — the rules: never force-fit, ambiguity is a state, learning is visible, schema gaps are a feature

## Sequencing

1. Migrations + bucket + object registry seed (~15%)
2. Upload screen + file storage + sha256 dedupe (~15%)
3. `analyze-ingestion-batch` function: parse, group, deterministic rules, schema suggestions (~25%)
4. Analysis + Mapping Review screens (~20%)
5. Schema + new-object suggestion screens with approval → migration generation (~15%)
6. `run-ingestion-import` function + Results screen + Saved Rules (~10%)

## Not in this wave

- No PDF/image OCR — text-based formats only (md, csv, txt, json). PDFs land in Vault as before.
- No automatic schema migrations — every new field is a one-click confirmation that goes through the migration tool with user approval.
- No multi-user collaboration on a run — single-operator for v1.
- No Notion API direct connect — explicitly file-based, because the user is exporting from Notion already.

## After Wave 17

A user can drop their entire Notion export, walk through 6 calm screens, approve groups in bulk, see exactly what schema is missing, and end with a populated SweetOS plus a list of "here's what your Notion has that we don't model yet — do you want to model it?" Future imports of the same shape skip 80% of the review because of saved rules.

Reply **"Run Wave 17"** to ship in this order, or **"Just upload + analysis first"** to land the front half before mapping/schema work.

