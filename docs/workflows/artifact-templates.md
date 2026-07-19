# Artifact Templates

Template guidance for the Docs, Sheets, and Slides artifacts that workflows and ad-hoc requests produce. The goal is artifacts that are consistent, readable, and usable as-is — not minimally valid files. These are instructions for agents composing existing catalog tools; there are no binary template files, and templates always create **new** artifacts (the [shared guardrails](guardrails.md) apply, including create-don't-mutate).

## Shared rules

- **Right-sized, not exhaustive.** Every template below fits in one bounded creation sequence (≤ ~20 tool calls). If content would push past a template's stated size, summarize and link out instead of growing the artifact — large generated artifacts are fragile and unreviewable.
- **Docs**: build with `docs_create_document` + `docs_insert_paragraph` (headings via `heading: HEADING1/2`) and `docs_insert_list` — plain writes. `docs_set_text` replaces the whole body and is destructive-gated even on a fresh doc; avoid it in templates.
- **Sheets**: `sheets_create_spreadsheet` → `sheets_write_range` (header row first) → `sheets_format_range` (bold header) → `sheets_freeze_rows` (row 1) → `sheets_set_column_width` for wordy columns. Data as rows, one entity per row, no merged cells in data ranges.
- **Slides**: `slides_create_presentation` → `slides_add_slide` per slide, passing `titleText` and `bodyText` directly (one call per slide); reach for `slides_insert_text_box` only for *additional* boxes beyond title/body. One idea per slide, ≤ 6 bullets per slide, no images unless the user supplies URLs (host allowlist applies).
- **Naming**: `"<Topic> — <artifact kind>"`, dates as `YYYY-MM-DD`. Dogfood/test artifacts carry a disposable prefix and are trashed after verification (`drive_trash_file`; deletes are trash-first).
- **Placement**: create, then `drive_move_file` into the requested folder; report the final location and link.

## Docs templates

### Meeting notes

- **Use**: notes doc for one meeting (the [Meeting Pack](meeting-pack.md) artifact).
- **Structure**: H1 sections `Attendees`, `Agenda`, `Notes`, `Decisions`, `Actions`; attendees/agenda pre-filled from inputs, the rest as short placeholders.
- **Style**: agenda as a bulleted list (`docs_insert_list`); actions written `Owner: action — due date` so they can later become tasks one-per-line.

### Weekly review

- **Use**: the [Weekly Review](weekly-review.md) output artifact.
- **Structure**: H1 sections `Highlights`, `Meetings`, `Tasks`, `Files`, `Follow-ups`, `Skipped sources`.
- **Style**: highlights 3–5 synthesized bullets; per-source sections lead with counts ("6 events", "4 completed / 7 open"); every skipped source states its reason. Cap listed items at 25 per section, summarizing the tail.

### Project brief

- **Use**: one-page brief for starting or pitching a piece of work.
- **Structure**: H1 sections `Problem`, `Goal`, `Approach`, `Scope` (with an explicit `Out of scope` list), `Risks`, `Timeline`, `Owners`.
- **Style**: one short paragraph or ≤5-bullet list per section; timeline as `YYYY-MM-DD — milestone` lines. If the brief exceeds ~2 pages of content, cut detail into a linked doc rather than growing it.

### Decision memo

- **Use**: recording one decision with its context, so it can be linked from threads and reviews.
- **Structure**: H1 sections `Decision` (one sentence, first), `Context`, `Options considered` (each with a one-line why-not), `Consequences`, `Revisit when`.
- **Style**: the decision sentence stands alone before any rationale; options as a list, never tables; date and deciders in the `Decision` section.

## Sheets templates

### Project tracker

- **Use**: lightweight work tracking for one project.
- **Structure**: header `Item | Owner | Status | Due | Notes`; one sheet named `Tracker` (`sheets_rename_sheet`). Status values kept to a fixed short set (`todo / doing / blocked / done`) — optionally enforced with `sheets_set_data_validation` on the Status column.
- **Sequence**: create → write header + seed rows in one `sheets_write_range` call → bold + freeze header → widen `Item`/`Notes`.
- **Style**: no formulas in seed data; ≤ 50 seeded rows — a tracker starts small. Write dates as `YYYY-MM-DD` strings; Sheets coerces them to date cells (reads return ISO timestamps — expected, not corruption).

### Decision log

- **Use**: running log the decision-memo docs link into.
- **Structure**: header `Date | Decision | Memo link | Owner | Status`; newest row appended last (`sheets_append_rows`).
- **Style**: `Decision` is the memo's one-sentence decision verbatim; `Memo link` holds the doc URL; no wrapping-heavy prose columns beyond those two.

### KPI / status tracker

- **Use**: a handful of metrics tracked over time.
- **Structure**: header `Metric | Unit | Target` + one column per period (`2026-07`, `2026-08`, …); metrics as rows so periods extend rightward with `sheets_write_range` on new columns.
- **Style**: ≤ 15 metric rows; numbers unformatted (no currency strings — use the `Unit` column); freeze both row 1 and column A when periods exceed a screen (`sheets_freeze_rows`; note column freezing is not in the catalog — keep metric names short instead).

## Slides templates

### Status deck

- **Use**: short recurring status update (the deck counterpart of a weekly review).
- **Structure**: 4–6 slides — `Title` (topic + date), `Highlights`, `Progress`, `Risks / blockers`, `Next steps`, optional `Asks`.
- **Sequence**: create (title slide from `slides_create_presentation`) → one `slides_add_slide` per section with `titleText` + `bodyText` (newline-separated bullets).
- **Style**: ≤ 6 bullets per slide, one line each; no per-element styling beyond the defaults — content over decoration.

### Project kickoff deck

- **Use**: presenting a project brief to its stakeholders.
- **Structure**: 6–8 slides mirroring the project-brief doc: `Title`, `Problem`, `Goal`, `Approach`, `Scope / out of scope`, `Timeline`, `Owners`, optional `Asks`. Slide content is the brief's bullets, not new prose — the doc stays the source of truth and the deck links to it on the title slide.

### Doc-to-deck outline

- **Use**: turning any structured doc (H1 sections) into a presentable outline deck.
- **Sequence**: `docs_get_document` → one slide per H1 section (`Title` slide + section slides), each body listing that section's key bullets (≤ 6; summarize beyond that) → final `Source` slide linking the doc.
- **Style**: never paste paragraphs onto slides — compress to bullets; skip empty sections rather than emitting placeholder slides; cap at 12 slides regardless of doc length and say so on the Source slide when sections were merged.

## Dogfood guidance

Exercise a template by creating a disposable artifact (prefixed, e.g. `wslite-template-e2e …`), verifying structure via the service's read tools (`docs_get_document`, `sheets_read_range`, `slides_get_presentation`) and `drive_get_permissions` (expect `PRIVATE`), then trashing it (`drive_trash_file`). Template changes that alter structure should be re-dogfooded once before merging.
