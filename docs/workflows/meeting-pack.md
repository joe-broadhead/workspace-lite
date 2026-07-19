---
recipe: meeting-pack
title: Meeting Pack
outcome: A Drive folder containing a structured agenda/notes doc for a specific meeting, with an optional calendar event (created or linked), an optional draft agenda email, and an optional follow-up task list.
services: [calendar, drive, docs, gmail, tasks]
token_classes: [read, write, send]
status: ready
---

# Meeting Pack

All [shared guardrails](guardrails.md) apply. The core pack is **folder + doc**; the calendar event, agenda draft, and task list are optional extras that fail soft.

## Outcome

For one meeting, the workspace gains:

- a Drive folder `"<title> — <YYYY-MM-DD>"` (in a named parent folder, or My Drive root by default), never shared publicly;
- a Docs agenda/notes document inside it with sections **Attendees, Agenda, Notes, Decisions, Actions**, populated from the event and inputs;
- *(optional)* a calendar event — either an existing one located and confirmed, or a new one created from date/time inputs;
- *(optional)* a **draft** agenda email with the doc link — never sent by the recipe;
- *(optional)* a task list `"<title> follow-ups"` seeded from agenda/action items.

## Inputs

| Input | Type | Required | Default / bounds |
|---|---|---|---|
| `title` | string | yes | used for folder, doc, event, and task list names |
| `event` | event ID or title fragment to locate an existing event | no* | searched within `range`, `maxResults: 10` |
| `when` | date/time + timezone to create a new event | no* | duration defaults to 60 minutes |
| `range` | date range for locating `event` | no | next 14 days, max 60 days |
| `attendees` | email list | no | empty; on created events, adding guests is **gated** (invites may be emailed by Google) |
| `agenda` | bullets or source notes | no | empty — Agenda section left as headed placeholders |
| `parent_folder` | Drive folder name or ID | no | My Drive root; name is resolved via `drive_list_folders` and confirmed if ambiguous |
| `email_agenda` | boolean | no | `false`; `true` creates a **draft** only |
| `create_tasks` | boolean | no | `false` |

\* Provide `event` **or** `when`, not both. With neither, the pack is folder + doc only.

## Preflight

All read-only:

1. Services configured for the options requested (`wslite doctor` semantics): calendar only if `event`/`when` given, gmail only if `email_agenda`, tasks only if `create_tasks`. A missing optional service drops that extra with a note; missing drive/docs stops the recipe.
2. If `event`: resolve to exactly one event via `calendar_search_events` (query `title`, bounded by `range`, `maxResults: 10`), then `calendar_get_event` for attendees/description/conferencing. Ambiguity → present candidates (title, start time), never guess.
3. If `parent_folder` is a name: resolve via `drive_list_folders`/`drive_search_files`; multiple matches → present candidates with paths (`drive_get_folder_path`).
4. If `when`: parse date/time/timezone explicitly; reject past datetimes unless the user confirms retro-documentation.

## Steps

1. Gate A — present the resolved plan (event or new-event details, folder location, which extras run), get confirmation.
2. **[write]** `drive_create_folder` — `"<title> — <YYYY-MM-DD>"` under the resolved parent. Do not share it; creator-only access is the default and stays that way.
3. **[write]** `docs_create_document` — `"<title> — agenda & notes"`; then populate the sections Attendees (from event or `attendees`), Agenda (from `agenda`), Notes, Decisions, Actions. Prefer `docs_insert_paragraph`/`docs_insert_list` (plain writes); note that `docs_set_text` replaces the whole body and is therefore **destructive-gated even on a freshly created empty doc** — if you use it, it needs the destructive confirm, covered by Gate A only if you told the user.
4. **[write]** `drive_move_file` — move the doc into the folder (creation lands in My Drive root).
5. *(if `when`)* **[write]** `calendar_create_event` — title, start/end from `when`, description containing the folder and doc links, and always an explicit `sendUpdates` value: `"none"` for the default guestless creation. Adding `attendees` is Gate B: Google may email invites, so show the guest list *and* the `sendUpdates` choice (`all`/`none`) and get explicit confirmation first; on decline, create the event with no guests and note it.
6. *(if `event`)* **[write, Gate B']** `calendar_update_event` — append folder/doc links to the existing event's description. Mutates a user-owned artifact: capture the current description first (step 2 of preflight already fetched it) and show the exact change.
7. *(if `email_agenda`)* **[write]** `gmail_create_draft` — to `attendees` (or the user themselves if none), subject `"Agenda: <title>"`, body with agenda bullets and the doc link. Draft only; report its recipients. Any send happens outside the recipe under the standard send confirmation.
8. *(if `create_tasks`)* **[write]** `tasks_create_tasklist` `"<title> follow-ups"`, then `tasks_create_task` per agenda/action item (bounded by the input list; no auto-generated filler tasks).

## Confirmation gates

- **Gate A** (always): after preflight — resolved event or new-event plan, folder destination, and which optional extras will run.
- **Gate B** (created event with `attendees`): guest list shown; explicit confirmation because Google may send invite emails on creation.
- **Gate B′** (existing event): exact description edit shown before `calendar_update_event`.
- Drafts are reported, not gated — creating a draft sends nothing. Sending is out of scope and would carry its own confirmation.
- Public sharing is never offered: `drive_set_sharing` to `anyone` is outside this recipe regardless of prompt phrasing (server-side `ALLOW_PUBLIC_DRIVE_SHARING` guard backs this).

## Partial failure

- Folder created, doc failed: retry doc creation once; if it still fails, report the folder link and stop. Do not trash the folder unprompted — the user may want to keep it.
- Doc created but move (step 4) failed: retry once; else report the doc's actual location so nothing is "lost".
- Event create/update failed: the core pack stands; report the error (with correlationId) and continue to remaining extras.
- Draft or task list failed: report and continue — extras never abort the pack.
- Rate limiting (`RATE_LIMITED`): wait ~60s and retry the failed step once; if still limited, report which steps remain undone.

## Cleanup and rollback

Everything the recipe creates is new, so rollback is complete:

- folder + doc: `drive_trash_file` (trash, recoverable — deletes are trash-only by design);
- created event: `calendar_delete_event` (**gated destructive**);
- description edit on an existing event: restore the captured pre-edit description via `calendar_update_event`;
- draft: `gmail_delete_draft`;
- task list: `tasks_delete_tasklist` (**gated destructive**; deleted lists may linger in listings briefly — verify with `tasks_get_tasklist` returning NOT_FOUND).

## Validation checklist

- Folder exists (`drive_get_folder`), contains exactly the notes doc (`drive_list_files` on the folder), and its permissions show no public access (`drive_get_permissions`).
- Doc opens with all five sections (`docs_get_document`).
- If an event was created/updated: description contains both links; guest list matches what Gate B approved (`calendar_get_event`).
- If a draft exists: recipients match the reported list; nothing in Sent (`gmail_list_drafts` / absence of a send in the run).
- Final report lists every artifact with ID + link, plus every skipped/failed step.

## Example prompt

> "Put together a meeting pack for a 'Q3 roadmap review' next Thursday 14:00–15:00 CET — agenda: budget carryover, hiring plan, launch dates. Draft the agenda email to the team but don't send it, and give me follow-up tasks."

Expected final response shape:

> Created the Q3 roadmap review pack:
> **Folder** "Q3 roadmap review — 2026-07-23" (link) — private, in My Drive
> **Doc** "Q3 roadmap review — agenda & notes" (link) — Attendees/Agenda/Notes/Decisions/Actions, agenda filled with your 3 items
> **Event** Thu 2026-07-23 14:00–15:00 CET (link) — description links the folder and doc; created without guests (you didn't confirm a guest list)
> **Draft** "Agenda: Q3 roadmap review" to a@…, b@… — sitting in Drafts, not sent
> **Tasks** "Q3 roadmap review follow-ups": 3 tasks from the agenda
> Nothing was shared or sent. To undo: trash the folder, delete the event and task list, discard the draft.
