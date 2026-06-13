# Workflows

Common Google Workspace automation patterns, each showing the step-by-step tool sequence an agent should follow.

## Email

### Email Triage

"What's in my inbox" / "Summarize my unread"

1. `gmail_search_messages` — `isUnread:"true"`, `maxResults:20`
2. Group by urgency:
    - **Invitations** (calendar invites, meeting requests)
    - **Direct questions** (needs your reply)
    - **FYIs** (newsletters, notifications, status updates)
3. For important items, `gmail_get_message` to read the full body

**Output:** Grouped list with sender, subject, date, and one-line summary. Flag calendar invites, direct questions, and time-sensitive items first.

### Context-Aware Reply

"Reply to Gustavo's email about Decathlon RFID"

1. `gmail_search_messages` — `from:gustavo` + `subject:RFID` or `query:"Decathlon RFID"`
2. `gmail_get_message` — read the target message fully
3. `gmail_get_thread` — see full conversation history if needed
4. `drive_search_files` — `"fullText contains 'RFID'"` + `"name contains 'Decathlon'"`
5. `drive_read_file` — read any relevant files for context
6. `gmail_create_draft_reply` — write draft incorporating file context

Use `gmail_create_draft_reply` (threads properly) rather than `gmail_create_draft` (creates a new thread). Present the draft for review.

### Forward with Context

"Forward the Background Check thread to Olga"

1. `gmail_search_messages` — `subject:"Background Check"`
2. `gmail_get_thread` — get full thread to confirm content
3. `gmail_forward` — `to:olga@example.com`, add context note

**Always use `gmail_forward` (sends immediately) only with user approval.** If unsure, paste the draft text and ask first.

### Bulk Organization

"Clean up my inbox" / "Archive old notifications"

1. `gmail_search_messages` — `query:"noreply"` or `from:notifications@`
2. For each batch: `gmail_archive` (or `gmail_trash_message` if junk)
3. Use `gmail_batch` to combine `markRead` + `archive` + `addLabel` in one round-trip

**Always ask before destructive actions (trash, delete).** Archive is safe (undoable). Trash is semi-destructive (30-day window).

### Batch Email Organization

Apply multiple labels and state changes in one call:

1. `gmail_search_messages` — identify target messages
2. `gmail_batch` with operations:
    - `markRead` on each message
    - `addLabel` for categorization
    - `archive` to clear inbox
3. Confirm results — check `results[].success` per operation

---

## Calendar

### Scheduling

"Schedule a meeting with Gustavo next week"

1. `calendar_find_freebusy` — `timeMin:next Monday`, `timeMax:next Friday`
2. Identify 2–3 open slots
3. Present options to user
4. On approval, `calendar_create_event` with `title`, `startTime`, `endTime`, `guests`

**Never create without confirmation.** The agent can only check the deploying user's calendar — guest availability requires manual coordination.

### Meeting Prep

"Prep me for my next meeting" / "What do I need for the 2pm call"

1. `calendar_list_events` — find target (filter by time, search title)
2. `calendar_get_event` — full details (guests, description, location)
3. `gmail_search_messages` — by guest emails AND by meeting subject keywords
4. `gmail_get_message` — read bodies of top 3–5 relevant emails
5. `drive_search_files` — `"fullText contains '<project name>'"` + `"name contains '<keyword>'"`

**Output:** Title, time, attendees, 3–5 bullet context points from emails, relevant file list with brief summaries, previous decisions.

### Meeting Debrief

After a meeting:

1. `calendar_search_events` — find matching event by date/title
2. `gmail_search_messages` — pre-meeting emails from attendees
3. `gmail_create_draft_reply` — draft to the meeting thread with action items
4. `drive_create_file` — save notes/summary to Drive if requested

**Output:** Decisions made, action items with owners, draft follow-up (use drafts — NEVER `gmail_send`).

---

## Sheets

### Build a Spreadsheet Tracker

"Create a project tracker spreadsheet"

1. `sheets_create_spreadsheet` — `name:"Q2 Project Tracker"`
2. `sheets_batch` — compound setup in one round-trip:

```json
{
  "operations": [
    { "action": "rangeWrite", "params": { "range": "A1:E1", "values": [["Task", "Owner", "Status", "Due", "Notes"]] } },
    { "action": "rangeFormat", "params": { "range": "A1:E1", "bold": true, "background": "#E8EAF6" } },
    { "action": "freezeRows", "params": { "numRows": 1 } },
    { "action": "columnWidth", "params": { "column": 1, "width": 200 } },
    { "action": "columnWidth", "params": { "column": 2, "width": 150 } },
    { "action": "columnWidth", "params": { "column": 3, "width": 120 } },
    { "action": "columnWidth", "params": { "column": 4, "width": 100 } },
    { "action": "columnWidth", "params": { "column": 5, "width": 300 } }
  ]
}
```

3. `sheets_append_rows` — add initial data rows
4. `sheets_create_chart` — chart of key metrics

### Analyze Data

"What's in this spreadsheet" / "Summarize the sales data"

1. `sheets_get_spreadsheet` — get overview of all tabs
2. `sheets_read_range` — read data from target tab
3. Compute summary outside Sheets (totals, averages, top/bottom N)
4. `sheets_batch` — write summary section + format:

```json
{
  "operations": [
    { "action": "rangeWrite", "params": { "range": "A20", "values": [["SUMMARY"], ["Total", "=SUM(B2:B19)"]] } },
    { "action": "rangeFormat", "params": { "range": "A20:B21", "bold": true, "numberFormat": "$#,##0.00" } }
  ]
}
```

5. `sheets_create_chart` — create chart of key metrics

### Build a Dashboard

"Create a dashboard from this data"

1. `sheets_read_range` — read source data
2. `sheets_add_sheet` — `"Dashboard"` tab
3. `sheets_batch` — compound setup:

```json
{
  "operations": [
    { "action": "rangeWrite", "params": { "range": "A1", "values": [["Metric", "Value"]] } },
    { "action": "rangeWrite", "params": { "range": "A2", "values": [["Total Sales", "=SUM(Data!B:B)"], ["Average", "=AVERAGE(Data!B:B)"]] } },
    { "action": "rangeFormat", "params": { "range": "A1:B1", "bold": true, "freezeRows": 1 } },
    { "action": "rangeFormat", "params": { "range": "B2:B3", "numberFormat": "$#,##0.00" } },
    { "action": "rangeMerge", "params": { "range": "A5:C5" } }
  ]
}
```

4. `sheets_create_chart` — chart on dashboard tab

---

## Slides

### Build a Presentation

"Create a presentation about Q2 results"

1. `slides_create_presentation` — `name:"Q2 Results QBR"`
2. `slides_batch` — add slides and content in one round-trip:

```json
{
  "operations": [
    { "action": "slideAdd", "params": { "titleText": "Q2 Results", "bodyText": "Quarterly Business Review" } },
    { "action": "slideAdd", "params": { "titleText": "Revenue" } },
    { "action": "slideAdd", "params": { "titleText": "Customer Growth" } },
    { "action": "slideAdd", "params": { "titleText": "Next Steps" } }
  ]
}
```

3. `slides_insert_text_box` — add body text on content slides (auto-positioned)
4. `slides_insert_table` — add data table on one slide (auto-positioned)
5. `slides_insert_image` — add charts/logos (auto-positioned)
6. `slides_get_slide_notes` — add speaker notes per slide

**Content elements auto-position by default** — each new element stacks 8pt below the previous one, left-aligned, full-width. No need to specify coordinates. Override with explicit `left`/`top`/`width`/`height` or set `autoPosition: false`.

### Create from Outline

"Turn this outline into slides"

1. `slides_create_presentation` — get `presentationId`
2. For each section in outline:
    - `slides_add_slide` — with `titleText` (section heading)
    - `slides_insert_text_box` — with body content
3. `slides_get_slide_notes` — add speaker notes as needed

Tip: use `slides_batch` to add multiple blank slides in one call, then populate content individually.

### Inspect a Presentation

"What's in this presentation"

1. `slides_get_presentation` — slides list with layout info
2. `slides_get_slide_elements` — per slide, list elements with positions
3. `slides_get_slide_notes` — read speaker notes

---

## Docs

### Create a Document

"Create a project brief"

1. `docs_create_document` — `name:"Project Brief - Q3 Launch"`
2. `docs_batch` — compound setup in one round-trip:

```json
{
  "operations": [
    { "action": "paragraphInsert", "params": { "text": "Project Brief", "heading": "HEADING1" } },
    { "action": "paragraphInsert", "params": { "text": "Executive Summary", "heading": "HEADING2" } },
    { "action": "paragraphInsert", "params": { "text": "This document outlines the Q3 launch plan..." } },
    { "action": "paragraphInsert", "params": { "text": "Goals", "heading": "HEADING2" } },
    { "action": "listInsert", "params": { "items": ["Increase MAU by 20%", "Ship 3 new features", "Reduce churn to <2%"], "listType": "BULLET" } },
    { "action": "paragraphInsert", "params": { "text": "Timeline", "heading": "HEADING2" } },
    { "action": "tableInsert", "params": { "values": [["Phase", "Dates", "Owner"], ["Alpha", "Jul 1-15", "Alice"], ["Beta", "Jul 16-31", "Bob"], ["GA", "Aug 15", "Carol"]] } },
    { "action": "horizontalRuleInsert", "params": {} },
    { "action": "headerSet", "params": { "text": "Q3 Launch Plan - Confidential" } }
  ]
}
```

3. `docs_format_text` — bold headings or apply styles
4. `docs_insert_image` — add diagrams or screenshots

### Format an Existing Document

"Clean up the formatting in this doc"

1. `docs_get_document` — read full text with paragraph structure
2. `docs_batch`:
    - `paragraphUpdate` on each paragraph to set heading levels
    - `replaceText` for standardizing terms
    - `formatText` for bold/italic/underline
3. `docs_set_header` / `docs_set_footer` — add branding

---

## Batch Workflow Pattern

The batch pattern applies across all services. The general rule:

> If you're about to make 3+ mutations to the same resource in sequence, combine them into a single `*_batch` call.

### Pattern

```
1. Read/setup phase (individual tools):
   - Create the resource (spreadsheet, presentation, document)
   - Read any data you'll need

2. Batch phase (one round-trip):
   - All formatting, column widths, freeze rows, merge calls
   - All slide creation, text box insertion
   - All paragraph insertion, list building, table creation
   - Multiple read operations on the same service

3. Verification phase (individual tools):
   - Read back to confirm state
   - Create charts last (they depend on data being in place)
```

### When NOT to Batch

- Operations that depend on the **output** of a previous operation (e.g., create file → get its ID → share it). Run these sequentially with individual tools.
- Operations across **different services** (Drive + Gmail). There is no cross-service batching.
- Single read or write operations where the overhead of batching provides no benefit.
