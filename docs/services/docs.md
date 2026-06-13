# Google Docs

Create, read, and programmatically build documents with paragraphs, headings, lists, tables, images, and formatting.

## Tools

| Tool Name | Description |
|---|---|
| `docs_create_document` | Create a new document with a given name. |
| `docs_get_document` | Get document metadata including ID, name, URL, and full text content with paragraph breakdown. |
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

## Key Features

- **Heading levels** — `insert_paragraph` and `update_paragraph` support six heading levels (HEADING1 through HEADING6) plus NORMAL body text. Build structured, navigable documents with a proper outline.
- **Paragraph-based API** — The document model is paragraph-centric. Each paragraph has an index (0-based) and can be independently inserted, updated, or deleted.
- **Pattern-based formatting** — `format_text` finds specific text patterns anywhere in the document and applies formatting (bold, italic, colors, font, links) only to matches.
- **Rich element insertion** — Insert images (from URLs), tables (with auto-bolded headers), bulleted or numbered lists, page breaks, and horizontal rules — all with `append`/`prepend` positioning control.
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
- `format_text` applies formatting to all occurrences of the search text. For single-instance formatting, ensure the search text is unique within the document.
- Headers and footers accept plain text only; rich formatting in headers/footers is not supported through this tool surface.
