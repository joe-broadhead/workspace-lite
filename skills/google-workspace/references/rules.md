# Rules

## Tool Selection

- `gmail_create_draft` = create a new draft from scratch (no threading)
- `gmail_create_draft_reply` = reply to existing message as draft (threaded)
- `gmail_create_draft_reply_all` = reply to all recipients as draft
- `gmail_reply` / `gmail_reply_all` = send immediately — only with explicit user approval
- `gmail_forward` = forward immediately — only with explicit user approval
- `drive_search_files` with `fullText` searches file contents, not just names
- `calendar_find_freebusy` returns busy slots — gaps between them are free
- `sheets_batch` executes up to 20 operations in one round-trip — use for compound setup
- `sheets_read_range` returns values as a 2D array with sheet name, range, and row/col counts
- `sheets_format_range` only applies properties you specify — omit params to leave formatting unchanged

## Always

- Draft outgoing email, never send without review
- Read file content before summarizing it
- Try multiple search queries (by person, by keyword, by date range)
- Show the user what action you're about to take before executing
- Use `sheets_batch` for compound spreadsheet operations (format + freeze + column widths in one call)
- Use `sheets_get_spreadsheet` before `sheets_read_range` to discover sheet names

## Never

- Never `gmail_send`, `gmail_reply`, `gmail_reply_all`, `gmail_forward` without explicit approval
- Never `drive_trash_file`, `gmail_trash_message`, `calendar_delete_event` without confirmation
- Never `calendar_create_event` without suggesting time and getting approval
- Never `drive_add_editor` or `drive_set_sharing` without confirmation
- Never `sheets_delete_sheet` without confirmation — cannot undo
- Never `sheets_clear_range` without confirming the range
- Never assume a file, email, event, or sheet exists — search first

## Search Tips

### Gmail
`from:email@domain.com`, `to:email`, `subject:"exact phrase"`, `has:attachment`, `is:unread`, `newer_than:7d`, `older_than:1y`, `label:important`

### Drive
`name contains 'report'`, `mimeType = 'application/pdf'`, `modifiedTime > '2026-01-01'`, `fullText contains 'keyword'`, combine with `and`

### Calendar
Empty `timeMin` = now, empty `timeMax` = now+30d. Use ISO strings: `2026-06-12T09:00:00`

### General
If search returns 0, try different terms, wider ranges, or fewer filters. Use pagination (`page`/`pageToken`) for large result sets.

## Parameter Types (Zod-validated)

- All IDs are validated (regex patterns)
- Email addresses must be valid emails
- Dates must be ISO 8601 format
- Numbers have min/max bounds
- Strings have length limits
- Invalid params return clear errors before reaching the API
