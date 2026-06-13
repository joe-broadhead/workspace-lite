# Batch Operations

Every service exposes a `batch` tool that executes up to 20 operations in a single HTTP round-trip. Instead of making N separate calls for a compound task (create a file, then set its sharing, then move it), you pack them into one request and get a single response with per-operation results.

## How It Works

The batch endpoint on the Apps Script proxy receives an ordered array of `{action, params}` objects, executes them sequentially, and returns a `results` array — one entry per operation. Execution is **strictly sequential**, so operation N+1 sees the effects of operations 1 through N. If an operation fails, execution continues through the remaining operations; errors are collected alongside successes.

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
  "token": "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789aBcDeFgH",
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
}
```

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

### Calendar

| Individual Tool | Batch `action` |
|---|---|
| `calendar_list_calendars` | `calendarList` |
| `calendar_get_calendar` | `calendarGet` |
| `calendar_list_events` | `eventsList` |
| `calendar_search_events` | `eventsSearch` |
| `calendar_find_freebusy` | `freeBusy` |
| `calendar_get_event` | `eventGet` |
| `calendar_create_event` | `eventCreate` |
| `calendar_update_event` | `eventUpdate` |
| `calendar_delete_event` | `eventDelete` |

### Sheets

| Individual Tool | Batch `action` |
|---|---|
| `sheets_create_spreadsheet` | `spreadsheetCreate` |
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
| `slides_delete_element` | `elementDelete` |
| `slides_format_text` | `elementFormatText` |
| `slides_get_slide_notes` | `slideNotes` |
| `slides_replace_all_text` | `textReplaceAll` |

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

## Error Response Format

Each result entry in the `results` array has this shape:

```typescript
{
  index: number        // Zero-based operation index
  action: string       // The action name that was attempted
  success: boolean     // Whether the operation succeeded
  data?: unknown       // Present only when success is true
  error?: {            // Present only when success is false
    code: string       // Error code (UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR, INTERNAL_ERROR, etc.)
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
