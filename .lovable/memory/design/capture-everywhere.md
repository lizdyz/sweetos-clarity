---
name: Capture lives in the topbar
description: Single context-aware Capture button mounted in the topbar; auto-detects page kind+id from URL; reads entity_canon.capture_prompts; no per-page mounting
type: design
---

# Capture lives in the topbar

One Capture button, always visible in the topbar (`<TopbarCaptureButton/>` in `src/components/app-topbar.tsx`). It auto-detects the current page from the URL and pre-scopes the proposal — no page needs to mount its own button.

## How context detection works

`src/components/topbar-capture-button.tsx` parses `useLocation().pathname`:

| URL shape | Detected kind | Detected id |
|---|---|---|
| `/relationships/<uuid>` | `relationship` | `<uuid>` |
| `/projects/<uuid>` | `project` | `<uuid>` |
| `/relationships` (index) | `relationship` | `null` |
| `/today`, `/flightdeck`, `/sweetcycle`, … | surface name | `null` |
| anything else | `general` | `null` |

The mapping tables `SEG_TO_KIND` and `SURFACE_TO_KIND` mirror `ENTITY_KEY_TO_CANON_KIND` from `entity-workspace.tsx`. **Adding a new entity = add a row to both.**

## Canon-driven prompts

The popover reads `entity_canon.capture_prompts` for the detected kind and renders them as a checklist above the mic. Edit prompts in `/settings/canon` — no code change needed.

## Pollination pre-scoping

When a subject id is detected, `captureProposal` (in `src/utils/proposals.functions.ts`) pre-filters its quest/KTI match passes by `relationship_id`, raising signal.

## Hard rules

- **Never** mount a per-page capture button. The topbar covers every route.
- `<PageHeader>` no longer accepts `subjectKind` / `subjectId` — those props are deprecated and ignored.
- The retired component `src/components/page-capture-button.tsx` has been deleted.
- Mic-on-by-default. Browser SpeechRecognition only — no server-side STT in v1.
