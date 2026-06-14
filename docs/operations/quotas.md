# Quotas & Limits

All quotas are enforced by Google and apply per Google account. This page documents the constraints you'll encounter when using the Apps Script MCP servers.

## Apps Script Quotas

These limits apply to every Apps Script web app deployment:

| Limit | Value | Notes |
|---|---|---|
| **Execution time** | 6 minutes per request | After 6 min, the script is terminated. Batch operations share this time budget across all operations. |
| **URL Fetch calls** | 20,000 per day | The proxy itself doesn't make outbound URL Fetch calls during normal operation, but Apps Script internal API calls may count against this if they use UrlFetchApp under the hood. |
| **Total trigger runtime** | 90 minutes per day (consumer) / 6 hours (Workspace) | Not relevant for web app deployments (no triggers used). |
| **Simultaneous executions** | 30 | Max concurrent web app requests. |
| **Script property storage** | 500 KB per script | Token and bootstrap flag consume < 200 bytes. Not a practical concern. |
| **CacheService storage** | 100 KB per script | Rate limit counters use ~10 bytes per key. Not a practical concern. |

_Source: [Google Apps Script Quotas](https://developers.google.com/apps-script/guides/services/quotas)_

## Per-Proxy Rate Limiting

Each proxy applies its own rate limit, independent of Google API quotas:

| Limit | Value |
|---|---|
| **Requests per minute** | 100 per proxy |
| **Authenticated request cost** | Weighted by action risk and batch operations |
| **Failed authentication attempts** | 20 per minute per supplied token/missing-token bucket |
| **Reset window** | 60 seconds |
| **Error when exceeded** | `RATE_LIMITED: "Too many requests. Try again in 60 seconds."` |

This rate limit is enforced by `CacheService.getScriptCache()` under a script lock in the Apps Script proxy layer and is **independent** of the per-API quotas below. If the lock cannot be acquired, the request fails closed as rate-limited.

## Enforced Proxy Limits

The proxy rejects requests before or immediately after bounded API calls when they exceed these limits. Limit failures use `LIMIT_EXCEEDED` with the requested and maximum values in the message.

| Limit | Value |
|---|---:|
| Request body payload | 1,000,000 characters |

### Drive Proxy

| Limit | Value |
|---|---:|
| Page size (`drive_list_files`, `drive_search_files`, comment/reply/revision/shared-drive/change lists) | 100 |
| Maximum page offset | 5,000 |
| Folder entries returned by `drive_list_folders` | 200 |
| Text returned by `drive_read_file` | 500,000 characters |
| Export bytes (`drive_read_file`, `drive_export_as`) | 5,000,000 bytes |
| Text write payload (`drive_create_file`, `drive_update_content`) | 1,000,000 characters |
| Folder path depth | 50 |
| Total response payload | 1,000,000 JSON characters |

### Gmail Proxy

| Limit | Value |
|---|---:|
| Page size (`gmail_search_messages`, `gmail_list_threads`, `gmail_list_drafts`) | 100 |
| Maximum page offset | 5,000 |
| Threads scanned per message search page | 200 |
| Messages returned from a single thread | 100 |
| Drafts scanned | 500 |
| Message/draft body field | 100,000 characters |
| Attachment bytes | 5,000,000 bytes |
| `gmail_batch_modify` message IDs | 500 |
| Gmail filters per account | 1,000 (Gmail API limit) |
| Total response payload | 1,000,000 JSON characters |

### Calendar Proxy

| Limit | Value |
|---|---:|
| Page size (`calendar_list_events`, `calendar_search_events`) | 100 |
| Maximum page offset | 5,000 |
| Event/free-busy/instance date window | 31 days |
| Total response payload | 1,000,000 JSON characters |

### Sheets Proxy

| Limit | Value |
|---|---:|
| Cells read per operation | 10,000 |
| Cells written or mutated per range operation | 10,000 |
| Ranges in `sheets_batch_get` | 10 |
| Rows inserted/deleted per call | 5,000 |
| Total response payload | 1,000,000 JSON characters |

### Docs Proxy

| Limit | Value |
|---|---:|
| Paragraphs returned by `docs_get_document` | 500 |
| Characters returned by `docs_get_document` | 500,000 |
| Full document JSON payload | 1,000,000 JSON characters |
| Total response payload | 1,000,000 JSON characters |

### Slides Proxy

| Limit | Value |
|---|---:|
| Page elements returned by `slides_get_slide_elements` | 200 |
| Text returned from slide elements or notes | 200,000 characters |
| Total response payload | 1,000,000 JSON characters |

### Tasks Proxy

| Limit | Value |
|---|---:|
| Task lists returned by `tasks_list_tasklists` | 100 |
| Tasks returned by `tasks_list_tasks` | 100 |
| Task or task list title | 1,024 characters |
| Task notes | 10,000 characters |
| Total response payload | 1,000,000 JSON characters |

### Forms Proxy

| Limit | Value |
|---|---:|
| Form items returned by `forms_list_items` | 200 |
| Responses returned by `forms_list_responses` | 100 |
| Answers returned per response | 100 |
| Form or item title | 1,024 characters |
| Form descriptions, messages, and item help text | 10,000 characters |
| Choices per choice item | 200 |
| Characters per choice label | 500 |
| Total response payload | 1,000,000 JSON characters |

## Per-Service API Quotas

These are Google API quotas enforced by the underlying Workspace APIs. The proxy uses Apps Script built-in services (`DriveApp`, `GmailApp`, `CalendarApp`, etc.) which have their own undocumented internal quotas. The numbers below represent observed behavior:

### Drive

| Limit | Value |
|---|---|
| File read/write operations | No documented hard limit; throttled at high volumes |
| File size for content read (`drive_read_file`) | 5,000,000 source bytes and 500,000 returned characters (enforced by the proxy, not Google) |
| Search results per query | 100 per proxy call |
| Sharing changes per file | No documented limit |
| Trash/delete operations | No documented limit |

### Gmail

| Limit | Value |
|---|---|
| Messages read per day | 20,000 (GmailApp quota) |
| Emails sent per day | 100 (free Gmail) / 2,000 (Google Workspace) |
| Email recipients per message | 500 (free) / 1,500 (Workspace) |
| Draft creation per day | No documented limit |
| Label operations per day | No documented limit |
| Search results per query | 100 per proxy call; bounded thread scan |

### Calendar

| Limit | Value |
|---|---|
| Events created per day | 10,000 (Calendar API quota) |
| Events read per day | 1,000,000 (Calendar API quota) |
| Free/busy queries per day | No documented limit |
| Calendars accessible | All calendars the user has access to |

### Sheets

| Limit | Value |
|---|---|
| Cells read per proxy call | 10,000 |
| Cells written per proxy call | 10,000 |
| Spreadsheets accessible | 200 spreadsheets open simultaneously |
| Sheet tabs per spreadsheet | 200 |
| Rows per sheet | 100,000 |
| Cells per spreadsheet | 10,000,000 |
| Charts per spreadsheet | 100 |

### Slides

| Limit | Value |
|---|---|
| Slides per presentation | 200 |
| Elements returned per slide by proxy | 200 |
| Presentations accessible | No documented limit |
| Image size for insertion | No documented limit (URL must be publicly accessible) |

### Docs

| Limit | Value |
|---|---|
| Document characters returned by proxy | 500,000 |
| Paragraphs returned by proxy | 500 |
| Tables per document | No documented hard limit |
| Images per document | No documented limit |

### Tasks

| Limit | Value |
|---|---|
| Task lists per account | No documented hard limit |
| Tasks returned per proxy call | 100 |
| Task title length | 1,024 characters |
| Task notes returned/written by proxy | 10,000 characters |

### Forms

| Limit | Value |
|---|---|
| Form items returned per proxy call | 200 |
| Form responses returned per proxy call | 100 |
| Supported item types | Text, paragraph, multiple choice, checkbox, list, scale, date, time, section header, page break |
| Response destination | Google Sheets spreadsheet via `FormApp.setDestination` |

## Content Limits

### File Read Truncation

The `drive_read_file` operation truncates file content at **500,000 characters** after enforcing a **5,000,000 byte** source/export size cap:

```json
{
  "content": "...first 500,000 characters of file...",
  "truncated": true,
  "size": 1200000
}
```

When content is truncated, the `truncated` field is `true` and the `size` field shows the full file size. The proxy does this to stay within Apps Script execution limits and avoid timeout on large files.

### Batch Operation Limits

| Limit | Value |
|---|---|
| **Operations per batch** | 20 max |
| **Error when exceeded** | `LIMIT_EXCEEDED` |
| **Minimum batch size** | 1 operation |
| **Error when empty** | `BAD_REQUEST: "operations must be a non-empty array"` |

Batch operations share the 6-minute execution time budget and are charged by operation weight for rate limiting. A batch of 20 read operations is fast; a batch of 20 file creation operations may take longer.

## What Happens When Quotas Are Hit

### Rate Limit (100 req/min proxy limit)

The proxy returns an error before any API call:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 60 seconds."
  }
}
```

The agent should wait and retry. The rate limit counter resets 60 seconds after the first request in the window.

### Google API Quota Exceeded

The proxy may return:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal error occurred. Check developer console logs for details."
  }
}
```

This is a generic error that can mean quota exhaustion, API throttling, or an unexpected exception. For persistent quota issues:

- Check Apps Script logs in the script editor (Executions tab).
- For Gmail daily send limits, wait until the next UTC day.
- For Calendar or Drive quotas, spread operations across time.

### Execution Timeout (6 minutes)

If a request exceeds 6 minutes, Apps Script terminates it. No error is returned to the MCP server; the HTTP connection is dropped. The MCP server will report a network error or timeout. Long-running batch operations (e.g., iterating over thousands of Drive files) are the most likely trigger. Move such workloads to paginated individual calls.

### Hard Proxy Limits

When a proxy limit is exceeded, the proxy returns:

```json
{
  "success": false,
  "error": {
    "code": "LIMIT_EXCEEDED",
    "message": "rangeRead cells limit exceeded: requested 20000, max 10000"
  }
}
```

For truncated text fields, the response includes a `*Truncated` boolean where practical. For hard byte, cell, date-window, and batch limits, reduce the requested page size, date range, range size, or batch size and retry.
