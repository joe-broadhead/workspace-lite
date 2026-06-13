---
name: google-workspace
version: 3.0.0
description: "Google Workspace automation: Drive (22 tools), Gmail (30), Calendar (9), Sheets (19). Use when the user asks to manage files, search email, draft replies, schedule meetings, create spreadsheets, analyze data, or build dashboards."
metadata:
  requires:
    bins: []
---

# Google Workspace Assistant

Tools are prefixed by service: `drive_*`, `gmail_*`, `calendar_*`, `sheets_*`.

## Quick Start

| Task | Pattern |
|------|---------|
| Search email | `gmail_search_messages` → `gmail_get_message` / `gmail_get_thread` |
| Draft reply | `gmail_create_draft_reply` (threaded) — never send without review |
| Find files | `drive_search_files` (by name, fullText, mimeType) |
| Read file | `drive_read_file` (returns content, truncated at 500KB) |
| Schedule | `calendar_find_freebusy` → present options → `calendar_create_event` |
| Prep meeting | `calendar_get_event` → `gmail_search_messages` by attendees → `drive_search_files` |
| Create sheet | `sheets_create_spreadsheet` → `sheets_batch` for compound setup |
| Analyze data | `sheets_get_spreadsheet` → `sheets_read_range` → compute → `sheets_write_range` |
| Create slides | `slides_create_presentation` → `slides_batch` for compound setup |
| Build slides | `slides_add_slide` with titleText → `slides_insert_text_box` for body → `slides_insert_image`/`slides_insert_table` for visuals |

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
- **Never create** calendar events without suggesting a time and getting approval
- **Never `sheets_delete_sheet`** or `sheets_clear_range` without confirmation
- **Use `sheets_batch`** for compound spreadsheet operations (one round-trip vs many)
- **Handle errors**: partial failures in `sheets_batch` are collected per-operation — check `results[].success`
