---
name: Smart Ingestion (bulk import that thinks)
description: Architectural rules for the /import flow — never force-fit, ambiguity is a state, learning is visible
type: design
---

The /import area is a guided 7-step flow: Upload → Analysis → Mapping → Conflicts → Schema → Import → Results. Rules:

1. **Never force-fit.** A file with no rule match becomes `needs_review`, never silently mapped to the closest type. Unknown is a first-class state with its own muted color.
2. **Ambiguity is visible.** Confidence is a real 0-1 number with a thin bar + percentage; never a vague label. Anything <0.5 needs review.
3. **Schema gaps are a feature, not a failure.** Unmatched columns/keys become `ingestion_schema_suggestions` with sample values and a guessed type. Unknown coherent shapes become `ingestion_object_suggestions`.
4. **Learning is visible.** Approvals write rows into `ingestion_mapping_rules` (per-user). The Saved Rules tab on /import lists and lets the user delete them. No black-box "AI learned" claims.
5. **Conflicts are first-class.** Before any write, every approved classification is checked against the target table by `ingestion_object_registry.conflict_key_fields`. Matches land in `ingestion_conflicts` with `proposed_resolution = needs_review` by default — never silently overwrite.
6. **Recipes are run-level decisions.** A run can be saved as an `ingestion_recipes` row (signature_set + field_aliases + conflict_defaults). On a new run's Analysis step, recipes are scored against current group signatures; ≥75% match surfaces a one-click "Apply recipe" banner.
7. **Lineage is always one chevron away.** Every file row (Mapping + Results) has an expandable `<LineageStrip>` showing source, group, mapping rule, and destination entity.
8. **Chunked analysis is mandatory for batches >25.** `analyzeRun` orchestrates only; `analyzeChunk(offset, limit)` does the work. Client polls and shows honest progress.
9. **Sprawl guards.** Schema suggestions fuzzy-match existing columns and surface as `likely_alias_of` with a pre-filled rename. Single-file suggestions are flagged `low_value`. Caps: 30 new fields, 5 new object types per run; remainder hidden behind a Show-all toggle.
10. **Nothing pollutes existing entities until step 6.** All run state lives in the `ingestion_*` tables; only "Run import" performs writes against `components`, `journeys`, etc.
11. **Text only in v1.** md, csv, json, txt. PDFs and images stay out of /import (they belong in Vault/Capture). Zip is deliberately deferred until per-file is rock-solid.
12. **Capture vs Import.** Capture = single thoughts. Import = batches of 5-500 where classification, grouping, and schema discovery are the value.
