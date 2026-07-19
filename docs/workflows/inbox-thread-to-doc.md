---
recipe: inbox-thread-to-doc
title: Inbox Thread to Doc and Tasks
outcome: A structured Docs summary of one bounded Gmail thread (participants, timeline, decisions, open questions, action items), with optional Tasks follow-ups and an optional draft reply that is never sent.
services: [gmail, docs, drive, tasks]
token_classes: [read, write]
status: ready
---

# Inbox Thread to Doc and Tasks

All [shared guardrails](guardrails.md) apply. This recipe reads **one thread**, never sweeps the mailbox, and its email output is draft-only. The original messages are left exactly as found — no label changes, no archiving, no read-state changes beyond what reading via the API implies.

## Outcome

A new Docs document `"Thread summary — <subject>"` with sections **Participants, Timeline, Decisions, Open questions, Action items** (optionally inside a named Drive folder), plus — only if requested — a task list seeded from the action items and a **draft** reply on the thread. Nothing is sent; nothing existing is modified.

## Inputs

| Input | Type | Required | Default / bounds |
|---|---|---|---|
| `thread` | Gmail thread ID, message ID, or search query | yes | IDs are preferred; a query triggers the query-approval gate |
| `query_bounds` | date range / sender constraints for a query | only with a query | queries run with `maxResults: 10` and must carry at least one narrowing operator (`from:`, `subject:`, `after:`) |
| `doc_name` | string | no | `"Thread summary — <subject>"` |
| `output_folder` | Drive folder name or ID | no | My Drive root; resolved and confirmed if ambiguous |
| `create_tasks` | boolean | no | `false` |
| `draft_reply` | reply intent (none / reply / reply-all) | no | `none`; produces a **draft only**, recipients shown |

## Preflight

All read-only:

1. gmail and docs configured (`wslite doctor` semantics); drive only if `output_folder` given; tasks only if `create_tasks`.
2. Resolve `thread`:
   - thread ID → `gmail_get_thread`; message ID → `gmail_get_message`, then its thread via `gmail_get_thread`.
   - query → **gate**: show the exact query with its bounds; after approval run `gmail_search_messages` (`maxResults: 10`). Exactly one matching thread → proceed; several → present candidates (subject, sender, date) and let the user pick; none → stop and report, do not broaden the query unprompted.
3. Echo the resolved thread (subject, message count, participant count) and which extras will run. Threads over 50 messages: summarize the most recent 50 and say so.

## Steps

1. Gate A — resolved thread + plan confirmation (folded into preflight step 3's echo; explicit approval required before any artifact is created).
2. `gmail_get_thread` — full thread; carry forward per message: sender, date, and body. Only this thread's messages are summarized — never neighbors from a search result.
3. *(if `output_folder` names a new folder)* **[write]** `drive_create_folder`.
4. **[write]** `docs_create_document` `<doc_name>`, populated with plain-write `docs_insert_paragraph`/`docs_insert_list` (not the destructive-gated `docs_set_text`): Participants (name/address, from the thread only), Timeline (one line per message: date — sender — gist), Decisions, Open questions, Action items (each attributed to a message; no invented items).
5. *(if `output_folder`)* **[write]** `drive_move_file` — doc into the folder.
6. *(if `create_tasks`)* Gate B — show the action items that will become tasks; then **[write]** `tasks_create_tasklist` `"<subject> follow-ups"` + `tasks_create_task` per approved item (title = action, notes = doc link + source message date).
7. *(if `draft_reply`)* **[write]** `gmail_create_draft_reply` (or `gmail_create_draft_reply_all`) — threads correctly instead of starting a new thread; body summarizes decisions/actions with the doc link. Report the draft's recipients verbatim. Never `gmail_send`/`gmail_send_draft` — sending is out of scope.

## Confirmation gates

- **Query approval** (only when `thread` is a query): exact query + bounds before any search; candidate selection when multiple threads match.
- **Gate A** (always): resolved thread and plan before any artifact creation.
- **Gate B** (only with `create_tasks`): the exact action items becoming tasks.
- The draft is reported (recipients + subject), not sent; reply-all recipient lists are spelled out before creating the draft since they can be large.
- Label, archive, read-state, or delete operations on the thread are **never** part of this recipe, even if the user's phrasing hints at tidy-up — that is a separate, explicitly-requested operation.

## Partial failure

- No thread found / ambiguous query: stop at preflight with candidates or a clear "not found" — never guess or broaden silently.
- Doc creation fails: stop (the doc is the product); report with correlationId. A created folder (step 3) is reported and left in place.
- Move fails: retry once, else report the doc's actual location.
- Task list/task creation fails: report which items were created; the doc stands alone.
- Draft creation fails: report the error; the doc and tasks stand; do not retry into a duplicate draft without saying so.
- Rate limits: wait ~60s, retry the failed step once, then report what remains undone.

## Cleanup and rollback

Everything created is new: `drive_trash_file` the doc (and folder, if the recipe created it); `tasks_delete_tasklist` (**gated destructive**, verify via `tasks_get_tasklist` → NOT_FOUND); `gmail_delete_draft` for the draft. The thread itself was never modified, so there is nothing to restore.

## Validation checklist

- Doc exists with all five sections; every Timeline entry maps to a real message in the thread; participant list matches the thread's senders/recipients (`docs_get_document` vs step 2 data).
- Doc location and permissions as confirmed (`drive_get_folder_path`, `drive_get_permissions` → PRIVATE).
- If tasks ran: created tasks match Gate B's approved list.
- If a draft exists: it is in Drafts (`gmail_list_drafts`), reply-threaded to the source thread, recipients match what was reported, and nothing appears in Sent.
- Final report: doc link, task list (if any), draft recipients (if any), messages included (count + date span), and any skipped/ambiguous results.

## Example prompt

> "Take the 'API pricing discussion' thread from Sarah last week and turn it into a doc with the decisions and open questions. Make tasks from the action items, and draft a reply summarizing where we landed — don't send it."

Expected final response shape:

> Summarized the 8-message "API pricing discussion" thread (Jul 14–18):
> **Doc** "Thread summary — API pricing discussion" (link) — participants, timeline, 3 decisions, 2 open questions, 4 action items
> **Tasks** "API pricing discussion follow-ups": 4 tasks — the ones you approved
> **Draft reply** to sarah@… sitting in Drafts, not sent — recipients exactly as shown before creation
> The thread itself is untouched (no labels, archive, or read-state changes). To undo: trash the doc, delete the task list, discard the draft.
