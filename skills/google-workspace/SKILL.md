---
name: google-workspace
version: 1.0.0
description: "Google Workspace automation: Drive (29 tools), Gmail (39), Calendar (15), Sheets (27), Slides (19), Docs (17), Tasks (13), Forms (16). Use when the user asks to manage files, search email, draft replies, schedule meetings, create spreadsheets, analyze data, build presentations, write documents, manage tasks, or build forms."
metadata:
  requires:
    bins: []
---

# Google Workspace Assistant

Tools are prefixed by service: `drive_*`, `gmail_*`, `calendar_*`, `sheets_*`, `slides_*`, `docs_*`, `tasks_*`, `forms_*`.

## Quick Start

| Task | Pattern |
|------|---------|
| Search email | `gmail_search_messages` → `gmail_get_message` / `gmail_get_thread` |
| Draft reply | `gmail_create_draft_reply` (threaded) — never send without review |
| Get attachment | `gmail_get_message` → `gmail_get_attachment` |
| Bulk labels | `gmail_batch_modify` for mass archive/label/mark-read |
| Manage filters | `gmail_list_filters` → `gmail_create_filter` / `gmail_delete_filter` |
| Vacation reply | `gmail_get_vacation_responder` → `gmail_update_vacation_responder` |
| Find files | `drive_search_files` (by name, fullText, mimeType) |
| Read file | `drive_read_file` (returns content, truncated at 500KB) |
| Export file | `drive_export_as` — PDF, DOCX, XLSX, CSV from Workspace files |
| Comment on file | `drive_get_comments` → `drive_add_comment` |
| Folder path | `drive_get_folder_path` to see full path to a file |
| Schedule | `calendar_find_freebusy` → present options → `calendar_create_event` |
| Quick schedule | `calendar_quick_add_event` (natural language, e.g. "Lunch tomorrow noon") |
| Recurring | `calendar_create_event_series` with recurrence rule |
| RSVP | `calendar_respond_to_event` → YES/NO/MAYBE |
| Prep meeting | `calendar_get_event` → `gmail_search_messages` by attendees → `drive_search_files` |
| Create sheet | `sheets_create_spreadsheet` → `sheets_batch` for compound setup |
| Analyze data | `sheets_get_spreadsheet` → `sheets_read_range` → compute → `sheets_write_range` |
| Multi-range read | `sheets_batch_get` — read multiple ranges in one call |
| Insert/delete rows | `sheets_insert_rows` / `sheets_delete_rows` |
| Validation | `sheets_set_data_validation` for dropdowns, checkboxes, rules |
| Conditional fmt | `sheets_get_conditional_formatting` → read existing rules |
| Create slides | `slides_create_presentation` → `slides_batch` for compound setup |
| Build slides | `slides_add_slide` with titleText → `slides_insert_text_box` for body → `slides_insert_image`/`slides_insert_table` for visuals |
| Slide background | `slides_set_slide_background` with hex color |
| Write document | `docs_create_document` → `docs_batch` for compound setup |
| Format document | `docs_insert_paragraph` with heading → `docs_format_text` for styling |
| Doc as JSON | `docs_get_as_json` — full structured document tree |
| Manage tasks | `tasks_list_tasklists` → `tasks_list_tasks` → `tasks_create_task` / `tasks_update_task` |
| Build form | `forms_create_form` → `forms_add_item` / `forms_batch` → `forms_get_form` |

## When to Load References

| Reference | Load When |
|-----------|-----------|
| **[references/tool-catalog.md](references/tool-catalog.md)** | You need exact tool signatures, parameter names, or descriptions |
| **[references/workflows.md](references/workflows.md)** | User's request matches a common pattern (meeting prep, email triage, dashboard) |
| **[references/rules.md](references/rules.md)** | You need safety rules, search syntax, or parameter formatting |

Read the relevant reference file before executing complex multi-tool workflows.

## Critical Rules (read [references/rules.md](references/rules.md) for full list)

- **Never send** email without explicit approval — always draft first
- **Never delete/trash** files, emails, or events without confirmation
- **Never create forwarding filters** or enable/change an enabled vacation responder without confirmation
- **Never create** calendar events without suggesting a time and getting approval
- **Never `sheets_delete_sheet`**, `sheets_clear_range`, or `sheets_delete_rows` without confirmation
- **Never `drive_remove_parent`**, `drive_remove_editor` / `drive_remove_viewer` without confirmation
- **Never `tasks_delete_tasklist`**, `tasks_delete_task`, or `tasks_clear_completed` without confirmation
- **Never `forms_remove_response_destination`**, `forms_delete_item`, `forms_delete_response`, or `forms_delete_all_responses` without confirmation
- **Use `sheets_batch`** for compound spreadsheet operations (one round-trip vs many)
- **Use `sheets_batch_get`** to read multiple ranges in a single API call
- **Handle errors**: partial failures in `sheets_batch` / `drive_batch` / `calendar_batch` etc. are collected per-operation — check `results[].success`
