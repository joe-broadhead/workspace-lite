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
3. Batch similar items: mark-read, archive, or label
```

**Always ask before destructive actions (trash, delete).** Archive is safe (undoable). Trash is semi-destructive (30-day window).

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

---

## Slides

### Build a Presentation

"create a presentation about Q2 results"

```
1. slides_create_presentation → name:"Q2 Results QBR"
2. slides_batch → [add title slide, add content slides with text boxes]
3. slides_insert_text_box → add body text on content slides
4. slides_insert_table → add data table on one slide
5. slides_insert_image → add charts/logos
6. slides_set_notes → add speaker notes per slide
```

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
