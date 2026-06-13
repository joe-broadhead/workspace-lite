# Tool Catalog

## Drive — 22 tools

| Category | Tool | Params |
|---|---|---|
| Browse | `drive_list_folders` | `folderId` (omit for root) |
| List | `drive_list_files` | `folderId`, `pageSize`, `pageToken` |
| Search | `drive_search_files` | `query` ("name contains 'X'", "fullText contains 'Y'", "mimeType = 'application/pdf'") |
| Read | `drive_read_file` | `fileId` |
| Metadata | `drive_get_file` | `fileId` |
| Folder info | `drive_get_folder` | `folderId` |
| Create file | `drive_create_file` | `name`, `content`, `mimeType`, `parentId` |
| Create folder | `drive_create_folder` | `name`, `parentId` |
| Update content | `drive_update_content` | `fileId`, `content` |
| Rename/describe | `drive_update_metadata` | `fileId`, `name?`, `description?` |
| Copy | `drive_copy_file` | `fileId`, `name?`, `destFolderId?` |
| Move | `drive_move_file` | `fileId`, `destFolderId` |
| Permissions | `drive_get_permissions` | `fileId` |
| Share | `drive_set_sharing` | `fileId`, `access`, `permission` |
| Add people | `drive_add_editor` / `drive_add_viewer` | `fileId`, `email` |
| Remove people | `drive_remove_editor` / `drive_remove_viewer` | `fileId`, `email` |
| Trash | `drive_trash_file` | `fileId` |
| Restore | `drive_untrash_file` | `fileId` |
| Delete | `drive_delete_file` | `fileId` |
| Quota | `drive_about` | none |

## Gmail — 30 tools

**Read:**
| Tool | Params |
|---|---|
| `gmail_search_messages` | `query`, `from`, `to`, `subject`, `isUnread`, `isStarred`, `before`, `after`, `label`, `maxResults`, `page` |
| `gmail_list_threads` | same filters as search_messages |
| `gmail_get_message` | `messageId` |
| `gmail_get_thread` | `threadId` |
| `gmail_list_labels` | none |
| `gmail_profile` | none |

**Send & Reply:**
| Tool | Params |
|---|---|
| `gmail_send` | `to`, `subject`, `body`, `cc?`, `bcc?`, `htmlBody?` |
| `gmail_reply` | `messageId`, `body`, `htmlBody?` |
| `gmail_reply_all` | `messageId`, `body`, `htmlBody?` |
| `gmail_forward` | `messageId`, `to`, `htmlBody?` |

**Drafts:**
| Tool | Params |
|---|---|
| `gmail_create_draft` | `to`, `subject`, `body`, `cc?`, `bcc?` |
| `gmail_create_draft_reply` | `messageId`, `body`, `cc?`, `bcc?`, `htmlBody?` |
| `gmail_create_draft_reply_all` | `messageId`, `body`, `cc?`, `bcc?`, `htmlBody?` |
| `gmail_list_drafts` | `maxResults?` |
| `gmail_get_draft` | `draftId` |
| `gmail_update_draft` | `draftId`, `to?`, `subject?`, `body?`, `cc?`, `bcc?` |
| `gmail_delete_draft` | `draftId` |
| `gmail_send_draft` | `draftId` |

**Organize:**
| Tool | Params |
|---|---|
| `gmail_mark_read` / `gmail_mark_unread` | `messageId` |
| `gmail_archive` | `messageId` |
| `gmail_star` / `gmail_unstar` | `messageId` |
| `gmail_add_label` / `gmail_remove_label` | `messageId`, `labelName` |

**Trash:**
| Tool | Params |
|---|---|
| `gmail_trash_message` / `gmail_untrash_message` | `messageId` |
| `gmail_trash_thread` / `gmail_untrash_thread` | `threadId` |
| `gmail_delete_message` | `messageId` |

## Calendar — 9 tools

| Tool | Params |
|---|---|
| `calendar_list_calendars` | none |
| `calendar_get_calendar` | `calendarId?` |
| `calendar_list_events` | `calendarId?`, `timeMin?`, `timeMax?`, `maxResults`, `page` |
| `calendar_search_events` | `query`, `timeMin?`, `timeMax?`, `maxResults` |
| `calendar_get_event` | `eventId`, `calendarId?` |
| `calendar_create_event` | `title`, `startTime`, `endTime`, `description?`, `location?`, `guests?`, `calendarId?` |
| `calendar_update_event` | `eventId`, any optional field to change |
| `calendar_delete_event` | `eventId`, `calendarId?` |
| `calendar_find_freebusy` | `timeMin?`, `timeMax?` |

## Sheets — 19 tools

**Manage:**
| Tool | Params |
|---|---|
| `sheets_create_spreadsheet` | `name` |
| `sheets_get_spreadsheet` | `spreadsheetId` |
| `sheets_add_sheet` | `spreadsheetId`, `sheetName` |
| `sheets_delete_sheet` | `spreadsheetId`, `sheetName` |
| `sheets_rename_sheet` | `spreadsheetId`, `oldName`, `newName` |
| `sheets_copy_sheet` | `spreadsheetId`, `sheetName`, `destSpreadsheetId?`, `newName?` |

**Data:**
| Tool | Params |
|---|---|
| `sheets_read_range` | `spreadsheetId`, `sheetName?`, `range?` (A1 notation, omit for all data) |
| `sheets_write_range` | `spreadsheetId`, `range`, `values` (2D array), `sheetName?` |
| `sheets_append_rows` | `spreadsheetId`, `values` (2D array), `sheetName?` |
| `sheets_clear_range` | `spreadsheetId`, `range?` (omit for entire sheet), `sheetName?` |
| `sheets_set_formula` | `spreadsheetId`, `range`, `formula` (e.g. "=SUM(A1:A10)"), `sheetName?` |

**Format:**
| Tool | Params |
|---|---|
| `sheets_format_range` | `spreadsheetId`, `range`, `sheetName?`, then any of: `background`, `fontColor`, `fontFamily`, `fontSize`, `bold`, `italic`, `underline`, `strikethrough`, `horizontalAlignment` (left/center/right/general), `verticalAlignment` (top/middle/bottom), `numberFormat` ("#,##0.00", "0.00%", "$#,##0.00", "yyyy-mm-dd", "@"), `textWrap`, `borderTop`, `borderBottom`, `borderLeft`, `borderRight`, `borderStyle` (SOLID/DOTTED/DASHED/DOUBLE), `borderColor` |
| `sheets_merge_cells` | `spreadsheetId`, `range`, `sheetName?` |
| `sheets_unmerge_cells` | `spreadsheetId`, `range`, `sheetName?` |
| `sheets_set_column_width` | `spreadsheetId`, `column` (1-based), `width` (px), `sheetName?` |
| `sheets_freeze_rows` | `spreadsheetId`, `numRows` (0 to unfreeze), `sheetName?` |

**Other:**
| Tool | Params |
|---|---|
| `sheets_sort_range` | `spreadsheetId`, `range`, `sortColumn` (1-based, relative to range), `ascending?` (default true), `sheetName?` |
| `sheets_create_chart` | `spreadsheetId`, `range`, `chartType` (AREA/BAR/COLUMN/COMBO/HISTOGRAM/LINE/PIE/SCATTER/TABLE/TIMELINE/WATERFALL), `title?`, `xAxisTitle?`, `yAxisTitle?`, `position?` (A1 anchor), `width?`, `height?`, `legendPosition?` (BOTTOM/TOP/LEFT/RIGHT/NONE/LABELED), `stacked?`, `sheetName?` |
| `sheets_set_note` | `spreadsheetId`, `range`, `note` (empty string clears), `sheetName?` |
| `sheets_batch` | `operations` — array of `{action, params}`, up to 20. Same action names as individual tools. Executes sequentially; errors collected per-operation. |

## Slides — 14 tools

**Manage:**
| Tool | Params |
|---|---|
| `slides_create_presentation` | `name` |
| `slides_get_presentation` | `presentationId` |
| `slides_add_slide` | `presentationId`, `titleText?`, `bodyText?` |
| `slides_delete_slide` | `presentationId`, `slideIndex` (0-based) |
| `slides_duplicate_slide` | `presentationId`, `slideIndex` |
| `slides_move_slide` | `presentationId`, `slideIndex`, `newIndex` |

**Content:**
| Tool | Params |
|---|---|
| `slides_insert_text_box` | `presentationId`, `slideIndex`, `text`, `left?`, `top?`, `width?`, `height?` |
| `slides_insert_image` | `presentationId`, `slideIndex`, `imageUrl`, `left?`, `top?`, `width?`, `height?` |
| `slides_insert_shape` | `presentationId`, `slideIndex`, `shapeType` (RECTANGLE/ROUND_RECTANGLE/ELLIPSE/TRIANGLE/ARROW_RIGHT/ARROW_LEFT/STAR_5/HEXAGON/CLOUD/FLOW_CHART_PROCESS/FLOW_CHART_DECISION/WAVE/CHEVRON/PENTAGON/TRAPEZOID), `left?`, `top?`, `width?`, `height?` |
| `slides_insert_table` | `presentationId`, `slideIndex`, `values` (2D array), `rows?`, `cols?`, `left?`, `top?`, `width?`, `height?` |

**Read:**
| Tool | Params |
|---|---|
| `slides_get_slide_elements` | `presentationId`, `slideIndex` |
| `slides_get_slide_notes` | `presentationId`, `slideIndex`, `notes?` (provide to set, omit to get) |

**Operations:**
| Tool | Params |
|---|---|
| `slides_replace_all_text` | `presentationId`, `findText`, `replaceText` |
| `slides_batch` | `presentationId`, `operations` — array of `{action, params}`, up to 20. Executes sequentially; errors collected per-operation. |
