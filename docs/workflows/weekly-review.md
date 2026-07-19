---
recipe: weekly-review
title: Weekly Review
outcome: A new Docs weekly review summarizing calendar events, task state, and optionally recently modified Drive files and user-approved Gmail results for one bounded week, with optional follow-up tasks.
services: [calendar, tasks, drive, docs, gmail]
token_classes: [read, write]
status: ready
---

# Weekly Review

All [shared guardrails](guardrails.md) apply. This recipe is read-heavy and low-risk by design: it reads bounded slices of calendar, tasks, and (optionally) drive and gmail, and its only mutations are creating the review doc and optional follow-up tasks. It never sends anything and never edits existing events, messages, or files.

## Outcome

A new Docs document `"Weekly review — <start> to <end>"` (in My Drive root or a named output folder) with sections **Highlights, Meetings, Tasks, Files, Follow-ups, Skipped sources** — plus, if requested, follow-up tasks created from the Follow-ups section. Existing artifacts are untouched.

## Inputs

| Input | Type | Required | Default / bounds |
|---|---|---|---|
| `range` | date range | no | previous work week (Mon–Sun); maximum 31 days — longer ranges are refused, not truncated silently |
| `include` | subset of `calendar, tasks, drive, gmail` | no | `calendar, tasks`; drive and gmail are opt-in |
| `output_folder` | Drive folder name or ID | no | My Drive root; name resolved and confirmed if ambiguous |
| `gmail_query` | Gmail search query | only if `gmail` included | no default — the user must supply or approve the exact query; the recipe adds `after:/before:` bounds from `range` and `maxResults: 25` |
| `drive_query` | Drive search terms | no | default is modified-in-range only (`modifiedTime` bounds), `maxResults: 25` |
| `create_followups` | boolean | no | `false`; tasks are created from the doc's Follow-ups section |

## Preflight

All read-only:

1. Services configured for the requested `include` set (`wslite doctor` semantics); docs and drive are always required (the output is a doc). A requested-but-unconfigured source is dropped into **Skipped sources**, not guessed at.
2. Resolve `range` to concrete dates and echo them; refuse ranges over 31 days.
3. If `gmail` is included: show the exact final query (user query + date bounds + cap) and get approval **before any Gmail call**. No approved query, no Gmail reads.
4. Resolve `output_folder` if given; ambiguity → candidates with paths.

## Steps

1. Gate A — echo the resolved plan: dates, included sources, output location, whether follow-up tasks will be created.
2. `calendar_list_events` — bounded by `range`, `maxResults: 50`. Carry forward: title, start, attendee count (not attendee emails unless the user asked for them in the review).
3. `tasks_list_tasklists` (`maxResults: 20`), then `tasks_list_tasks` per list with `showCompleted: true` — split completed-in-range vs still open. Skip lists the user names as out of scope.
4. *(if `drive` included)* `drive_search_files` — `modifiedTime` bounded by `range` plus `drive_query` terms, `maxResults: 25`. Metadata only (name, type, modified time); file *content* is read only if the user explicitly asks for depth on named files.
5. *(if `gmail` included)* `gmail_search_messages` — exactly the approved query, `maxResults: 25`. Subjects/senders/dates only; message bodies only for messages the user names.
6. **[write]** `docs_create_document` `"Weekly review — <start> to <end>"`, populate with `docs_insert_paragraph`/`docs_insert_list` (plain writes — avoid the destructive-gated `docs_set_text`): Highlights (3–5 synthesized bullets), Meetings (from step 2), Tasks (completed / open), Files (step 4 or "not included"), Follow-ups (proposed, clearly marked as proposals), Skipped sources (anything dropped in preflight or failed mid-run, with the reason).
7. **[write]** `drive_move_file` — into `output_folder` if one was resolved.
8. *(if `create_followups`)* Gate B — show the proposed follow-up list; then `tasks_create_tasklist` `"Weekly review follow-ups — <start>"` + `tasks_create_task` per approved item. Only items the user approved; no auto-generated extras.

## Confirmation gates

- **Gate A** (always): resolved dates, sources, output location — before any bulk reads.
- **Gmail query approval** (preflight 3): the exact query string, its date bounds, and cap; re-approval required if the agent wants to broaden it mid-run.
- **Gate B** (only with `create_followups`): the exact tasks to create.
- Creating and moving the review doc is reported, not gated — it is a new artifact in a location the user confirmed at Gate A.

## Partial failure

- A source read fails (calendar/tasks/drive/gmail): record it under **Skipped sources** with the error code and continue — a review with a gap beats no review. Rate limits: wait ~60s, retry once, then skip with a note.
- Doc creation fails: nothing else is attempted (the doc is the product); report the error with correlationId.
- Move (step 7) fails: retry once, else report the doc's actual location.
- Follow-up task creation partially fails: report which tasks were created and which failed; do not retry past Gate B without telling the user.

## Cleanup and rollback

The recipe creates at most a doc and a follow-up task list, both new: `drive_trash_file` the doc (trash, recoverable); `tasks_delete_tasklist` the follow-ups list (**gated destructive**; verify with `tasks_get_tasklist` → NOT_FOUND). Nothing else was mutated, so there is nothing else to roll back.

## Validation checklist

- Doc exists with all six sections, dates in the title match the approved range (`docs_get_document`).
- Doc is in the confirmed location (`drive_get_folder_path` on its parent) and not shared (`drive_get_permissions` → PRIVATE).
- Every included source appears in the doc; every dropped source appears under Skipped sources with a reason.
- If Gmail ran: the transcript shows the approved query and no broader call.
- If follow-ups ran: created tasks match Gate B's approved list exactly.
- Final report: doc link, source counts (N events, N tasks, N files, N messages), skipped sources, tasks created.

## Example prompt

> "Do my weekly review for last week. Include drive changes; skip email. Put it in my 'Reviews' folder and create follow-up tasks."

Expected final response shape:

> Weekly review for 2026-07-13 → 2026-07-19 is ready (doc link, in Reviews):
> **Meetings** 6 events summarized · **Tasks** 4 completed, 7 open · **Files** 5 modified files listed · **Gmail** skipped (per your request)
> **Follow-ups**: created 3 tasks in "Weekly review follow-ups — 2026-07-13" — the ones you approved.
> Nothing existing was modified; the doc is private. To undo: trash the doc, delete the follow-ups list.
