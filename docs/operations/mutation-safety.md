# Mutation Safety

Mutating tools are classified as atomic, idempotent, compensating, or explicitly partial. When a caller may retry after a timeout or transport error, pass a stable `idempotencyKey` on supported create, send, and share operations.

## Response Semantics

Successful atomic or idempotent mutations return the standard proxy envelope:

```json
{ "success": true, "data": { } }
```

Non-atomic workflows that complete only part of the requested work return explicit partial success:

```json
{
  "success": true,
  "data": { "status": "PARTIAL_SUCCESS" },
  "partial": true,
  "results": [
    { "action": "stepName", "success": false, "error": { "code": "STEP_FAILED", "message": "..." } }
  ],
  "warnings": ["Review the returned resource IDs before retrying."]
}
```

## Idempotency Keys

`idempotencyKey` is optional and caller-provided. Use a stable key for the same logical operation, such as an upstream job ID or a UUID stored by the caller before the first attempt.

Supported services persist successful mutation responses in Apps Script script properties. If the same key is seen again for the same service action, the stored response is returned with a warning and the mutation is not repeated.

Keys are scoped by service and action. Reusing the same key for a different action does not replay the old action.

## Critical Workflows

| Tool or action | Semantics | Retry guidance |
|---|---|---|
| `drive_move_file` / `fileMove` | Compensating. Destination parent is added before previous parents are removed, so destination-add failure cannot leave the file parentless. If old parent removal fails, response is `partial: true` with `failedParentRemovals`. | If partial, inspect returned file parents before retrying. Retrying is safe because the destination parent is already present and skipped. |
| `gmail_update_draft` / `updateDraft` | Compensating. Replacement draft is created before deleting the original. If original deletion fails, replacement rollback is attempted. If rollback also fails, response is `partial: true` with both draft IDs. | Use `idempotencyKey`. If partial, inspect both drafts before retrying to avoid duplicate draft content. |
| `calendar_create_event` / `createEvent` | Explicitly partial for guest invitations. Event creation is separated from guest addition. Invalid guest emails are rejected before creation. Guest add failures return `partial: true` with event ID and `failedGuests`. | Use `idempotencyKey`. If guests fail, retry guest handling manually against the returned event instead of creating another event. |
| `batch` | Explicitly partial. Operations run strictly sequentially. Failed operations do not stop later operations. Partial or full operation failures return top-level `partial: true` and per-operation `results`. | Treat batch retries as replaying the entire sequence unless every mutating operation has its own idempotency key or has been manually checked. |

## Retry Guidance

| Service | Non-idempotent operation | Idempotency support | Guidance |
|---|---|---|---|
| Drive | `drive_create_folder`, `drive_create_file`, `drive_copy_file`, `drive_add_comment`, `drive_create_reply` | `idempotencyKey` | Always provide a key when retrying after client timeout or network failure. Without a key, search by name/parent, comment content, or reply content before retrying. |
| Drive | `drive_set_sharing`, `drive_add_editor`, `drive_add_viewer` | `idempotencyKey` | These are repeat-tolerant but still accept keys so client retries can return the original response. |
| Drive | `drive_move_file` | Compensating, no key required | Retry only after checking parents if the previous response was unavailable. The operation adds the destination before removing old parents. |
| Drive | `drive_update_metadata`, `drive_update_content`, `drive_add_parent`, `drive_remove_parent`, `drive_trash_file`, `drive_untrash_file`, `drive_delete_file`, comment/reply updates and deletes, `drive_update_revision` | No key | These mutate existing resources. Retry only after reading current metadata, content, parents, trash state, comment/reply state, or revision state. Destructive actions require confirmation. |
| Gmail | `gmail_send`, `gmail_send_draft`, `gmail_reply`, `gmail_reply_all`, `gmail_forward` | `idempotencyKey` | Always provide a key if an automatic retry is possible. Without a key, do not retry blindly because messages may be sent twice. |
| Gmail | `gmail_create_draft`, `gmail_create_draft_reply`, `gmail_create_draft_reply_all`, `gmail_update_draft` | `idempotencyKey` | Provide a key to avoid duplicate drafts. For `gmail_update_draft` partial responses, inspect both draft IDs. |
| Gmail | `gmail_create_filter` | `idempotencyKey` | Provide a key to avoid duplicate filters. Forwarding filters also require confirmation and recipient allowlists when configured. |
| Gmail | `gmail_delete_draft`, `gmail_delete_filter`, `gmail_batch_modify`, label, archive, star, trash, vacation responder, and unread/read mutations | No key | Retry only after reading the current message, thread, draft, filter, vacation, or label state. Destructive actions require confirmation. |
| Calendar | `calendar_create_event`, `calendar_create_event_series`, `calendar_quick_add_event`, `calendar_create_calendar` | `idempotencyKey` | Provide a key to avoid duplicate events or secondary calendars. For partial guest failures, use the returned event ID and failed guest list. |
| Calendar | `calendar_update_event`, `calendar_delete_event`, `calendar_respond_to_event`, `calendar_set_event_color`, `calendar_update_calendar`, `calendar_delete_calendar`, `calendar_move_event` | No key | Retry only after reading the current event or calendar. Deletion requires confirmation. |
| Sheets | create, add, copy, write, append, format, sort, chart, validation, note, insert, and delete mutations | No key | Retry only after reading spreadsheet/sheet/range state. Batch requests may be partial. |
| Docs | create, insert, update, delete, set, replace, format, header, footer, image, table, list, and page mutations | No key | Retry only after reading the document. Batch requests may be partial. |
| Slides | create, add, delete, duplicate, move, insert, format, replace, notes, background mutations | No key | Retry only after reading the presentation and slide elements. Batch requests may be partial. |
