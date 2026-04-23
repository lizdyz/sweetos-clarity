---
name: Capture lives in the page header
description: Every entity detail page mounts a one-click capture button that knows what to ask for, scoped to the page's subject
type: design
---
- The PageHeader (and EntityDetail header) accept `subjectKind` + `subjectId` + `subjectLabel`. When set, `<PageCaptureButton>` mounts automatically.
- Talking points are NOT page-invented — they come from `entity_canon.capture_prompts[]` for the kind. Edit them at `/settings/canon`.
- Captures land in `proposals` carrying `subject_kind`, `subject_id`, `source_page`. The pollination pipeline pre-scopes its match passes (Quests, KTIs, etc.) using `subject_id` when the kind is `relationship`.
- Mic-on-by-default. Browser SpeechRecognition only — no server-side STT in v1.
- Never add per-page custom capture flows; always go through `<PageCaptureButton>`.
