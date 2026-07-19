---
recipe: meeting-pack
title: Meeting Pack
outcome: A Drive folder containing a structured notes doc for a specific meeting, linked from the calendar event, with an optional agenda email draft and follow-up task list.
services: [calendar, drive, docs, gmail, tasks]
token_classes: [read, write, send]
status: skeleton
---

# Meeting Pack

> **Status: skeleton.** The flow below fixes the shape of the recipe (JOE-148); step details and dogfood evidence land with JOE-149. All [shared guardrails](guardrails.md) apply.

## Outcome

For one upcoming meeting, the workspace gains: a Drive folder named after the meeting and date; a Docs meeting-notes document inside it (attendees, agenda, notes/decisions/actions sections); the event description updated with a link to the folder **only if the user asked for it**; optionally a draft agenda email to attendees (never sent automatically); optionally a task list with pre-meeting follow-ups.

## Inputs

| Input | Type | Required | Default / bounds |
|---|---|---|---|
| `meeting` | event title fragment or event ID | yes | searched within `range` |
| `range` | date range for locating the event | no | next 14 days, max 60 |
| `agenda_items` | list of strings | no | empty — section left as a template |
| `email_agenda` | boolean | no | `false`; `true` produces a **draft** only |
| `create_tasks` | boolean | no | `false` |
| `link_from_event` | boolean | no | `false`; `true` edits the existing event (**gated**) |

## Preflight

1. `wslite doctor` semantics: calendar, drive, docs configured; gmail/tasks only if the corresponding options are on.
2. Resolve `meeting` to exactly one event via `calendar_search_events` bounded by `range` (`maxResults: 10`); ambiguity is reported with candidates, never guessed.
3. Confirm the resolved event with the user (title, start time, attendee count) before creating anything.

## Steps

1. `calendar_get_event` — full event: attendees, description, conferencing links.
2. **[write]** `drive_create_folder` — `"<title> — <YYYY-MM-DD>"`.
3. **[write]** `docs_create_document` — notes doc in the folder; sections: Attendees, Agenda, Notes, Decisions, Actions (populated from event data and `agenda_items`).
4. *(if `link_from_event`)* **[write, gated]** `calendar_update_event` — append the folder link to the event description. Mutates a user-owned artifact: requires its own confirmation gate.
5. *(if `email_agenda`)* **[write]** `gmail_create_draft` — agenda draft addressed to event attendees; recipients and body summary shown to the user. Draft only; sending is out of recipe scope.
6. *(if `create_tasks`)* **[write]** `tasks_create_tasklist` + `tasks_create_task` — one list `"<title> follow-ups"`, tasks from Actions items.

## Confirmation gates

- After preflight step 3: proceed with artifact creation for this event?
- Before step 4: editing the user's existing calendar event.
- After step 5: the draft's recipients and content summary are reported; any send the user then requests happens outside the recipe with the standard send confirmation.

## Partial failure

- Folder created but doc creation fails: report the folder ID/link, retry doc creation once, otherwise stop — do not delete the folder unprompted.
- Event update (step 4) fails: report; the pack is still complete without the link.
- Draft or tasks failures: report and continue — they are optional extras, and the core pack (folder + doc) stands alone.

## Cleanup and rollback

Everything created is new: folder and doc are undone with `drive_trash_file` (trash, recoverable); draft with `gmail_delete_draft`; task list with `tasks_delete_tasklist` (gated destructive). If step 4 ran, restore the previous event description (captured in step 1) via `calendar_update_event`.

## Validation checklist

- Folder exists and contains exactly the notes doc; doc opens with all five sections.
- If gated steps ran, each had an explicit user confirmation in the transcript.
- No email was sent; at most one draft exists and its recipients match the event attendees.
- Report lists every artifact with its ID/link.

## Example prompt

> "Prep a meeting pack for my 'Q3 roadmap review' on Thursday — include an agenda draft to the attendees but don't send anything."
