# Error Codes

All errors follow a consistent JSON structure:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing auth token"
  }
}
```

## Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| `UNAUTHORIZED` | Invalid or missing bearer token | Check `*_PROXY_TOKEN` env var; re-bootstrap if token was lost |
| `BAD_REQUEST` | Missing required parameter or invalid JSON body | Check parameter names and types against the tool schema |
| `CONTENT_TOO_LARGE` | File content exceeds size limit | Reduce file size or split into smaller operations |
| `ATTACHMENT_TOO_LARGE` | Email attachment exceeds size limit | Reduce attachment size or use a different delivery method |
| `NOT_FOUND` | Resource (file, email, event, spreadsheet, slide, document) not found | Verify the ID is correct and the resource exists |
| `FORBIDDEN` | Bootstrap already completed | Token is one-time; use the saved token |
| `RATE_LIMITED` | Exceeded 100 requests per minute | Wait 60 seconds; requests reset every minute |
| `INTERNAL_ERROR` | Unexpected server error | Check Apps Script logs via `clasp logs`; may indicate a code bug |
| `CREATE_FAILED` | Could not create resource | Usually a permissions issue or invalid input |
| `UPDATE_FAILED` | Could not update resource | Check you have edit access to the target |
| `DELETE_FAILED` | Could not delete resource | Check you have delete access or the resource is locked |
| `MOVE_FAILED` | Could not move resource | Check destination exists and you have access |
| `FORMAT_FAILED` | Could not apply formatting | Check the range/element exists and accepts formatting |
| `INSERT_FAILED` | Could not insert element | Check position is valid and element type is supported |
| `SEND_FAILED` | Email send operation failed | Check recipient addresses and message content |
| `UNKNOWN_ACTION` | Invalid action name in batch operation | Check action names match the service documentation |

## Batch Errors

In batch operations, errors are collected per-operation. A batch continues executing even if individual operations fail:

```json
{
  "success": true,
  "data": {
    "results": [
      { "index": 0, "action": "fileGet", "success": true, "data": { "..." } },
      { "index": 1, "action": "fileDelete", "success": false, "error": { "code": "NOT_FOUND", "message": "File not found" } },
      { "index": 2, "action": "fileCreate", "success": true, "data": { "..." } }
    ]
  }
}
```

Check each result's `success` field to determine if individual operations passed or failed.
