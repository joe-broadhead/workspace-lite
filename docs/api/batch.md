# Batch Operations

Every service exposes a `batch` tool that executes up to 20 operations in a single HTTP round-trip. Instead of making N separate calls for a compound task (create a file, then set its sharing, then move it), you pack them into one request and get a single response with per-operation results.

## How It Works

The batch endpoint on the Apps Script proxy receives an ordered array of `{action, params}` objects, executes them sequentially, and returns a `results` array - one entry per operation. Execution is **strictly sequential**, so operation N+1 sees the effects of operations 1 through N. If an operation fails, execution continues through the remaining operations; errors are collected alongside successes.

If any operation fails, the proxy returns top-level `partial: true` and top-level `results`. Do not treat a successful HTTP response as an atomic transaction.

```
POST /exec
{
  "action": "batch",
  "params": {
    "operations": [
      { "action": "someAction", "params": { ... } },
      { "action": "anotherAction", "params": { ... } },
      ...
    ]
  }
}
```

## JSON Example

Request:

```json
{
  "action": "batch",
  "token": "<proxy-token>",
  "params": {
    "operations": [
      {
        "action": "fileSearch",
        "params": { "query": "name contains 'Q4' and mimeType = 'application/pdf'" }
      },
      {
        "action": "fileCreate",
        "params": { "name": "README.md", "content": "# Q4 Docs\n\nIndex of all Q4 reports.", "mimeType": "text/markdown" }
      },
      {
        "action": "fileGetPermissions",
        "params": { "fileId": "abc123XYZ456" }
      }
    ]
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "PARTIAL_SUCCESS",
    "totalOperations": 3,
    "succeeded": 2,
    "failed": 1,
    "operationWeight": 5
  },
  "partial": true,
  "results": [
    {
      "index": 0,
      "action": "fileSearch",
      "success": true,
      "data": [
        { "id": "abc123", "name": "Q4_Report.pdf", "mimeType": "application/pdf" }
      ]
    },
    {
      "index": 1,
      "action": "fileCreate",
      "success": true,
      "data": {
        "file": { "id": "xyz789", "name": "README.md", "mimeType": "text/markdown" }
      }
    },
    {
      "index": 2,
      "action": "fileGetPermissions",
      "success": false,
      "error": { "code": "NOT_FOUND", "message": "File not found: abc123XYZ456" }
    }
  ]
}
```

## Atomicity And Retries

Batch operations are not atomic. A successful batch with `partial: true` means at least one operation mutated state and at least one operation failed.

Retry guidance:

- Include `idempotencyKey` inside retry-prone create, send, and share operation params when the schema supports it.
- If a batch returns `partial: true`, use the per-operation `results` to decide which operations already completed before retrying.
- If a client times out and no response is available, inspect affected resources before retrying operations that did not include idempotency keys.
- Destructive operations still require confirmation inside their operation params.

## Action Name Mapping

The `action` field in each operation uses the **same names as the individual tools**, but in their proxy-internal camelCase form.

### Drive

| Individual Tool | Batch `action` |
|---|---|
| `drive_about` | `about` |
| `drive_get_file` | `fileGet` |
| `drive_list_files` | `fileList` |
| `drive_search_files` | `fileSearch` |
| `drive_read_file` | `fileExport` |
| `drive_get_folder` | `folderGet` |
| `drive_list_folders` | `folderList` |
| `drive_list_folders` (root) | `folderListRoot` |
| `drive_create_folder` | `folderCreate` |
| `drive_create_file` | `fileCreate` |
| `drive_copy_file` | `fileCopy` |
| `drive_move_file` | `fileMove` |
| `drive_update_metadata` | `fileUpdateMeta` |
| `drive_update_content` | `fileUpdateContent` |
| `drive_get_permissions` | `fileGetPermissions` |
| `drive_set_sharing` | `fileSetSharing` |
| `drive_add_editor` | `fileAddEditor` |
| `drive_add_viewer` | `fileAddViewer` |
| `drive_remove_editor` | `fileRemoveEditor` |
| `drive_remove_viewer` | `fileRemoveViewer` |
| `drive_trash_file` | `fileTrash` |
| `drive_untrash_file` | `fileUntrash` |
| `drive_delete_file` | `fileDelete` |
| `drive_add_parent` | `fileAddParent` |
| `drive_remove_parent` | `fileRemoveParent` |
| `drive_get_folder_path` | `folderPath` |
| `drive_export_as` | `fileExportAs` |
| `drive_get_comments` | `commentsList` |
| `drive_add_comment` | `commentCreate` |

### Gmail

| Individual Tool | Batch `action` |
|---|---|
| `gmail_profile` | `profile` |
| `gmail_search_messages` | `searchMessages` |
| `gmail_list_threads` | `listThreads` |
| `gmail_get_message` | `getMessage` |
| `gmail_get_thread` | `getThread` |
| `gmail_list_labels` | `listLabels` |
| `gmail_send` | `send` |
| `gmail_create_draft` | `createDraft` |
| `gmail_create_draft_reply` | `createDraftReply` |
| `gmail_create_draft_reply_all` | `createDraftReplyAll` |
| `gmail_list_drafts` | `listDrafts` |
| `gmail_get_draft` | `getDraft` |
| `gmail_update_draft` | `updateDraft` |
| `gmail_delete_draft` | `deleteDraft` |
| `gmail_send_draft` | `sendDraft` |
| `gmail_mark_read` | `markRead` |
| `gmail_mark_unread` | `markUnread` |
| `gmail_archive` | `archive` |
| `gmail_star` | `star` |
| `gmail_unstar` | `unstar` |
| `gmail_add_label` | `addLabel` |
| `gmail_remove_label` | `removeLabel` |
| `gmail_trash_message` | `trashMessage` |
| `gmail_untrash_message` | `untrashMessage` |
| `gmail_delete_message` | `deleteMessage` |
| `gmail_trash_thread` | `trashThread` |
| `gmail_untrash_thread` | `untrashThread` |
| `gmail_reply` | `reply` |
| `gmail_reply_all` | `replyAll` |
| `gmail_forward` | `forward` |
| `gmail_get_attachment` | `attachmentGet` |
| `gmail_batch_modify` | `batchModify` |
| `gmail_list_filters` | `filtersList` |
| `gmail_get_filter` | `filtersGet` |
| `gmail_create_filter` | `filtersCreate` |
| `gmail_delete_filter` | `filtersDelete` |
| `gmail_get_vacation_responder` | `vacationGet` |
| `gmail_update_vacation_responder` | `vacationUpdate` |

### Calendar

| Individual Tool | Batch `action` |
|---|---|
| `calendar_list_calendars` | `listCalendars` |
| `calendar_get_calendar` | `getCalendar` |
| `calendar_list_events` | `listEvents` |
| `calendar_search_events` | `searchEvents` |
| `calendar_find_freebusy` | `findFreeBusy` |
| `calendar_get_event` | `getEvent` |
| `calendar_create_event` | `createEvent` |
| `calendar_update_event` | `updateEvent` |
| `calendar_delete_event` | `deleteEvent` |
| `calendar_respond_to_event` | `respondToEvent` |
| `calendar_create_event_series` | `createEventSeries` |
| `calendar_set_event_color` | `setEventColor` |
| `calendar_get_event_instances` | `eventInstances` |
| `calendar_quick_add_event` | `quickAdd` |

### Sheets

| Individual Tool | Batch `action` |
|---|---|
| `sheets_get_spreadsheet` | `spreadsheetGet` |
| `sheets_add_sheet` | `sheetAdd` |
| `sheets_delete_sheet` | `sheetDelete` |
| `sheets_rename_sheet` | `sheetRename` |
| `sheets_copy_sheet` | `sheetCopy` |
| `sheets_read_range` | `rangeRead` |
| `sheets_write_range` | `rangeWrite` |
| `sheets_append_rows` | `rowsAppend` |
| `sheets_clear_range` | `rangeClear` |
| `sheets_read_formulas` | `rangeGetFormulas` |
| `sheets_get_notes` | `rangeGetNotes` |
| `sheets_format_range` | `rangeFormat` |
| `sheets_merge_cells` | `rangeMerge` |
| `sheets_unmerge_cells` | `rangeUnmerge` |
| `sheets_set_column_width` | `columnWidth` |
| `sheets_freeze_rows` | `freezeRows` |
| `sheets_sort_range` | `rangeSort` |
| `sheets_set_formula` | `formulaSet` |
| `sheets_create_chart` | `chartCreate` |
| `sheets_set_note` | `noteSet` |
| `sheets_batch_get` | `valuesBatchGet` |
| `sheets_set_data_validation` | `dataValidationSet` |
| `sheets_get_conditional_formatting` | `conditionalFormatGet` |
| `sheets_insert_rows` | `rowsInsert` |
| `sheets_delete_rows` | `rowsDelete` |

### Slides

| Individual Tool | Batch `action` |
|---|---|
| `slides_get_presentation` | `presentationGet` |
| `slides_add_slide` | `slideAdd` |
| `slides_delete_slide` | `slideDelete` |
| `slides_duplicate_slide` | `slideDuplicate` |
| `slides_move_slide` | `slideMove` |
| `slides_insert_text_box` | `textBoxInsert` |
| `slides_insert_image` | `imageInsert` |
| `slides_insert_shape` | `shapeInsert` |
| `slides_insert_table` | `tableInsert` |
| `slides_get_slide_elements` | `slideElementsList` |
| `slides_get_element_text` | `elementGetText` |
| `slides_delete_element` | `elementDelete` |
| `slides_format_text` | `elementFormatText` |
| `slides_get_slide_notes` | `slideNotes` |
| `slides_replace_all_text` | `textReplaceAll` |
| `slides_insert_line` | `lineInsert` |
| `slides_set_slide_background` | `slideBackground` |

### Docs

| Individual Tool | Batch `action` |
|---|---|
| `docs_get_document` | `documentGet` |
| `docs_insert_paragraph` | `paragraphInsert` |
| `docs_update_paragraph` | `paragraphUpdate` |
| `docs_delete_paragraph` | `paragraphDelete` |
| `docs_set_text` | `setText` |
| `docs_replace_text` | `replaceText` |
| `docs_insert_list` | `listInsert` |
| `docs_insert_table` | `tableInsert` |
| `docs_insert_image` | `imageInsert` |
| `docs_insert_page_break` | `pageBreakInsert` |
| `docs_insert_horizontal_rule` | `horizontalRuleInsert` |
| `docs_format_text` | `formatText` |
| `docs_set_header` | `headerSet` |
| `docs_set_footer` | `footerSet` |
| `docs_get_as_json` | `documentGetJson` |

### Tasks

| Individual Tool | Batch `action` |
|---|---|
| `tasks_list_tasklists` | `tasklistsList` |
| `tasks_get_tasklist` | `tasklistsGet` |
| `tasks_create_tasklist` | `tasklistsCreate` |
| `tasks_update_tasklist` | `tasklistsUpdate` |
| `tasks_delete_tasklist` | `tasklistsDelete` |
| `tasks_list_tasks` | `tasksList` |
| `tasks_get_task` | `tasksGet` |
| `tasks_create_task` | `tasksCreate` |
| `tasks_update_task` | `tasksUpdate` |
| `tasks_delete_task` | `tasksDelete` |
| `tasks_move_task` | `tasksMove` |
| `tasks_clear_completed` | `tasksClear` |

### Forms

| Individual Tool | Batch `action` |
|---|---|
| `forms_create_form` | `formCreate` |
| `forms_get_form` | `formGet` |
| `forms_update_form` | `formUpdate` |
| `forms_set_accepting_responses` | `formSetAcceptingResponses` |
| `forms_set_response_destination` | `formSetDestination` |
| `forms_remove_response_destination` | `formRemoveDestination` |
| `forms_list_items` | `itemsList` |
| `forms_add_item` | `itemAdd` |
| `forms_update_item` | `itemUpdate` |
| `forms_move_item` | `itemMove` |
| `forms_delete_item` | `itemDelete` |
| `forms_list_responses` | `responsesList` |
| `forms_get_response` | `responseGet` |
| `forms_delete_response` | `responseDelete` |
| `forms_delete_all_responses` | `responsesDeleteAll` |

## Error Response Format

Each result entry in the `results` array has this shape:

```typescript
{
  index: number        // Zero-based operation index
  action: string       // The action name that was attempted
  success: boolean     // Whether the operation succeeded
  data?: unknown       // Present only when success is true
  error?: {            // Present only when success is false
    code: string       // Error code (UNAUTHORIZED, NOT_FOUND, BAD_REQUEST, INTERNAL_ERROR, etc.)
    message: string    // Human-readable error message
  }
}
```

!!! warning "The top-level `success` field is always `true` for a well-formed batch request"
    The batch itself succeeded (the array was processed). Check `results[].success` on each operation to determine individual failures.

## When to Use Batch vs Individual Tools

| Scenario | Use |
|---|---|
| Single read operation | Individual tool |
| Single write operation | Individual tool |
| **Compound spreadsheet setup** (create tab + write headers + format + freeze + set column widths) | **Batch** |
| **Compound slide creation** (add multiple slides with titles and text boxes) | **Batch** |
| **Compound document setup** (insert paragraphs, lists, tables, apply formatting) | **Batch** |
| Operations that **depend on previous results** (e.g., create file → get its ID → share it) | Individual tools |
| Operations across **different services** (Drive + Gmail) | Individual tools |
| Multiple quick-reads from the same service (e.g., fetch 3 files) | **Batch** |

Batch is most impactful for setup and formatting workflows where a large number of small mutations would otherwise create latency from sequential round-trips.

## Limits

- **Maximum 20 operations per batch.** Exceeding this returns `BAD_REQUEST`.
- Operations execute **sequentially** within the batch — not in parallel.
- All operations in a batch must target the **same service** (there is no cross-service batching).
- The overall batch call still counts as a single rate-limit token against the 100 req/min per-proxy limit.
