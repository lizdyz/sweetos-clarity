

# Wave 18 (revised) — Harden ingestion first, then make it smart

You're right — I over-indexed on zip. Drop it from this wave. The real ask: prove the existing 6-step flow actually works end-to-end with `.md`, `.csv`, `.json`, `.txt`, then layer on the five intelligence features (conflicts, recipes, lineage, chunked analysis, JSON schema inference). Zip can come later once the foundation is trustworthy.

## Stage 1 — Validate and harden what Wave 17 shipped

Before adding anything, prove the current flow works on real files. This is a test pass with surgical fixes, not new features.

- **End-to-end smoke test** with a small mixed batch (3 md, 3 csv, 1 json, 1 txt) — walk all 6 steps, confirm: upload → analyze → mapping → schema → import → results all reach the next step without errors.
- **Fix whatever breaks**, with priority on:
  - File parsing edge cases (BOM in CSV, empty files, malformed JSON, frontmatter-only md)
  - Group signature collisions (two unrelated csvs with same header count)
  - Classification falling back to `needs_review` cleanly when no rule matches (never silently force-fit)
  - The Run import step actually writing rows to the target tables
- **Add visible failure states** on every step — today some errors fail silently. Each step gets an inline error card showing what failed and a "retry this step" button.
- **Add a `Test with sample batch` button** on the empty Upload screen that loads 6 fixture files from the repo so the user can see the full flow without preparing data.

## Stage 2 — The five intelligence features

Built in this order because each one builds on the previous:

### A. Chunked analysis (foundation — fixes large-batch UX first)

Today `analyzeRun` walks every file in one server call and freezes the UI for batches over ~30 files.

- Split into orchestration + worker:
  - `analyzeRun({ runId })` marks run `analyzing`, returns immediately with `total` and `chunkSize`.
  - `analyzeChunk({ runId, offset, limit })` processes 25 files at a time, updates `ingestion_runs.analyzed_file_count`, returns `{ done, nextOffset }`.
- Client polls `analyzeChunk` in a loop, updating an honest progress bar: `47 / 200 files analyzed · current group: Components`.
- New columns: `ingestion_runs.analyzed_file_count int default 0` + `analysis_total int`.

### B. Data lineage (visible across Mapping, Schema, Results)

- New columns: `ingestion_files.source_path text` (the original filename/path the user sent) — already partially captured but not surfaced.
- `<LineageStrip>` component — expandable chevron on every `FileMappingRow` and every results row showing:
  - **Source**: filename + size + sha256 (first 12 chars)
  - **Group**: which signature it joined and why (e.g. "matched H1 + ## Inputs + ## Outputs")
  - **Mapping**: which rule fired (alias / signature match / field overlap / manual override)
  - **Destination**: target table + target id (after import) with a deep link to the created entity
- The same strip mounts on the Results page so a user can audit "where did this component come from?" months later.

### C. Conflict detection (new step between Mapping and Schema)

The biggest data-integrity gap today: nothing checks whether `components.name = 'Auth Service'` already exists before importing one with the same name.

- New table `ingestion_conflicts` (file_id, target_table, existing_entity_id, conflict_kind, proposed_resolution, status, resolution_notes).
- New column `ingestion_object_registry.conflict_key_fields text[]` — seeded per object type (components: `[name]`, journeys: `[name, relationship_id]`, etc.).
- New server fn `detectConflicts({ runId })` runs after Mapping is approved. For each classification, queries the target table by its `conflict_key_fields` and writes any matches to `ingestion_conflicts`.
- New step in `<ImportStepper>`: **Conflicts** (only appears if conflicts exist).
- New `<ConflictCard>` per conflict shows existing vs incoming side-by-side with 4-way resolver: `create_new` · `update_existing` · `skip` · `merge`. Default = `needs_review` — never silently overwrite.

### D. JSON schema inference (extends current JSON parsing)

Today `parseJson` only reads the top-level keys of the first record.

- Walk up to 50 sample records per file, union their key sets.
- Infer per-key type: `string` | `number` | `boolean` | `array<T>` | `object` | `nullable<T>`.
- Detect nested objects → propose as candidate sub-schemas in `ingestion_schema_suggestions`.
- Detect array-of-objects → propose as candidate child-table relationships in `ingestion_object_suggestions` ("This `comments` field looks like a one-to-many — should it become a `document_comments` table?").
- Same UI surfaces — just better content flowing into them.

### E. Saved recipes (last, because it depends on everything above being stable)

A "recipe" snapshots the full set of decisions for a run so the next batch with the same shape skips review.

- New table `ingestion_recipes` (id, name, description, signature_set jsonb, field_aliases jsonb, conflict_defaults jsonb, hit_count, created_by).
- After Results, **Save as recipe** dialog (name + description) snapshots the run's decisions.
- On a new run's Analysis step, score each saved recipe against current group signatures. If ≥75% of groups match, surface a **Recipe match banner**: "Notion components export — 12/14 groups match. Apply recipe?" One click pre-approves matching groups.
- New `<RecipesPanel>` (sibling to the existing `SavedRulesPanel`) lists saved recipes with hit counts and a delete action.

## Stage 3 — Sprawl guardrails (small but mandatory)

Even with everything above, schema suggestions can explode. Two cheap guards:

- Before showing a schema suggestion, fuzzy-check `information_schema.columns` for the target table. If a column with edit-distance ≤2 exists, mark the suggestion `likely_alias_of: <existing_column>` and pre-fill rename input.
- New columns: `ingestion_schema_suggestions.likely_alias_of text` + `low_value boolean default false` (flagged when a suggestion comes from only one file).
- Cap at 30 new field suggestions and 5 new object type suggestions per run; remainder hidden behind a "Show all" toggle.

## Files

**Migration (one new):**
- New table `ingestion_conflicts`
- New table `ingestion_recipes`
- New columns: `ingestion_files.source_path`, `ingestion_runs.analyzed_file_count`, `ingestion_runs.analysis_total`, `ingestion_object_registry.conflict_key_fields`, `ingestion_schema_suggestions.likely_alias_of`, `ingestion_schema_suggestions.low_value`, `ingestion_object_suggestions.likely_alias_of`
- Seed `conflict_key_fields` for known object types

**Edited:**
- `src/utils/ingestion.server.ts` — improved JSON inference, sprawl guards, lineage threading
- `src/utils/ingestion.functions.ts` — split `analyzeRun` into orchestrate + `analyzeChunk`; add `detectConflicts`, `resolveConflict`, `saveRecipe`, `applyRecipe`, `listRecipes`, `runSampleBatch`
- `src/routes/_app.import.tsx` — chunked-analysis polling loop with progress, new Conflicts step, recipe match banner on Analysis, Save-as-recipe on Results, sample batch button on Upload, inline error cards on every step
- `src/components/import/import-stepper.tsx` — add Conflicts step
- `src/components/import/file-mapping-row.tsx` — lineage chevron
- `src/components/import/results-table.tsx` — lineage chevron
- `src/components/import/upload-dropzone.tsx` — sample batch button + clearer per-file error states

**New components:**
- `src/components/import/lineage-strip.tsx`
- `src/components/import/conflict-card.tsx`
- `src/components/import/recipe-match-banner.tsx`
- `src/components/import/save-recipe-dialog.tsx`
- `src/components/import/recipes-panel.tsx`
- `src/components/import/analysis-progress.tsx` — dedicated progress bar component for chunked analysis

**Fixtures (for the sample batch):**
- `src/fixtures/ingestion-sample/` — 6 small files (2 md components, 2 csv rows, 1 json schema, 1 prompt md) bundled into the app

**Memory:**
- Update `mem://design/smart-ingestion.md` with: chunked analysis is mandatory for batches >25, conflicts are a first-class state, recipes are run-level decisions, lineage is always one chevron away, sprawl guards cap suggestions.

## Sequencing

1. **Stage 1 — validate & harden** (~15%): smoke test, fix breakage, sample batch button, visible failure states
2. **Migration**: tables + columns + registry seed (~5%)
3. **Chunked analysis** + progress bar (~15%)
4. **Lineage strip** wired into Mapping + Results (~10%)
5. **Conflict detection** + Conflicts step + resolver UI (~20%)
6. **JSON schema inference** improvements (~10%)
7. **Recipes**: save, list, match-on-analysis, apply (~20%)
8. **Sprawl guardrails** (~5%)

## Not in this wave

- **No zip support.** Deliberately deferred until the per-file flow is rock-solid. The Lovable chat input handles individual files fine; that's enough for testing.
- No PDF/image OCR — text only.
- No automatic schema migration execution — approving a schema suggestion still goes through the migration tool with explicit confirmation.
- No semantic dedupe (vector similarity) for conflicts — name + slug + edit-distance only.
- No background job queue — chunked analysis runs in the user's browser session; closing the tab pauses at the last completed chunk and resumes on return.

## After this wave

A user uploads 8 mixed files via the chat or the Upload screen. The system processes them in 25-file chunks with a real progress bar. Every file shows its lineage one click away. Before import, the system flags 2 components that already exist with a clear resolver. JSON files reveal hidden sub-schemas. After import, the user saves the run as a recipe so the next batch skips 80% of the review. Schema suggestions are deduplicated against existing columns and capped so the review stays human-scale. Then — and only then — we add zip support in a follow-up wave.

