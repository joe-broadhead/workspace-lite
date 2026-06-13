# Quickstart

Verify your installation and learn the basic patterns in 5 examples.

!!! tip "Prerequisites"
    Complete the [installation](installation.md) first. All 7 MCP servers must be configured in OpenCode.

---

## 1. Verify It Works

Check that each service is alive with its simplest tool call.

### Drive &mdash; Storage Info

**Tool call:**

```json
{
  "tool": "drive_about",
  "args": {}
}
```

**Expected output:**

```
Drive Storage: 2.3 GB used of 15.0 GB
Root Folder: 0A...
```

### Gmail &mdash; Profile

**Tool call:**

```json
{
  "tool": "gmail_profile",
  "args": {}
}
```

**Expected output:**

```json
{
  "emailAddress": "you@gmail.com",
  "messagesTotal": 12453,
  "threadsTotal": 3892,
  "historyId": "9876543"
}
```

### Calendar &mdash; Upcoming Events

**Tool call:**

```json
{
  "tool": "calendar_list_events",
  "args": {
    "maxResults": 5
  }
}
```

**Expected output:**

```
Found 5 events

📅 Team Standup — 2026-06-14T09:00-09:15
📅 Q2 Planning — 2026-06-15T14:00-15:00
📅 1:1 with Sarah — 2026-06-16T11:00-11:30
📅 Design Review — 2026-06-17T13:00-14:00
📅 All Hands — 2026-06-18T10:00-11:00
```

---

## 2. Create a Formatted Spreadsheet

Create a spreadsheet, add headers, populate data, apply formatting, and insert a chart &mdash; all in one batch.

**Tool calls (sequential):**

**Step 1** &mdash; Create the spreadsheet:

```json
{
  "tool": "sheets_create_spreadsheet",
  "args": {
    "name": "Q2 Budget Report"
  }
}
```

Returns the `spreadsheetId`. The examples below use `<spreadsheet-id>` as a placeholder.

**Step 2** &mdash; Use batch to set up everything at once:

```json
{
  "tool": "sheets_batch",
  "args": {
    "spreadsheetId": "<spreadsheet-id>",
    "sheetName": "Sheet1",
    "operations": [
      {
        "action": "rangeWrite",
        "params": {
          "range": "A1:C1",
          "values": [["Category", "Budget", "Actual"]]
        }
      },
      {
        "action": "rangeWrite",
        "params": {
          "range": "A2:C4",
          "values": [
            ["Engineering", 250000, 238500],
            ["Marketing", 120000, 118000],
            ["Operations", 80000, 82000]
          ]
        }
      },
      {
        "action": "rangeFormat",
        "params": {
          "range": "A1:C1",
          "bold": true,
          "background": "#1a73e8",
          "fontColor": "#ffffff",
          "horizontalAlignment": "center"
        }
      },
      {
        "action": "rangeFormat",
        "params": {
          "range": "B2:C4",
          "numberFormat": "$#,##0"
        }
      },
      {
        "action": "formulaSet",
        "params": {
          "range": "A5",
          "formula": "=\"Total\""
        }
      },
      {
        "action": "formulaSet",
        "params": {
          "range": "B5",
          "formula": "=SUM(B2:B4)"
        }
      },
      {
        "action": "formulaSet",
        "params": {
          "range": "C5",
          "formula": "=SUM(C2:C4)"
        }
      },
      {
        "action": "chartCreate",
        "params": {
          "range": "A1:C4",
          "chartType": "COLUMN",
          "title": "Q2 Budget vs Actual",
          "yAxisTitle": "USD",
          "position": "E1",
          "stacked": false
        }
      }
    ]
  }
}
```

**Expected output:**

```json
{
  "success": true,
  "results": [
    { "action": "rangeWrite", "success": true },
    { "action": "rangeWrite", "success": true },
    { "action": "rangeFormat", "success": true },
    { "action": "rangeFormat", "success": true },
    { "action": "formulaSet", "success": true },
    { "action": "formulaSet", "success": true },
    { "action": "formulaSet", "success": true },
    { "action": "chartCreate", "success": true }
  ]
}
```

The spreadsheet now has formatted headers, data with currency formatting, SUM formulas, and a column chart.

---

## 3. Draft an Email (Never Sent)

Search for a thread and draft a reply &mdash; nothing is sent without explicit approval.

**Step 1** &mdash; Find the thread:

```json
{
  "tool": "gmail_search_messages",
  "args": {
    "query": "subject:Q2 planning",
    "maxResults": 3
  }
}
```

**Expected output:**

```
Found 3 messages

📧 Q2 Planning Kickoff — from: alex@company.com — 2026-06-10
📧 Re: Q2 Planning Kickoff — from: you@gmail.com — 2026-06-11
📧 Agenda for Q2 Planning — from: alex@company.com — 2026-06-12
```

**Step 2** &mdash; Draft a reply to the latest message (use the message ID from step 1):

```json
{
  "tool": "gmail_create_draft_reply",
  "args": {
    "messageId": "18a9b3c4d5e6f7g8",
    "body": "Thanks Alex, the agenda looks great. I'll have the spreadsheet ready by Monday. One thing to add — can we allocate 10 minutes for the budget review?\n\nBest,\nJoe"
  }
}
```

**Expected output:**

```json
{
  "id": "draft-abc123",
  "message": {
    "id": "18a9b3c4d5e6f7g9",
    "threadId": "18a9b3c4d5e6f7g0"
  }
}
```

!!! tip "Draft-first safety"
    `gmail_create_draft_reply` creates a draft but **does not send**. Review the draft in Gmail before calling `gmail_send_draft` to send it. This safety pattern is enforced by the agent skill &mdash; the LLM will never send email without explicit approval.

---

## 4. Search and Read a Drive File

Find a document by name and read its contents.

**Step 1** &mdash; Search:

```json
{
  "tool": "drive_search_files",
  "args": {
    "query": "name contains 'Q2 Budget'"
  }
}
```

**Expected output:**

```
Found 1 result

Q2 Budget Report (<spreadsheet-id>) — application/vnd.google-apps.spreadsheet — you
```

**Step 2** &mdash; For a text/markdown file, read contents directly:

```json
{
  "tool": "drive_read_file",
  "args": {
    "fileId": "<spreadsheet-id>",
    "mimeType": "text/plain"
  }
}
```

**Step 3** &mdash; Or get full metadata:

```json
{
  "tool": "drive_get_file",
  "args": {
    "fileId": "<spreadsheet-id>"
  }
}
```

**Expected output:**

```json
{
  "id": "<spreadsheet-id>",
  "name": "Q2 Budget Report",
  "mimeType": "application/vnd.google-apps.spreadsheet",
  "size": 24576,
  "createdTime": "2026-06-01T10:00:00Z",
  "modifiedTime": "2026-06-13T14:30:00Z",
  "owners": ["you@gmail.com"],
  "shared": false,
  "webViewLink": "https://docs.google.com/spreadsheets/d/<spreadsheet-id>/edit"
}
```

---

## 5. Create a Slides Presentation with Auto-Positioning

Build a 3-slide deck with titles, body text, and a table &mdash; elements auto-position below each other.

**Step 1** &mdash; Create the presentation:

```json
{
  "tool": "slides_create_presentation",
  "args": {
    "name": "Q2 Review"
  }
}
```

**Step 2** &mdash; Use batch to add slides and content:

```json
{
  "tool": "slides_batch",
  "args": {
    "presentationId": "<presentation-id>",
    "operations": [
      {
        "action": "slideAdd",
        "params": {
          "titleText": "Q2 Review",
          "bodyText": "Quarterly performance summary"
        }
      },
      {
        "action": "slideAdd",
        "params": {
          "titleText": "Key Metrics"
        }
      },
      {
        "action": "textBoxInsert",
        "params": {
          "slideIndex": 1,
          "text": "Revenue: $2.3M (+12% QoQ)\nCustomers: 1,450 (+85)\nChurn: 3.1% (-0.4pp)"
        }
      },
      {
        "action": "slideAdd",
        "params": {
          "titleText": "Team Breakdown"
        }
      },
      {
        "action": "tableInsert",
        "params": {
          "slideIndex": 2,
          "values": [
            ["Team", "Headcount", "Open Reqs"],
            ["Engineering", "32", "4"],
            ["Marketing", "14", "2"],
            ["Sales", "18", "3"],
            ["Operations", "8", "1"]
          ]
        }
      }
    ]
  }
}
```

**Expected output:**

```json
{
  "success": true,
  "results": [
    { "action": "slideAdd", "success": true, "data": { "slideIndex": 0 } },
    { "action": "slideAdd", "success": true, "data": { "slideIndex": 1 } },
    { "action": "textBoxInsert", "success": true },
    { "action": "slideAdd", "success": true, "data": { "slideIndex": 2 } },
    { "action": "tableInsert", "success": true }
  ]
}
```

!!! tip "Auto-positioning"
    When `autoPosition` is `true` (the default for all slides content tools), new elements are placed below existing elements on the slide. You can override with explicit `left`, `top`, `width`, and `height` parameters.

---

## Next Steps

| Topic | Link |
|-------|------|
| Learn the architecture | [Architecture Overview](../architecture/overview.md) |
| Explore all Drive tools | [Drive Service](../services/drive.md) |
| Understand batch operations | [Batch API Reference](../api/batch.md) |
| Agent skill reference | [Skill Overview](../skill/overview.md) |
