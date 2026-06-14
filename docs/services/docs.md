# Google Docs

Create, read, and programmatically build documents with paragraphs, headings, lists, tables, images, and formatting.

## Tools

| Tool Name | Description |
|---|---|
| `docs_create_document` | Create a new document with a given name. |
| `docs_get_document` | Get document metadata plus paragraph text, bounded by proxy paragraph and character limits. |
| `docs_insert_paragraph` | Insert a paragraph with optional text and heading level (NORMAL, HEADING1-HEADING6). |
| `docs_update_paragraph` | Update an existing paragraph's text and/or heading level by index. |
| `docs_delete_paragraph` | Delete a paragraph by index. |
| `docs_set_text` | Replace the entire document body with new text. |
| `docs_replace_text` | Find and replace text across the entire document. |
| `docs_insert_list` | Insert a bulleted or numbered list from an array of items. |
| `docs_insert_table` | Insert a table from a 2D array of values (first row auto-bolded as header). |
| `docs_insert_image` | Insert an image from a public URL. |
| `docs_insert_page_break` | Insert a page break divider. |
| `docs_insert_horizontal_rule` | Insert a horizontal rule divider. |
| `docs_format_text` | Format text by search pattern — bold, italic, underline, strikethrough, font, size, colors, and links. |
| `docs_set_header` | Set the document header text (empty string to clear). |
| `docs_set_footer` | Set the document footer text (empty string to clear). |
| `docs_get_as_json` | Get the document as structured JSON with formatting and structure, bounded by proxy response-size limits. |
| `docs_get_page_setup` | Read page size and margins in points. |
| `docs_update_page_setup` | Update page size and margins in points. |
| `docs_list_bookmarks` | List bookmarks with IDs and paragraph positions when available. |
| `docs_create_bookmark` | Create a bookmark at a paragraph character offset. |
| `docs_delete_bookmark` | Delete a bookmark by ID. |
| `docs_list_named_ranges` | List named ranges, optionally filtered by name. |
| `docs_create_named_range` | Create a named range around a paragraph or partial paragraph span. |
| `docs_delete_named_range` | Delete a named range by ID. |
| `docs_list_table_of_contents` | List existing table-of-contents elements with child indexes and text previews. |
| `docs_batch` | Execute multiple operations (up to 20) in a single round-trip. |

## Key Features

- **Heading levels** — `insert_paragraph` and `update_paragraph` support six heading levels (HEADING1 through HEADING6) plus NORMAL body text. Build structured, navigable documents with a proper outline.
- **Paragraph-based API** — The document model is paragraph-centric. Each paragraph has an index (0-based) and can be independently inserted, updated, or deleted.
- **Pattern-based formatting** — `format_text` finds specific text patterns anywhere in the document and applies formatting (bold, italic, colors, font, links) only to matches.
- **Rich element insertion** — Insert images (from URLs), tables (with auto-bolded headers), bulleted or numbered lists, page breaks, and horizontal rules — all with `append`/`prepend` positioning control.
- **Structural controls** — Page setup, bookmarks, named ranges, and existing table-of-contents elements are exposed as constrained tools rather than raw Docs API requests.
- **Batch operations** — Use `docs_batch` to chain up to 20 document operations in a single round-trip.

## Examples

**Build a structured report from scratch:**

```pseudo
# Create the document
docs_create_document({ name: "Monthly Status Report" })

# Add a title
docs_insert_paragraph({
  documentId: "<id>",
  heading: "HEADING1",
  text: "Monthly Status Report — June 2026"
})

# Add a key points list
docs_insert_list({
  documentId: "<id>",
  items: ["Deployed v2.3 to production", "Resolved 12 customer tickets", "Started Q3 roadmap planning"],
  listType: "BULLET"
})

# Add a section with table
docs_insert_paragraph({
  documentId: "<id>",
  heading: "HEADING2",
  text: "Team Metrics"
})
docs_insert_table({
  documentId: "<id>",
  values: [["Team", "Velocity", "Bugs"], ["Frontend", "42", "3"], ["Backend", "38", "7"]]
})
// First row auto-bolded as header
```

**Add document structure and navigation:**

```pseudo
docs_update_page_setup({
  documentId: "<id>",
  pageWidth: 612,
  pageHeight: 792,
  marginTop: 72,
  marginBottom: 72,
  marginLeft: 72,
  marginRight: 72
})

docs_create_bookmark({
  documentId: "<id>",
  paragraphIndex: 3,
  offset: 0
})

docs_create_named_range({
  documentId: "<id>",
  name: "executive-summary",
  paragraphIndex: 3
})

docs_list_table_of_contents({ documentId: "<id>" })
```

**Format specific terms throughout a document:**

```pseudo
docs_format_text({
  documentId: "<id>",
  findText: "v2.3",
  bold: true,
  foregroundColor: "#0066CC"
})
// Every occurrence of "v2.3" is now bold and blue
```

**Update a specific section without rewriting the whole document:**

```pseudo
# Get document to find paragraph indices
docs_get_document({ documentId: "<id>" })

# Update paragraph 3 to change its text and heading level
docs_update_paragraph({
  documentId: "<id>",
  paragraphIndex: 3,
  text: "Q3 Roadmap Kickoff — Completed",
  heading: "HEADING2"
})
```

## Limits & Considerations

- The paragraph index model requires knowing the current structure. After inserting or deleting paragraphs, all subsequent indices shift. Use `docs_get_document` to inspect the current layout before indexed operations.
- Images must be publicly accessible URLs; local file uploads are not supported directly.
- `docs_set_text` replaces the entire document body — use with caution on existing documents. Prefer `insert_paragraph` and `replace_text` for targeted changes.
- `docs_get_document` is limited to 500 paragraphs and 500,000 characters; `docs_get_as_json` is limited to a 1,000,000-character JSON payload.
- `docs_delete_bookmark` and `docs_delete_named_range` require `confirm: true` because they remove document metadata.
- Bookmarks and named ranges are anchored to paragraph indices. Use `docs_get_document`, `docs_list_bookmarks`, or `docs_list_named_ranges` after structural edits because indices can shift.
- Google Docs table-of-contents elements can be inspected when already present, but Apps Script and the Docs API do not expose a supported creation method through this service surface.
- `format_text` applies formatting to all occurrences of the search text. For single-instance formatting, ensure the search text is unique within the document.
- Headers and footers accept plain text only; rich formatting in headers/footers is not supported through this tool surface.
