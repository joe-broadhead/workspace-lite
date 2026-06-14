# Tool Catalog

## Drive — 44 tools

| Category | Tool | Params |
|---|---|---|
| Browse | `drive_list_folders` | `folderId` (omit for root) |
| List | `drive_list_files` | `folderId`, `pageSize`, `pageToken` |
| Search | `drive_search_files` | `query` ("name contains 'X'", "fullText contains 'Y'", "mimeType = 'application/pdf'") |
| Read | `drive_read_file` | `fileId` |
| Export | `drive_export_as` | `fileId`, `mimeType` (e.g. "application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") |
| Metadata | `drive_get_file` | `fileId` |
| Folder info | `drive_get_folder` | `folderId` |
| Folder path | `drive_get_folder_path` | `fileId` — walks parents up to root |
| Create file | `drive_create_file` | `name`, `content`, `mimeType`, `parentId` |
| Create folder | `drive_create_folder` | `name`, `parentId` |
| Update content | `drive_update_content` | `fileId`, `content` |
| Rename/describe | `drive_update_metadata` | `fileId`, `name?`, `description?` |
| Copy | `drive_copy_file` | `fileId`, `name?`, `destFolderId?` |
| Move | `drive_move_file` | `fileId`, `destFolderId` |
| Add parent | `drive_add_parent` | `fileId`, `folderId` — adds without removing existing parents |
| Remove parent | `drive_remove_parent` | `fileId`, `folderId` |
| Permissions | `drive_get_permissions` | `fileId` |
| Share | `drive_set_sharing` | `fileId`, `access`, `permission` |
| Add people | `drive_add_editor` / `drive_add_viewer` | `fileId`, `email` |
| Remove people | `drive_remove_editor` / `drive_remove_viewer` | `fileId`, `email` |
| Comments | `drive_get_comments` | `fileId` — returns id, content, author, createdTime, resolved |
| Add comment | `drive_add_comment` | `fileId`, `content` — head-anchored comment |
| Get comment | `drive_get_comment` | `fileId`, `commentId` |
| Update comment | `drive_update_comment` | `fileId`, `commentId`, `content?`, `resolved?` |
| Delete comment | `drive_delete_comment` | `fileId`, `commentId`, `confirm` |
| List replies | `drive_list_replies` | `fileId`, `commentId`, `pageSize?`, `pageToken?` |
| Create reply | `drive_create_reply` | `fileId`, `commentId`, `content`, `idempotencyKey?` |
| Get reply | `drive_get_reply` | `fileId`, `commentId`, `replyId` |
| Update reply | `drive_update_reply` | `fileId`, `commentId`, `replyId`, `content` |
| Delete reply | `drive_delete_reply` | `fileId`, `commentId`, `replyId`, `confirm` |
| Revisions | `drive_list_revisions` / `drive_get_revision` | `fileId`, `revisionId?` |
| Update revision | `drive_update_revision` | `fileId`, `revisionId`, `keepForever` |
| Shared drives | `drive_list_shared_drives` / `drive_get_shared_drive` | `pageSize?`, `pageToken?`, `query?`, `driveId` |
| Changes | `drive_get_start_page_token` / `drive_list_changes` | `driveId?`, then `pageToken`, `pageSize?` |
| Trash | `drive_trash_file` | `fileId` |
| Restore | `drive_untrash_file` | `fileId` |
| Delete | `drive_delete_file` | `fileId` |
| Quota | `drive_about` | none |
| **Batch** | `drive_batch` | `operations` — array of `{action, params}`, up to 20. Same action names as individual tools. Executes sequentially; errors collected per-operation. |

## Gmail — 39 tools

**Read:**
| Tool | Params |
|---|---|
| `gmail_search_messages` | `query`, `from`, `to`, `subject`, `isUnread`, `isStarred`, `before`, `after`, `label`, `maxResults`, `page` |
| `gmail_list_threads` | same filters as search_messages |
| `gmail_get_message` | `messageId` |
| `gmail_get_thread` | `threadId` |
| `gmail_get_attachment` | `messageId`, `attachmentId` — downloads attachment, returns base64 (binary) or plain text |
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
| `gmail_batch_modify` | `messageIds` (array), `addLabels?` (array), `removeLabels?` (array) — bulk label changes |

**Settings:**
| Tool | Params |
|---|---|
| `gmail_list_filters` | none |
| `gmail_get_filter` | `filterId` |
| `gmail_create_filter` | criteria: `from?`, `to?`, `subject?`, `query?`, `negatedQuery?`, `hasAttachment?`, `excludeChats?`, `size?`, `sizeComparison?` (`smaller`/`larger`); actions: `addLabels?`, `removeLabels?`, `forward?`; `idempotencyKey?`, `confirm?` |
| `gmail_delete_filter` | `filterId`, `confirm` |
| `gmail_get_vacation_responder` | none |
| `gmail_update_vacation_responder` | `enableAutoReply?`, `responseSubject?`, `responseBodyPlainText?`, `responseBodyHtml?`, `restrictToContacts?`, `restrictToDomain?`, `startTime?`, `endTime?`, `clearStartTime?`, `clearEndTime?`, `confirm?` |

**Trash:**
| Tool | Params |
|---|---|
| `gmail_trash_message` / `gmail_untrash_message` | `messageId` |
| `gmail_trash_thread` / `gmail_untrash_thread` | `threadId` |
| `gmail_delete_message` | `messageId` |

| **Batch** | `gmail_batch` | `operations` — array of `{action, params}`, up to 20. Executes sequentially; errors collected per-operation. |

## Calendar — 22 tools

| Tool | Params |
|---|---|
| `calendar_list_calendars` | none |
| `calendar_get_colors` | none |
| `calendar_list_settings` | `maxResults?`, `pageToken?` |
| `calendar_get_setting` | `setting` (e.g. `timezone`) |
| `calendar_get_calendar` | `calendarId?` |
| `calendar_create_calendar` | `summary`, `description?`, `location?`, `timeZone?`, `idempotencyKey?` |
| `calendar_update_calendar` | `calendarId`, `summary?`, `description?`, `location?`, `timeZone?` |
| `calendar_delete_calendar` | `calendarId`, `confirm` — rejects primary/default calendar |
| `calendar_list_events` | `calendarId?`, `timeMin?`, `timeMax?`, `maxResults`, `page` |
| `calendar_search_events` | `query`, `timeMin?`, `timeMax?`, `maxResults` |
| `calendar_get_event` | `eventId`, `calendarId?` |
| `calendar_get_event_instances` | `eventId`, `calendarId?` (default "primary"), `timeMin?`, `timeMax?` — expand recurring events into concrete instances |
| `calendar_create_event` | `title`, `startTime`, `endTime`, `description?`, `location?`, `guests?`, `calendarId?`, `createMeetLink?` |
| `calendar_create_event_series` | `title`, `startTime`, `endTime`, `recurrence` (RRULE e.g. "WEEKLY", "MONTHLY", "EVERY MONDAY"), `description?`, `location?`, `calendarId?` |
| `calendar_quick_add_event` | `text` — natural language (e.g. "Lunch with Sarah tomorrow at noon"), `calendarId?` (default "primary") |
| `calendar_update_event` | `eventId`, any optional field to change, `createMeetLink?` |
| `calendar_move_event` | `eventId`, `calendarId`, `destinationCalendarId`, `sendUpdates?` |
| `calendar_delete_event` | `eventId`, `calendarId?` |
| `calendar_respond_to_event` | `eventId`, `status` (YES/NO/MAYBE), `calendarId?` |
| `calendar_set_event_color` | `eventId`, `color` (PALE_BLUE/PALE_GREEN/MAUVE/PALE_RED/YELLOW/ORANGE/CYAN/GRAY/BLUE/GREEN/RED), `calendarId?` |
| `calendar_find_freebusy` | `timeMin?`, `timeMax?` |
| **Batch** | `calendar_batch` | `operations` — array of `{action, params}`, up to 20. Executes sequentially; errors collected per-operation. |

## Sheets — 33 tools

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
| `sheets_read_formulas` | `spreadsheetId`, `sheetName?`, `range?` — returns formulas and display values alongside raw values |
| `sheets_batch_get` | `spreadsheetId`, `ranges` (array of A1 strings, e.g. ["Sheet1!A1:B10", "Sheet2!C1:D20"]) — read multiple ranges in one API call |
| `sheets_find_text` | `spreadsheetId`, `findText`, `sheetName?`, `range?`, `maxResults?`, TextFinder options: `matchCase?`, `matchEntireCell?`, `matchFormulaText?`, `useRegularExpression?`, `ignoreDiacritics?` |
| `sheets_write_range` | `spreadsheetId`, `range`, `values` (2D array), `sheetName?` |
| `sheets_append_rows` | `spreadsheetId`, `values` (2D array), `sheetName?` |
| `sheets_clear_range` | `spreadsheetId`, `range?` (omit for entire sheet), `sheetName?` |
| `sheets_insert_rows` | `spreadsheetId`, `startPosition` (1-based), `howMany?` (default 1), `sheetName?` — existing rows shift down |
| `sheets_delete_rows` | `spreadsheetId`, `startPosition` (1-based), `howMany?` (default 1), `sheetName?` — existing rows shift up |
| `sheets_set_formula` | `spreadsheetId`, `range`, `formula` (e.g. "=SUM(A1:A10)"), `sheetName?` |
| `sheets_replace_text` | `spreadsheetId`, `findText`, `replaceText`, `sheetName?`, `range?`, TextFinder options — plain text replacement only |

**Format:**
| Tool | Params |
|---|---|
| `sheets_format_range` | `spreadsheetId`, `range`, `sheetName?`, then any of: `background`, `fontColor`, `fontFamily`, `fontSize`, `bold`, `italic`, `underline`, `strikethrough`, `horizontalAlignment` (left/center/right/general), `verticalAlignment` (top/middle/bottom), `numberFormat` ("#,##0.00", "0.00%", "$#,##0.00", "yyyy-mm-dd", "@"), `textWrap`, `borderTop`, `borderBottom`, `borderLeft`, `borderRight`, `borderStyle` (SOLID/DOTTED/DASHED/DOUBLE), `borderColor` |
| `sheets_merge_cells` | `spreadsheetId`, `range`, `sheetName?` |
| `sheets_unmerge_cells` | `spreadsheetId`, `range`, `sheetName?` |
| `sheets_set_column_width` | `spreadsheetId`, `column` (1-based), `width` (px), `sheetName?` |
| `sheets_freeze_rows` | `spreadsheetId`, `numRows` (0 to unfreeze), `sheetName?` |
| `sheets_set_data_validation` | `spreadsheetId`, `range`, `validationType` (VALUE_IN_LIST/NUMBER_BETWEEN/NUMBER_GREATER_THAN/NUMBER_LESS_THAN/TEXT_CONTAINS/TEXT_IS_VALID_EMAIL/TEXT_IS_VALID_URL/DATE_BEFORE/DATE_AFTER/CHECKBOX/CUSTOM_FORMULA), `sheetName?`, then: `values?` (array for VALUE_IN_LIST), `min?`/`max?` (for NUMBER_BETWEEN), `value?` (for NUMBER_GREATER_THAN etc.), `text?` (for TEXT_CONTAINS), `date?` (ISO string for DATE_), `formula?` (for CUSTOM_FORMULA), `helpText?`, `strict?` (reject invalid input) |
| `sheets_get_conditional_formatting` | `spreadsheetId`, `sheetName?` — read existing conditional format rules |
| `sheets_list_protections` | `spreadsheetId`, `sheetName?`, `type?` (RANGE/SHEET), `range?`, `description?` — returns filtered indexes |
| `sheets_protect_range` | `spreadsheetId`, `range`, `sheetName?`, `description?`, `warningOnly?`, `editors?`, `domainEdit?` |
| `sheets_protect_sheet` | `spreadsheetId`, `sheetName?`, `description?`, `warningOnly?`, `unprotectedRanges?`, `editors?`, `domainEdit?` |
| `sheets_remove_protection` | `spreadsheetId`, `type` (RANGE/SHEET), `sheetName?`, `range?`, `description?`, `index?`, `confirm` |
| `sheets_get_notes` | `spreadsheetId`, `sheetName?`, `range?` — read cell notes |

**Other:**
| Tool | Params |
|---|---|
| `sheets_sort_range` | `spreadsheetId`, `range`, `sortColumn` (1-based, relative to range), `ascending?` (default true), `sheetName?` |
| `sheets_create_chart` | `spreadsheetId`, `range`, `chartType` (AREA/BAR/COLUMN/COMBO/HISTOGRAM/LINE/PIE/SCATTER/TABLE/TIMELINE/WATERFALL), `title?`, `xAxisTitle?`, `yAxisTitle?`, `position?` (A1 anchor), `width?`, `height?`, `legendPosition?` (BOTTOM/TOP/LEFT/RIGHT/NONE/LABELED), `stacked?`, `sheetName?` |
| `sheets_set_note` | `spreadsheetId`, `range`, `note` (empty string clears), `sheetName?` |
| **Batch** | `sheets_batch` | `operations` — array of `{action, params}`, up to 20. Same action names as individual tools. Executes sequentially; errors collected per-operation. |

## Slides — 25 tools

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
| `slides_insert_text_box` | `presentationId`, `slideIndex`, `text`, `autoPosition?` (default true), `left?`, `top?`, `width?`, `height?` |
| `slides_insert_image` | `presentationId`, `slideIndex`, `imageUrl`, `autoPosition?` (default true), `left?`, `top?`, `width?`, `height?` |
| `slides_insert_shape` | `presentationId`, `slideIndex`, `shapeType` (RECTANGLE/ROUND_RECTANGLE/ELLIPSE/TRIANGLE/ARROW_RIGHT/ARROW_LEFT/STAR_5/HEXAGON/CLOUD/FLOW_CHART_PROCESS/FLOW_CHART_DECISION/WAVE/CHEVRON/PENTAGON/TRAPEZOID), `autoPosition?` (default true), `left?`, `top?`, `width?`, `height?` |
| `slides_insert_table` | `presentationId`, `slideIndex`, `values` (2D array), `rows?`, `cols?`, `autoPosition?` (default true), `left?`, `top?`, `width?`, `height?` |
| `slides_insert_line` | `presentationId`, `slideIndex`, `lineCategory` (STRAIGHT/BENT/CURVED), `startLeft`, `startTop`, `endLeft`, `endTop`, `lineType?` (SOLID/DOTTED/DASHED, default SOLID) |
| `slides_set_slide_background` | `presentationId`, `slideIndex`, `color` (hex e.g. "#FF0000") |

**Read:**
| Tool | Params |
|---|---|
| `slides_get_slide_elements` | `presentationId`, `slideIndex` — returns up to 200 elements with types, IDs, positions, dimensions, text |
| `slides_get_element` | `presentationId`, `slideIndex`, `objectId` — returns one element with geometry, rotation, alt text, and link metadata |
| `slides_get_element_text` | `presentationId`, `slideIndex`, `objectId` — read text from one shape/text element |
| `slides_get_slide_notes` | `presentationId`, `slideIndex`, `notes?` (provide to set, omit to get) |

**Operations:**
| Tool | Params |
|---|---|
| `slides_delete_element` | `presentationId`, `slideIndex`, `objectId` — delete a page element by its objectId |
| `slides_format_text` | `presentationId`, `slideIndex`, `objectId`, `findText`, then any of: `bold?`, `italic?`, `underline?`, `fontFamily?`, `fontSize?`, `foregroundColor?`, `backgroundColor?`, `linkUrl?` |
| `slides_update_element_geometry` | `presentationId`, `slideIndex`, `objectId`, any of `left?`, `top?`, `width?`, `height?`, `rotation?` |
| `slides_update_element_transform` | `presentationId`, `slideIndex`, `objectId`, `applyMode?` (ABSOLUTE/RELATIVE), `unit?` (PT/EMU), `scaleX?`, `scaleY?`, `shearX?`, `shearY?`, `translateX?`, `translateY?` |
| `slides_set_element_alt_text` | `presentationId`, `slideIndex`, `objectId`, `title?`, `description?` |
| `slides_set_element_link` | `presentationId`, `slideIndex`, `objectId`, exactly one of `linkUrl?`, `targetSlideIndex?`, `clear?` |
| `slides_reorder_element` | `presentationId`, `slideIndex`, `objectId`, `operation` (BRING_FORWARD/BRING_TO_FRONT/SEND_BACKWARD/SEND_TO_BACK) |
| `slides_replace_all_text` | `presentationId`, `findText`, `replaceText` |
| **Batch** | `slides_batch` | `presentationId`, `operations` — array of `{action, params}`, up to 20. Executes sequentially; errors collected per-operation. |

## Docs — 26 tools

**Manage:**
| Tool | Params |
|---|---|
| `docs_create_document` | `name` |
| `docs_get_document` | `documentId` — returns metadata, URL, full text with paragraph breakdown |
| `docs_get_as_json` | `documentId` — returns full structured document tree via Docs Advanced Service |

**Content:**
| Tool | Params |
|---|---|
| `docs_insert_paragraph` | `documentId`, `text?`, `heading?` (NORMAL/HEADING1-6), `append?` (default true) |
| `docs_update_paragraph` | `documentId`, `paragraphIndex` (0-based), `heading?`, `text?` |
| `docs_delete_paragraph` | `documentId`, `paragraphIndex` (0-based) |
| `docs_insert_list` | `documentId`, `items` (array of strings), `listType?` (BULLET/NUMBER, default BULLET), `append?` (default true) |
| `docs_insert_table` | `documentId`, `values` (2D array, first row is header), `rows?`, `cols?`, `append?` (default true) |
| `docs_insert_image` | `documentId`, `imageUrl`, `append?` (default true) |
| `docs_insert_horizontal_rule` | `documentId`, `append?` (default true) |
| `docs_insert_page_break` | `documentId`, `append?` (default true) |

**Edit:**
| Tool | Params |
|---|---|
| `docs_set_text` | `documentId`, `text` — replaces entire document body |
| `docs_replace_text` | `documentId`, `findText`, `replaceText` — find and replace across entire doc |
| `docs_format_text` | `documentId`, `findText`, then any of: `bold?`, `italic?`, `underline?`, `strikethrough?`, `fontFamily?`, `fontSize?`, `foregroundColor?`, `backgroundColor?`, `linkUrl?` |

**Layout:**
| Tool | Params |
|---|---|
| `docs_set_header` | `documentId`, `text` (empty string to clear) |
| `docs_set_footer` | `documentId`, `text` (empty string to clear) |
| `docs_get_page_setup` | `documentId` — returns page width, page height, and margins in points |
| `docs_update_page_setup` | `documentId`, any of `pageWidth?`, `pageHeight?`, `marginTop?`, `marginBottom?`, `marginLeft?`, `marginRight?` |
| `docs_list_bookmarks` | `documentId` |
| `docs_create_bookmark` | `documentId`, `paragraphIndex`, `offset?` |
| `docs_delete_bookmark` | `documentId`, `bookmarkId`, `confirm` |
| `docs_list_named_ranges` | `documentId`, `name?` |
| `docs_create_named_range` | `documentId`, `name`, `paragraphIndex`, `startOffset?`, `endOffsetInclusive?` |
| `docs_delete_named_range` | `documentId`, `namedRangeId`, `confirm` |
| `docs_list_table_of_contents` | `documentId` — list existing table-of-contents elements with child indexes and text previews |

| **Batch** | `docs_batch` | `documentId`, `operations` — array of `{action, params}`, up to 20. Executes sequentially; errors collected per-operation. |

## Tasks — 13 tools

**Task Lists:**
| Tool | Params |
|---|---|
| `tasks_list_tasklists` | `maxResults?`, `pageToken?` |
| `tasks_get_tasklist` | `tasklistId` |
| `tasks_create_tasklist` | `title`, `idempotencyKey?` |
| `tasks_update_tasklist` | `tasklistId`, `title` |
| `tasks_delete_tasklist` | `tasklistId`, `confirm` |

**Tasks:**
| Tool | Params |
|---|---|
| `tasks_list_tasks` | `tasklistId`, `maxResults?`, `pageToken?`, `showCompleted?`, `showDeleted?`, `showHidden?`, `completedMin?`, `completedMax?`, `dueMin?`, `dueMax?`, `updatedMin?` |
| `tasks_get_task` | `tasklistId`, `taskId` |
| `tasks_create_task` | `tasklistId`, `title`, `notes?`, `due?`, `status?`, `parent?`, `previous?`, `idempotencyKey?` |
| `tasks_update_task` | `tasklistId`, `taskId`, then any of: `title?`, `notes?`, `due?`, `status?` (`needsAction`/`completed`) |
| `tasks_delete_task` | `tasklistId`, `taskId`, `confirm` |
| `tasks_move_task` | `tasklistId`, `taskId`, `parent?`, `previous?` |
| `tasks_clear_completed` | `tasklistId`, `confirm` |
| **Batch** | `tasks_batch` | `operations` — array of `{action, params}`, up to 20. Executes sequentially; errors collected per-operation. |

## Forms — 16 tools

**Manage Forms:**
| Tool | Params |
|---|---|
| `forms_create_form` | `title`, `description?`, `isPublished?`, `idempotencyKey?` |
| `forms_get_form` | `formId`, `includeItems?` |
| `forms_update_form` | `formId`, then any of: `title?`, `description?`, `confirmationMessage?`, `customClosedFormMessage?`, `collectEmail?`, `allowResponseEdits?`, `limitOneResponsePerUser?`, `publishingSummary?`, `isPublished?`, `showLinkToRespondAgain?`, `requireLogin?`, `progressBar?`, `quiz?` |
| `forms_set_accepting_responses` | `formId`, `acceptingResponses`, `customClosedFormMessage?` |
| `forms_set_response_destination` | `formId`, `spreadsheetId` |
| `forms_remove_response_destination` | `formId`, `confirm` |

**Items:**
| Tool | Params |
|---|---|
| `forms_list_items` | `formId` |
| `forms_add_item` | `formId`, `itemType`, `index?`, `title?`, `helpText?`, `required?`, `choices?`, `showOtherOption?`, `lowerBound?`, `upperBound?`, `leftLabel?`, `rightLabel?`, `idempotencyKey?` |
| `forms_update_item` | `formId`, `itemId`, then any common or item-specific field accepted by `forms_add_item` |
| `forms_move_item` | `formId`, `itemId`, `index` |
| `forms_delete_item` | `formId`, `itemId`, `confirm` |

**Responses:**
| Tool | Params |
|---|---|
| `forms_list_responses` | `formId`, `maxResults?`, `page?`, `includeAnswers?` |
| `forms_get_response` | `formId`, `responseId` |
| `forms_delete_response` | `formId`, `responseId`, `confirm` |
| `forms_delete_all_responses` | `formId`, `confirm` |
| **Batch** | `forms_batch` | `operations` — array of `{action, params}`, up to 20. Executes sequentially; errors collected per-operation. |
