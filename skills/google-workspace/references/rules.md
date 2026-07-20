# Rules

## Tool Selection

- `gmail_create_draft` = create a new draft from scratch (no threading)
- `gmail_create_draft_reply` = reply to existing message as draft (threaded)
- `gmail_create_draft_reply_all` = reply to all recipients as draft
- `gmail_reply` / `gmail_reply_all` = send immediately — only with explicit user approval
- `gmail_forward` = forward immediately — only with explicit user approval
- `drive_search_files` with `fullText` searches file contents, not just names
- `calendar_find_freebusy` returns busy slots — gaps between them are free
- `gmail_get_attachment` downloads attachment content — returns base64 for binary, plain text for text files
- `gmail_batch_modify` applies label changes to multiple messages at once — `messageIds` (array), `addLabels` (array), `removeLabels` (array)
- `calendar_quick_add_event` creates an event from natural language — no ISO timestamps needed
- `calendar_create_event` / `calendar_update_event` with `createMeetLink:true` creates Meet conference data through Calendar events
- `calendar_get_setting` with `setting:"timezone"` returns the user's Calendar timezone setting
- `calendar_create_event_series` uses RRULE format: "WEEKLY", "DAILY", "MONTHLY", "YEARLY", "EVERY MONDAY"
- `calendar_respond_to_event` sets your attendance: YES/NO/MAYBE
- `calendar_get_event_instances` expands recurring events into concrete instances within a time window
- `calendar_set_event_color` uses CalendarApp.EventColor enum: PALE_BLUE, PALE_GREEN, MAUVE, PALE_RED, YELLOW, ORANGE, CYAN, GRAY, BLUE, GREEN, RED
- `drive_export_as` exports Google Workspace files to PDF, DOCX, XLSX, CSV — `drive_read_file` only for plain text export
- `drive_add_parent` adds file to additional folder without removing existing parents — files can exist in multiple folders
- `drive_remove_parent` removes file from one parent folder — does NOT delete the file
- `drive_get_folder_path` walks parent folders to root and returns full path
- `drive_get_comments` / `drive_add_comment` / `drive_create_reply` — new comments are head-anchored; replies attach to a comment ID
- `drive_list_revisions` and `drive_list_changes` expose partial Drive history; Drive does not provide complete audit history for every file type
- `sheets_batch_get` reads multiple ranges in one API call — pass `ranges` array of A1 strings
- `sheets_insert_rows` / `sheets_delete_rows` — rows shift down/up; startPosition is 1-based
- `sheets_set_data_validation` — common types: VALUE_IN_LIST, CHECKBOX, NUMBER_BETWEEN, TEXT_IS_VALID_EMAIL, CUSTOM_FORMULA
- `sheets_get_conditional_formatting` returns serialized rule descriptions
- `sheets_read_formulas` returns formulas, display values, and raw values
- `slides_set_slide_background` sets solid fill color via hex string
- `slides_insert_line` draws lines with STRAIGHT/BENT/CURVED categories and SOLID/DOTTED/DASHED types
- `slides_delete_element` removes a page element by objectId — get ids from `slides_get_slide_elements`
- `slides_format_text` applies formatting to text within a specific element by findText
- `slides_update_element_geometry` adjusts common position/size/rotation fields; `slides_update_element_transform` is for affine transform fields
- `slides_set_element_link` requires exactly one of `linkUrl`, `targetSlideIndex`, or `clear`
- `docs_get_as_json` returns full structured document tree — use for programmatic access, `docs_get_document` for text reading
- `docs_set_text` replaces the entire body and is **destructive-gated even on a freshly created empty doc** — prefer `docs_insert_paragraph` / `docs_insert_list` (plain writes) to populate new docs
- `gmail_update_draft` returns a **new draft ID** — never reuse a stored draft ID after updating; use the ID from the latest response
- `calendar_create_event` — always pass an explicit `sendUpdates` (`"none"` unless the user approved emailing guests); adding `guests` may trigger invite emails
- `sheets_write_range` coerces `YYYY-MM-DD` strings to date cells; reads return ISO timestamps for them — expected, not corruption
- `docs_create_bookmark` and `docs_create_named_range` add navigation structure without raw batchUpdate passthroughs; `docs_list_table_of_contents` inspects existing TOC elements because Docs does not expose supported TOC creation
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
- Never `drive_trash_file`, `drive_delete_file`, `drive_delete_comment`, `drive_delete_reply`, `gmail_trash_message`, `gmail_delete_message`, `calendar_delete_event` without confirmation
- Never `drive_remove_editor`, `drive_remove_viewer`, `drive_remove_parent`, `drive_set_sharing` (change) without confirmation
- Never `calendar_create_event` or `calendar_create_event_series` without suggesting time and getting approval
- Never `calendar_create_calendar`, `calendar_update_calendar`, or `calendar_delete_calendar` without confirming the target calendar details
- Never `drive_add_editor` or `drive_set_sharing` (new share) without confirmation
- Never `sheets_delete_sheet` without confirmation — cannot undo
- Never `sheets_delete_rows` without confirmation — rows shift up, cannot undo
- Never `sheets_clear_range` without confirming the range
- Never `slides_delete_element` without confirming which element
- Never `slides_delete_slide` without confirmation — cannot undo
- Never `docs_delete_bookmark` or `docs_delete_named_range` without confirmation
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
