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
| **Reset window** | 60 seconds |
| **Error when exceeded** | `RATE_LIMITED: "Too many requests. Try again in 60 seconds."` |

This rate limit is enforced by `CacheService.getScriptCache()` in the Apps Script proxy layer and is **independent** of the per-API quotas below. Hitting this limit protects the proxy from abuse but does not relate to Google API consumption limits.

## Per-Service API Quotas

These are Google API quotas enforced by the underlying Workspace APIs. The proxy uses Apps Script built-in services (`DriveApp`, `GmailApp`, `CalendarApp`, etc.) which have their own undocumented internal quotas. The numbers below represent observed behavior:

### Drive

| Limit | Value |
|---|---|
| File read/write operations | No documented hard limit; throttled at high volumes |
| File size for content read (`drive_read_file`) | 500 KB (enforced by the proxy, not Google) |
| Search results per query | ~1,000 results max (Drive API limitation) |
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
| Search results per query | ~500 results practical limit |

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
| Cells read per call | ~10M cells practical limit |
| Cells written per call | ~10M cells practical limit |
| Spreadsheets accessible | 200 spreadsheets open simultaneously |
| Sheet tabs per spreadsheet | 200 |
| Rows per sheet | 100,000 |
| Cells per spreadsheet | 10,000,000 |
| Charts per spreadsheet | 100 |

### Slides

| Limit | Value |
|---|---|
| Slides per presentation | 200 |
| Elements per slide | 500 |
| Presentations accessible | No documented limit |
| Image size for insertion | No documented limit (URL must be publicly accessible) |

### Docs

| Limit | Value |
|---|---|
| Document length | ~1M characters |
| Paragraphs per document | No documented limit |
| Tables per document | No documented hard limit |
| Images per document | No documented limit |

## Content Limits

### File Read Truncation

The `drive_read_file` operation truncates file content at **500 KB**:

```json
{
  "content": "...first 500KB of file...",
  "truncated": true,
  "size": 1200000
}
```

When content is truncated, the `truncated` field is `true` and the `size` field shows the full file size. The proxy does this to stay within Apps Script execution limits and avoid timeout on large files.

### Batch Operation Limits

| Limit | Value |
|---|---|
| **Operations per batch** | 20 max |
| **Error when exceeded** | `BAD_REQUEST: "Max 20 operations per batch"` |
| **Minimum batch size** | 1 operation |
| **Error when empty** | `BAD_REQUEST: "operations must be a non-empty array"` |

Batch operations share the 6-minute execution time budget. A batch of 20 read operations is fast; a batch of 20 file creation operations may take longer.

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

### Maximum File Read (500 KB)

When `drive_read_file` hits the 500 KB limit, the response includes the first 500 KB of content and sets `truncated: true`. For files larger than this, consider exporting to a format that yields less content, or reading the file in a different way outside the proxy.
