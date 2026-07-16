# Google Workspace Tool Catalog

Generated from `shared/src/catalog/services/*` (218 tools).

Do not hand-edit; run `node scripts/generate-tool-catalog.mjs`.

## Drive — 44 tools

- `drive_about` — Get Drive storage information including total storage, used storage, and root folder ID.
- `drive_add_comment` — Add a comment to a Drive file. The comment is head-anchored (appears at the top of the file).
- `drive_add_editor` — Add an editor to a file by email address.
- `drive_add_parent` — Add a file to an additional parent folder without removing existing parents.
- `drive_add_viewer` — Add a viewer to a file by email address.
- `drive_batch` — Execute multiple Drive operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (about, fileGet, fileList, fileSearch, fileExport, folderGet, folderList, folderListRoot, folderCreate, fileCreate, fileCopy, fileMove, fileUpdateMeta, fileUpdateContent, fileGetPermissions, fileSetSharing, fileAddEditor, fileAddViewer, fileRemoveEditor, fileRemoveViewer, fileAddParent, fileRemoveParent, folderPath, fileTrash, fileUntrash, fileDelete, fileExportAs, commentsList, commentsGet, commentCreate, commentsUpdate, commentsDelete, repliesList, repliesCreate, repliesGet, repliesUpdate, repliesDelete, revisionsList, revisionsGet, revisionsUpdate, sharedDrivesList, sharedDrivesGet, changesStartPageToken, changesList). Operations execute sequentially; errors are collected per-operation. Up to 20 operations.
- `drive_copy_file` — Copy a Drive file. Optionally rename and/or move to a different folder.
- `drive_create_file` — Create a new file in Drive with content. Specify mimeType for non-text files (e.g. text/markdown, application/json).
- `drive_create_folder` — Create a new folder in Drive. Optionally specify a parent folder ID.
- `drive_create_reply` — Create a reply on a Drive file comment.
- `drive_delete_comment` — Delete a Drive file comment. Requires explicit confirmation.
- `drive_delete_file` — Move a file to trash through the delete workflow. Permanent deletion requires emptying trash in Drive.
- `drive_delete_reply` — Delete a Drive file comment reply. Requires explicit confirmation.
- `drive_export_as` — Export a Google Workspace file (Docs, Sheets, Slides) in a format like PDF, DOCX, XLSX, CSV. Returns a base64-encoded blob. Use drive_read_file for plain text export.
- `drive_get_comment` — Get a specific Drive file comment by ID, including replies when returned by the Drive API.
- `drive_get_comments` — List comments on a Drive file. Returns comment id, content, author, createdTime, modifiedTime, resolved status, and replies count.
- `drive_get_file` — Get detailed metadata for a Drive file by ID. Returns id, name, mimeType, url, size, created, updated, starred, trashed, owner, parents.
- `drive_get_folder` — Get metadata for a Drive folder by ID. Returns id, name, url, created, updated, owner, parents.
- `drive_get_folder_path` — Get the full path from root to a file. Walks parent folders up to root Drive.
- `drive_get_permissions` — Get sharing permissions for a Drive file. Returns sharing access level, permission level, owner, editors, and viewers.
- `drive_get_reply` — Get a specific reply on a Drive file comment.
- `drive_get_revision` — Get metadata for a specific Drive file revision.
- `drive_get_shared_drive` — Get metadata and capabilities for a specific shared drive.
- `drive_get_start_page_token` — Get a Drive changes start page token for My Drive or a shared drive.
- `drive_list_changes` — List Drive changes from a start or next page token. Does not create watch channels.
- `drive_list_files` — List files in Drive. Optionally filter by folderId. Returns file name, id, mimeType, url, size, last updated, owner. Paginate with pageToken.
- `drive_list_folders` — List contents of a Drive folder (subfolders and files). If no folderId, lists root folder.
- `drive_list_replies` — List replies on a Drive file comment.
- `drive_list_revisions` — List Drive file revisions with metadata such as modified time, size, and keepForever when available.
- `drive_list_shared_drives` — List shared drives visible to the deploying user.
- `drive_move_file` — Move a file to a different folder.
- `drive_read_file` — Read the content of a Drive file as text. Works for Docs, Sheets, plain text, markdown, JSON, etc. Content is truncated at 500KB.
- `drive_remove_editor` — Remove an editor from a file by email address.
- `drive_remove_parent` — Remove a file from a specific parent folder.
- `drive_remove_viewer` — Remove a viewer from a file by email address.
- `drive_search_files` — Search Drive files with Google Drive query syntax. Supports: mimeType, name, modifiedTime, fullText, parents, starred, trashed. Example: "name contains 'report'" or "mimeType = 'application/pdf'".
- `drive_set_sharing` — Set sharing access and permission level for a file. Access: ANYONE, ANYONE_WITH_LINK, DOMAIN, DOMAIN_WITH_LINK, PRIVATE. Permission: VIEW, EDIT, COMMENT.
- `drive_trash_file` — Move a file to trash. Can be restored with drive_untrash_file.
- `drive_untrash_file` — Restore a file from trash.
- `drive_update_comment` — Update a Drive file comment content and/or resolved state.
- `drive_update_content` — Overwrite a file's content with new text. This replaces the entire file content.
- `drive_update_metadata` — Update a file's name and/or description.
- `drive_update_reply` — Update the content of a Drive file comment reply.
- `drive_update_revision` — Update Drive revision metadata such as keepForever where the Drive API supports it.

## Gmail — 39 tools

- `gmail_add_label` — Add a label to a message. Creates the label if new.
- `gmail_archive` — Archive a message (remove from inbox).
- `gmail_batch` — Execute multiple Gmail operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (profile, searchMessages, listThreads, getMessage, getThread, listLabels, send, createDraft, createDraftReply, createDraftReplyAll, listDrafts, getDraft, updateDraft, deleteDraft, sendDraft, markRead, markUnread, archive, star, unstar, addLabel, removeLabel, trashMessage, untrashMessage, deleteMessage, trashThread, untrashThread, reply, replyAll, forward, attachmentGet, batchModify, filtersList, filtersGet, filtersCreate, filtersDelete, vacationGet, vacationUpdate). Operations execute sequentially; errors are collected per-operation. Up to 20 operations.
- `gmail_batch_modify` — Bulk label changes on multiple messages. Use messageIds, addLabels (optional), and removeLabels (optional). Labels can be names (INBOX, UNREAD, STARRED) or IDs.
- `gmail_create_draft` — Create a new email draft.
- `gmail_create_draft_reply` — Create a draft reply without sending. Use this for review before sending.
- `gmail_create_draft_reply_all` — Create a draft reply-all without sending. Use this for review before sending.
- `gmail_create_filter` — Create a Gmail filter. Criteria fields match Gmail API filter criteria. Label names or IDs in addLabels/removeLabels are resolved to label IDs; forwarding requires params.confirm=true.
- `gmail_delete_draft` — Delete a draft permanently.
- `gmail_delete_filter` — Permanently delete a Gmail filter by ID. Requires confirmation.
- `gmail_delete_message` — Delete a message by moving it to trash. Gmail permanently removes trashed messages after its retention period.
- `gmail_forward` — Forward a message to new recipients. Sends immediately.
- `gmail_get_attachment` — Download an attachment from a Gmail message. Returns base64 for binary or plain text for text attachments. Requires messageId and attachmentId (from gmail_get_message).
- `gmail_get_draft` — Get a specific draft by ID.
- `gmail_get_filter` — Get one Gmail filter by ID.
- `gmail_get_message` — Get full details of a Gmail message by ID. Returns subject, from, to, cc, bcc, date, body, attachments.
- `gmail_get_thread` — Get a complete Gmail thread by ID with all messages.
- `gmail_get_vacation_responder` — Get Gmail vacation responder settings.
- `gmail_list_drafts` — List all email drafts.
- `gmail_list_filters` — List Gmail filters configured for the authenticated account.
- `gmail_list_labels` — List all Gmail labels.
- `gmail_list_threads` — List Gmail threads. Same filters as search_messages.
- `gmail_mark_read` — Mark a message as read.
- `gmail_mark_unread` — Mark a message as unread.
- `gmail_profile` — Get Gmail profile info.
- `gmail_remove_label` — Remove a label from a message.
- `gmail_reply` — Reply to a message. Sends immediately.
- `gmail_reply_all` — Reply to a message and all recipients. Sends immediately.
- `gmail_search_messages` — Search Gmail messages. Supports query syntax, filters, pagination.
- `gmail_send` — Send an email from your Gmail account. Requires to, subject, body.
- `gmail_send_draft` — Send an existing draft.
- `gmail_star` — Star a message.
- `gmail_trash_message` — Move a message to trash.
- `gmail_trash_thread` — Move an entire thread to trash.
- `gmail_unstar` — Remove star from a message.
- `gmail_untrash_message` — Restore a message from trash.
- `gmail_untrash_thread` — Restore a thread from trash.
- `gmail_update_draft` — Update an existing draft.
- `gmail_update_vacation_responder` — Update Gmail vacation responder settings. Enabling or changing an enabled responder requires params.confirm=true.

## Calendar — 22 tools

- `calendar_batch` — Execute multiple Calendar operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (listCalendars, getColors, settingsList, settingsGet, getCalendar, listEvents, searchEvents, findFreeBusy, getEvent, eventInstances, quickAdd, createCalendar, updateCalendar, deleteCalendar, createEvent, updateEvent, moveEvent, deleteEvent, respondToEvent, createEventSeries, setEventColor). Operations execute sequentially; errors are collected per-operation. Up to 20 operations.
- `calendar_create_calendar` — Create a secondary calendar. Does not create or modify the primary calendar.
- `calendar_create_event` — Create a new calendar event. Requires title, startTime, endTime (ISO strings).
- `calendar_create_event_series` — Create a recurring event series. Recurrence rules follow RRULE format (e.g. "WEEKLY", "EVERY MONDAY", etc). Returns the event series ID.
- `calendar_delete_calendar` — Delete a secondary calendar. Primary/default calendars are rejected server-side. Requires confirmation.
- `calendar_delete_event` — Delete a calendar event permanently.
- `calendar_find_freebusy` — Find busy slots in your calendar. Default: next 7 days.
- `calendar_get_calendar` — Get details of a specific calendar.
- `calendar_get_colors` — Get Calendar color definitions for calendars and events from the Calendar API.
- `calendar_get_event` — Get full details of a calendar event.
- `calendar_get_event_instances` — Expand recurring events into concrete instances within a time window. Uses the Calendar Advanced Service. Returns an array of event instances.
- `calendar_get_setting` — Get one Calendar user setting by ID, for example timezone.
- `calendar_list_calendars` — List all calendars available to your account.
- `calendar_list_events` — List events from a calendar within a time range. Default: next 30 days from default calendar.
- `calendar_list_settings` — List Calendar user settings such as timezone, locale, and week start.
- `calendar_move_event` — Move an event from one calendar to another using the Calendar API.
- `calendar_quick_add_event` — Create an event from a natural language description using the Calendar Advanced Service (e.g. "Lunch with Sarah tomorrow at noon"). Returns the created event.
- `calendar_respond_to_event` — RSVP to an event. Set your attendance status to YES, NO, or MAYBE.
- `calendar_search_events` — Search events by title/description text query.
- `calendar_set_event_color` — Set event color. Color is a string from the CalendarApp.EventColor enum.
- `calendar_update_calendar` — Update secondary calendar metadata such as title, description, location, or timezone.
- `calendar_update_event` — Update an existing calendar event. Only provided fields are changed.

## Sheets — 33 tools

- `sheets_add_sheet` — Add a new sheet (tab) to a spreadsheet.
- `sheets_append_rows` — Append rows to the end of a sheet. Values is a 2D array where each inner array is a row.
- `sheets_batch` — Execute multiple operations in a single round-trip against one existing spreadsheet. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (spreadsheetGet, sheetAdd, sheetDelete, sheetRename, sheetCopy, rangeRead, rangeWrite, rowsAppend, rangeClear, rangeGetFormulas, rangeGetNotes, valuesBatchGet, textFind, textReplace, rangeFormat, rangeMerge, rangeUnmerge, columnWidth, freezeRows, rangeSort, formulaSet, chartCreate, noteSet, conditionalFormatGet, dataValidationSet, protectionsList, rangeProtect, sheetProtect, protectionRemove, rowsInsert, rowsDelete). Operations execute sequentially; errors are collected and returned per-operation with partial-success metadata.
- `sheets_batch_get` — Read multiple ranges from a spreadsheet in a single API call via the Sheets Advanced Service. Returns a valueRanges array, each with range, majorDimension, and values. Params: spreadsheetId, ranges (array of A1 notation strings).
- `sheets_clear_range` — Clear values from a range. If no range is specified, clears all data in the sheet.
- `sheets_copy_sheet` — Copy a sheet within the same spreadsheet or to a different spreadsheet.
- `sheets_create_chart` — Create a chart in a sheet from a data range. Supports AREA, BAR, COLUMN, COMBO, HISTOGRAM, LINE, PIE, SCATTER, TABLE, TIMELINE, and WATERFALL chart types.
- `sheets_create_spreadsheet` — Create a new Google Sheets spreadsheet.
- `sheets_delete_rows` — Delete rows at the specified position. Existing rows below are shifted up.
- `sheets_delete_sheet` — Delete a sheet (tab) from a spreadsheet. Cannot delete the only remaining sheet.
- `sheets_find_text` — Find text in a spreadsheet, sheet, or A1 range using Apps Script TextFinder options such as case sensitivity, regex, formula text, and diacritic handling.
- `sheets_format_range` — Apply formatting to a range. Supports background, font color/size/family/bold/italic/underline/strikethrough, alignment, number format, text wrap, and borders. Only specified properties are applied.
- `sheets_freeze_rows` — Freeze a number of rows at the top of a sheet (header rows). Set 0 to unfreeze.
- `sheets_get_conditional_formatting` — Read conditional format rules on a sheet. Returns serialized rule descriptions with ranges, boolean conditions, and gradient conditions.
- `sheets_get_notes` — Read notes from a Google Sheets range.
- `sheets_get_spreadsheet` — Get spreadsheet metadata including ID, name, URL, and list of sheets (tabs) with row/column counts.
- `sheets_insert_rows` — Insert blank rows at the specified position. Existing rows are shifted down.
- `sheets_list_protections` — List protected ranges and sheets. Returns current filtered indexes for follow-up removal with sheets_remove_protection.
- `sheets_merge_cells` — Merge a range of cells into one cell. Content is preserved from the top-left cell.
- `sheets_protect_range` — Create a protected range with optional description, warning-only mode, additional editors, and domain edit setting.
- `sheets_protect_sheet` — Protect a sheet with optional description, warning-only mode, unprotected ranges, additional editors, and domain edit setting.
- `sheets_read_formulas` — Read formulas and display values alongside raw values from a Google Sheets range.
- `sheets_read_range` — Read values from a Google Sheets range. Returns a 2D array of cell values in the specified range.
- `sheets_remove_protection` — Remove a protected range or sheet selected by type plus optional sheetName, range, description, and filtered index. Requires confirm=true.
- `sheets_rename_sheet` — Rename a sheet (tab) in a spreadsheet.
- `sheets_replace_text` — Find and replace text in a spreadsheet, sheet, or A1 range using Apps Script TextFinder. Replacement text is treated as plain text; use sheets_set_formula for formulas.
- `sheets_set_column_width` — Set the width of a column in pixels.
- `sheets_set_data_validation` — Set data validation on a range. Supports VALUE_IN_LIST, NUMBER_BETWEEN, NUMBER_GREATER_THAN, TEXT_CONTAINS, DATE_BEFORE, CHECKBOX, CUSTOM_FORMULA, and more.
- `sheets_set_formula` — Set a formula in a cell or range (e.g. "=SUM(A1:A10)", "=IF(A1>0,\\"yes\\",\\"no\\")").
- `sheets_set_note` — Add or clear a note in a cell or range. Use an empty string to clear notes.
- `sheets_sort_range` — Sort a range by a single column. Header rows outside the range are not sorted.
- `sheets_unmerge_cells` — Unmerge a range of cells back into individual cells.
- `sheets_write_range` — Write values to a Google Sheets range. Values is a 2D array where each inner array is a row.

## Slides — 25 tools

- `slides_add_slide` — Add a new slide to a presentation. Optionally sets title and body text if the layout supports it.
- `slides_batch` — Execute multiple operations in a single round-trip against one existing presentation. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (presentationGet, slideAdd, slideDelete, slideDuplicate, slideMove, textBoxInsert, imageInsert, shapeInsert, tableInsert, lineInsert, slideElementsList, elementDelete, elementGet, elementGetText, elementFormatText, elementGeometryUpdate, elementTransformUpdate, elementAltTextSet, elementLinkSet, elementReorder, slideNotes, textReplaceAll, slideBackground). Operations execute sequentially; errors are collected per-operation with partial-success metadata. Requires presentationId.
- `slides_create_presentation` — Create a new Google Slides presentation.
- `slides_delete_element` — Delete a page element from a slide by its objectId. Get objectIds from slides_get_slide_elements.
- `slides_delete_slide` — Delete a slide by index (0-based).
- `slides_duplicate_slide` — Duplicate a slide by index (0-based). Inserts the copy after the original.
- `slides_format_text` — Format text within a slide element (shape/text box). Finds all occurrences of findText in the element and applies the specified formatting.
- `slides_get_element` — Get one slide page element with geometry, rotation, alt text, and link metadata.
- `slides_get_element_text` — Read text from a specific shape/text element on a slide. Get objectIds from slides_get_slide_elements.
- `slides_get_presentation` — Get presentation metadata including ID, name, URL, and list of slides with indices and object IDs.
- `slides_get_slide_elements` — List all page elements on a slide with their types, IDs, positions, dimensions, and full text content (no truncation).
- `slides_get_slide_notes` — Get or set speaker notes for a slide. If notes param is provided, sets notes. If omitted, returns current notes.
- `slides_insert_image` — Insert an image from a public URL onto a slide at the specified position and size.
- `slides_insert_line` — Insert a line connector between two points on a slide. Supports STRAIGHT, BENT, and CURVED line categories with optional line type (SOLID, DOTTED, DASHED).
- `slides_insert_shape` — Insert a shape on a slide. Supports RECTANGLE, ROUND_RECTANGLE, ELLIPSE, TRIANGLE, ARROW_RIGHT, ARROW_LEFT, STAR_5, HEXAGON, CLOUD, FLOW_CHART_PROCESS, FLOW_CHART_DECISION, WAVE, CHEVRON, PENTAGON, TRAPEZOID.
- `slides_insert_table` — Insert a table on a slide with the given 2D array of values.
- `slides_insert_text_box` — Insert a text box on a slide. Auto-positions below existing elements by default. Set autoPosition:false or provide coordinates to override.
- `slides_move_slide` — Move a slide to a different position by index (0-based).
- `slides_reorder_element` — Change element z-order: bring forward/front or send backward/back.
- `slides_replace_all_text` — Find and replace text across all slides in a presentation.
- `slides_set_element_alt_text` — Set or clear accessibility title and description on a slide element.
- `slides_set_element_link` — Set an element link to an HTTPS URL, link to another slide, or clear the link.
- `slides_set_slide_background` — Set the background color of a slide using a solid fill color.
- `slides_update_element_geometry` — Update a slide element position, size, and/or rotation in points/degrees.
- `slides_update_element_transform` — Update a slide element affine transform using the constrained Slides API transform fields.

## Docs — 26 tools

- `docs_batch` — Execute multiple operations in a single round-trip against one existing document. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (documentGet, documentGetJson, paragraphInsert, paragraphUpdate, paragraphDelete, setText, replaceText, listInsert, tableInsert, imageInsert, pageBreakInsert, horizontalRuleInsert, formatText, headerSet, footerSet, pageSetupGet, pageSetupUpdate, bookmarksList, bookmarkCreate, bookmarkDelete, namedRangesList, namedRangeCreate, namedRangeDelete, tableOfContentsList). Operations execute sequentially; errors are collected per-operation with partial-success metadata. Requires documentId.
- `docs_create_bookmark` — Create a bookmark at a paragraph character offset.
- `docs_create_document` — Create a new Google Docs document.
- `docs_create_named_range` — Create a named range around a paragraph or a partial paragraph text span.
- `docs_delete_bookmark` — Delete a bookmark by ID. Requires confirm=true.
- `docs_delete_named_range` — Delete a named range by ID. Requires confirm=true.
- `docs_delete_paragraph` — Delete a paragraph by index from a document.
- `docs_format_text` — Format text in the document by search pattern. Finds the text and applies formatting: bold, italic, underline, strikethrough, font family, font size, colors, or links.
- `docs_get_as_json` — Get the full document as structured JSON via the Docs Advanced Service. Returns the complete document tree with all content, formatting, and structure. This is an alternative to the paragraph-based docs_get_document.
- `docs_get_document` — Get document metadata including ID, name, URL, and full text content with paragraph breakdown.
- `docs_get_page_setup` — Read page size and margin settings from a Google Docs document. Values are returned in points.
- `docs_insert_horizontal_rule` — Insert a horizontal rule divider into the document.
- `docs_insert_image` — Insert an image from a public URL into the document.
- `docs_insert_list` — Insert a bulleted or numbered list into the document.
- `docs_insert_page_break` — Insert a page break into the document.
- `docs_insert_paragraph` — Insert a paragraph into a document. Optionally set text, heading level (HEADING1-6 or NORMAL), and position (append or prepend).
- `docs_insert_table` — Insert a table into the document from a 2D array of values. First row is treated as header and bolded.
- `docs_list_bookmarks` — List document bookmarks with IDs and resolved paragraph positions where available.
- `docs_list_named_ranges` — List document named ranges, optionally filtered by name.
- `docs_list_table_of_contents` — List existing Google Docs table-of-contents elements with child indexes and text previews.
- `docs_replace_text` — Find and replace text across the entire document.
- `docs_set_footer` — Set the document footer text. Use empty string to clear.
- `docs_set_header` — Set the document header text. Use empty string to clear.
- `docs_set_text` — Replace the entire document body with new text.
- `docs_update_page_setup` — Update page size and margins for a Google Docs document. Values are points.
- `docs_update_paragraph` — Update heading level and/or text of an existing paragraph by index.

## Tasks — 13 tools

- `tasks_batch` — Execute multiple Google Tasks operations in a single round-trip. Operations execute sequentially; errors are collected per-operation. Up to 20 operations.
- `tasks_clear_completed` — Clear completed tasks from a Google Tasks task list. Requires confirmation.
- `tasks_create_task` — Create a new task in a Google Tasks task list.
- `tasks_create_tasklist` — Create a new Google Tasks task list.
- `tasks_delete_task` — Delete a task from a Google Tasks task list. Requires confirmation.
- `tasks_delete_tasklist` — Delete a Google Tasks task list. Requires confirmation.
- `tasks_get_task` — Get one task from a Google Tasks task list.
- `tasks_get_tasklist` — Get one Google Tasks task list by ID.
- `tasks_list_tasklists` — List Google Tasks task lists for the authenticated account.
- `tasks_list_tasks` — List tasks in a Google Tasks task list.
- `tasks_move_task` — Move a task within a Google Tasks task list, optionally under a parent or after a previous task.
- `tasks_update_task` — Update a task title, notes, due date, or status.
- `tasks_update_tasklist` — Update a Google Tasks task list title.

## Forms — 16 tools

- `forms_add_item` — Add a supported item type to a Google Form: text, paragraph, multiple choice, checkbox, list, scale, date, time, section header, or page break.
- `forms_batch` — Execute multiple Google Forms operations in a single round-trip. Operations execute sequentially; errors are collected per-operation. Up to 20 operations.
- `forms_create_form` — Create a new Google Form with an optional description and initial publish state.
- `forms_delete_all_responses` — Delete all responses from a Google Form response store. Requires confirmation.
- `forms_delete_item` — Delete a Google Form item by item ID. Requires confirmation.
- `forms_delete_response` — Delete one Google Form response from the form response store. Requires confirmation.
- `forms_get_form` — Get Google Form metadata, settings, item summary, and response destination information.
- `forms_get_response` — Get one Google Form response by response ID.
- `forms_list_items` — List items in a Google Form with concise metadata and supported item-specific fields.
- `forms_list_responses` — List recent Google Form responses with concise answer metadata. Response content is capped by the proxy.
- `forms_move_item` — Move a Google Form item to a new zero-based index.
- `forms_remove_response_destination` — Unlink a Google Form from its current response destination.
- `forms_set_accepting_responses` — Open or close a Google Form for responses, optionally setting the custom closed-form message.
- `forms_set_response_destination` — Link a Google Form response destination to a Google Sheets spreadsheet.
- `forms_update_form` — Update Google Form title, description, confirmation and response settings supported by FormsApp.
- `forms_update_item` — Update common Google Form item fields and supported item-specific fields such as choices or scale bounds.
