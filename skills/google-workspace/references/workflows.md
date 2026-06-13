# Workflows

## Email

### Email Triage

"what's in my inbox" / "summarize my unread"

```
1. gmail_search_messages → isUnread:"true", maxResults:20
2. Group by urgency: invitations → direct replies needed → FYIs
3. For important items → gmail_get_message for full body
```

**Output:** Grouped list. For each: sender, subject, date, one-line summary. Flag calendar invites, direct questions, and time-sensitive items first.

### Context-Aware Reply

"reply to Gustavo's email about Decathlon RFID"

```
1. gmail_search_messages → from:gustavo subject:RFID or query:"Decathlon RFID"
2. gmail_get_message → read the target message fully
3. gmail_get_thread → see full conversation history if needed
4. drive_search_files → "fullText contains 'RFID'" + "name contains 'Decathlon'"
5. drive_read_file → read any relevant files for context
6. gmail_create_draft_reply → write draft incorporating file context
```

Use `gmail_create_draft_reply` (threads properly) rather than `gmail_create_draft` (creates a new thread). Present the draft for review.

### Forward with Context

"forward the Background Check thread to Olga"

```
1. gmail_search_messages → subject:"Background Check"
2. gmail_get_thread → get full thread to confirm content
3. gmail_forward → to:olga@example.com, add context note
```

**Always use `gmail_forward` (sends immediately) only with user approval.** If unsure, paste the draft text and ask first.

### Bulk Organization

"clean up my inbox" / "archive old notifications"

```
1. gmail_search_messages → query:"noreply" or from:notifications@
2. For each → gmail_archive (or gmail_trash_message if junk)
3. For bulk operations → gmail_batch_modify with messageIds and addLabels/removeLabels
```

**Always ask before destructive actions (trash, delete).** Archive is safe (undoable). Trash is semi-destructive (30-day window). `gmail_batch_modify` is efficient for mass label/read changes.

### Download Attachments

"download the attachment from Sarah's email"

```
1. gmail_search_messages → from:sarah subject:"..." 
2. gmail_get_message → find attachmentId in the response
3. gmail_get_attachment → messageId, attachmentId — returns base64 (binary) or plain text
```

---

## Calendar

### Scheduling

"schedule a meeting with Gustavo next week"

```
1. calendar_find_freebusy → timeMin:next Monday, timeMax:next Friday
2. Identify 2-3 open slots
3. Present options to user
4. On approval → calendar_create_event with title, startTime, endTime, guests
```

**Never create without confirmation.** You can only check the user's calendar — guest availability requires manual coordination.

### Quick Scheduling

"schedule lunch with Sarah tomorrow at noon"

```
1. calendar_quick_add_event → text:"Lunch with Sarah tomorrow at noon"
2. Present created event for review
```

Use `calendar_quick_add_event` for natural language one-off events — no need to write ISO timestamps.

### Recurring Events

"create a weekly standup every Monday 9am"

```
1. calendar_create_event_series → title:"Daily Standup", startTime, endTime, recurrence:"WEEKLY"
2. Present created series for review
```

Recurrence uses RRULE format: `"WEEKLY"`, `"DAILY"`, `"MONTHLY"`, `"YEARLY"`, `"EVERY MONDAY"`, etc.

### Respond to Invitation

"RSVP yes to the team lunch"

```
1. calendar_search_events → query:"team lunch"
2. calendar_get_event → confirm details
3. calendar_respond_to_event → eventId, status:"YES"
```

### Inspect Recurring Events

"show me all instances of the weekly standup next month"

```
1. calendar_search_events → query:"standup"
2. calendar_get_event_instances → eventId, timeMin, timeMax
```
Returns concrete event instances expanded from the recurrence rule within the time window.

### Color-Code Events

"make the gym sessions green"

```
1. calendar_search_events → query:"gym"
2. For each → calendar_set_event_color → color:"PALE_GREEN"
```

### Meeting Prep

"prep me for my next meeting" / "what do I need for the 2pm call"

```
1. calendar_list_events → find target (filter by time, search title)
2. calendar_get_event → full details (guests, description, location)
3. gmail_search_messages → by guest emails AND by meeting subject keywords
4. gmail_get_message → read bodies of top 3-5 relevant emails
5. drive_search_files → "fullText contains '<project name>'" + "name contains '<keyword>'"
```

**Output:** Title, time, attendees, 3-5 bullet context points from emails, relevant file list with brief summaries, previous decisions.

---

## Drive

### Find a File's Location

"where is this file in my Drive"

```
1. drive_get_folder_path → fileId
```
Returns the full path from root to the file, walking parent folders up to root.

### Export a Workspace File

"export the sales report as PDF"

```
1. drive_search_files → query:"name contains 'sales report'"
2. drive_export_as → fileId, mimeType:"application/pdf"
```
Supported export formats: PDF, DOCX, XLSX, CSV, and more. Use `drive_read_file` for plain text export of non-Workspace files.

### Add File to Multiple Folders

"add this file to the Q2 Review folder too"

```
1. drive_add_parent → fileId, folderId
```
Adds a file to an additional parent folder without removing existing parents. A file can exist in multiple folders. Use `drive_remove_parent` to remove from a specific folder.

### Review File Comments

"what comments are on the proposal doc"

```
1. drive_get_comments → fileId
2. Optionally drive_add_comment → fileId, content:"Looks good"
```
Comments are head-anchored (appear at the top of the file).

### Meeting Debrief

After a meeting:

```
1. calendar_search_events → find matching event by date/title
2. gmail_search_messages → pre-meeting emails from attendees
3. gmail_create_draft_reply → draft to the meeting thread with action items
4. drive_create_file → save notes/summary to Drive if requested
```

**Output:** Decisions made, action items with owners, draft follow-up (use `gmail_create_draft` or `gmail_create_draft_reply` — NEVER `gmail_send`).

---

## Sheets

### Build a Tracker

"create a project tracker spreadsheet"

```
1. sheets_create_spreadsheet → name:"Q2 Project Tracker"
2. sheets_batch → [write_range (headers), format_range (bold+freeze), column_width (multiple cols)]
3. sheets_append_rows → add initial data rows
4. sheets_create_chart → chart of key metrics
```

Always use `sheets_batch` for compound setup to reduce round-trips.

### Analyze Data

"what's in this spreadsheet" / "summarize the sales data"

```
1. sheets_get_spreadsheet → get overview of all tabs
2. sheets_read_range → read data from target tab
3. Compute summary outside Sheets (totals, averages, top/bottom N)
4. sheets_write_range or sheets_batch → write summary section + format
5. sheets_create_chart → create chart of key metrics
```

### Build a Dashboard

"create a dashboard from this data"

```
1. sheets_read_range → read source data
2. sheets_add_sheet → "Dashboard" tab
3. sheets_batch → [write summary headers, formulas (SUM, AVERAGE, COUNTIF), format (bold, freeze, number formats), merge title row]
 4. sheets_create_chart → chart on dashboard tab
```

### Read Multiple Ranges

"get data from multiple sheets at once"

```
1. sheets_batch_get → ranges:["Sheet1!A1:D20", "Sheet2!A1:E15"]
```
Single API call returns a `valueRanges` array, each with `range`, `majorDimension`, and `values`. More efficient than calling `sheets_read_range` multiple times.

### Add Data Validation

"add a dropdown to the Status column"

```
1. sheets_set_data_validation → range:"C2:C50", validationType:"VALUE_IN_LIST", values:["Done", "In Progress", "Blocked"]
```
Common validation types: `VALUE_IN_LIST` (dropdown), `CHECKBOX`, `TEXT_IS_VALID_EMAIL`, `NUMBER_BETWEEN`, `DATE_AFTER`, `CUSTOM_FORMULA`. Set `strict:true` to reject invalid input.

### Inspect Conditional Formatting

"what rules are applied to this sheet"

```
1. sheets_get_conditional_formatting → spreadsheetId, sheetName
```
Returns serialized rule descriptions with ranges, boolean conditions, and gradient conditions.

### Insert/Delete Rows

"insert 5 rows above row 10" / "delete rows 15-20"

```
1. sheets_insert_rows → startPosition:10, howMany:5
2. sheets_delete_rows → startPosition:15, howMany:6
```
Existing rows shift accordingly (down for insert, up for delete). Always confirm with user before deleting.

### Read Formulas

"show me the formulas in this sheet"

```
1. sheets_read_formulas → spreadsheetId, sheetName?, range?
```
Returns formulas, display values, and raw values for each cell.

### Read Cell Notes

"what notes are on these cells"

```
1. sheets_get_notes → spreadsheetId, sheetName?, range?
```

---

## Slides

### Build a Presentation

"create a presentation about Q2 results"

```
1. slides_create_presentation → name:"Q2 Results QBR"
2. slides_batch → [add title slide, add content slides with text boxes]
3. slides_insert_text_box → add body text on content slides (auto-positioned)
4. slides_insert_table → add data table on one slide (auto-positioned)
5. slides_insert_image → add charts/logos (auto-positioned)
6. slides_set_notes → add speaker notes per slide
```

**Content elements auto-position by default** — each new element stacks 8pt below the previous one, left-aligned, full-width. No need to specify coordinates. Override with explicit `left`/`top`/`width`/`height` or set `autoPosition: false`.

Always use `slides_batch` for compound slide creation to reduce round-trips.

### Create from Outline

"turn this outline into slides"

```
1. slides_create_presentation → get presentationId
2. For each section in outline:
   - slides_add_slide → with titleText (section heading)
   - slides_insert_text_box → with body content
3. slides_get_slide_notes → add speaker notes as needed
```

Tip: use `slides_batch` to add multiple blank slides in one call, then populate content.

### Inspect a Presentation

"what's in this presentation"

```
1. slides_get_presentation → slides list with layout info
2. slides_get_slide_elements → per slide, list elements with positions
 3. slides_get_slide_notes → read speaker notes
```

### Style Slides

"make the title slide have a dark blue background"

```
1. slides_set_slide_background → presentationId, slideIndex:0, color:"#1a2236"
```

### Add Diagrams

"draw a line connecting these two boxes"

```
1. slides_get_slide_elements → find element positions
2. slides_insert_line → lineCategory:"STRAIGHT", startLeft, startTop, endLeft, endTop
```
Line categories: `STRAIGHT`, `BENT`, `CURVED`. Line types: `SOLID`, `DOTTED`, `DASHED`.

### Edit Slide Elements

"remove the old logo from slide 3" / "bold the title on slide 1"

```
1. slides_get_slide_elements → find objectId of target element
2. slides_delete_element → presentationId, slideIndex, objectId
3. slides_format_text → presentationId, slideIndex, objectId, findText:"Q2 Results", bold:true
```

---

## Docs

### Create a Document

"start a new project proposal doc"

```
1. docs_create_document → name:"Project Proposal"
2. docs_batch → [insert_paragraph (title, HEADING1), insert_paragraph (body text)]
```

### Build a Structured Document

"write a report with headings, tables, and a TOC"

```
1. docs_create_document → name:"Q2 Report"
2. docs_insert_paragraph → text:"Executive Summary", heading:"HEADING1"
3. docs_insert_paragraph → text:"Key findings..."
4. docs_insert_paragraph → text:"Financials", heading:"HEADING2"
5. docs_insert_table → values:[["Category","Q1","Q2"],["Revenue","$100K","$120K"]]
6. docs_insert_table_of_contents → inserts at cursor position, auto-populates from headings
```

### Inspect Document Structure

"show me the full document as JSON"

```
1. docs_get_as_json → documentId
```
Returns the complete document tree with all content, formatting, and structure via the Docs Advanced Service. Alternative to `docs_get_document` which returns text with paragraph breakdown.

### Format Existing Text

"make all instances of 'Important' bold and red"

```
1. docs_format_text → documentId, findText:"Important", bold:true, foregroundColor:"#FF0000"
```

### Global Changes

"replace all instances of 'Q1' with 'Q2'"

```
1. docs_replace_text → documentId, findText:"Q1", replaceText:"Q2"
```

### Set Headers/Footers

"add a header with the company name"

```
1. docs_set_header → documentId, text:"Acme Corp — Confidential"
2. docs_set_footer → documentId, text:"Page 1"
```
Use empty string to clear.

### Add Lists

"add a bulleted list of action items"

```
1. docs_insert_list → documentId, items:["Review budget", "Schedule follow-up", "Finalize scope"], listType:"BULLET"
```
List types: `BULLET` (default), `NUMBER`.
