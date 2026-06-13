# Google Slides

Create presentations, manage slides, insert and format text, images, shapes, and tables.

## Tools

| Tool Name | Description |
|---|---|
| `slides_create_presentation` | Create a new presentation with a given name. |
| `slides_get_presentation` | Get presentation metadata including ID, name, URL, and list of slides with object IDs. |
| `slides_add_slide` | Add a new slide, optionally with title and body text. |
| `slides_delete_slide` | Delete a slide by index. |
| `slides_duplicate_slide` | Duplicate a slide and insert the copy after the original. |
| `slides_move_slide` | Move a slide to a different position by index. |
| `slides_insert_text_box` | Insert a text box with optional auto-positioning. |
| `slides_insert_image` | Insert an image from a public URL. |
| `slides_insert_shape` | Insert a shape (rectangle, ellipse, arrow, star, cloud, flowchart, etc.). |
| `slides_insert_table` | Insert a table from a 2D array of values. |
| `slides_get_slide_elements` | List all elements on a slide with types, IDs, positions, dimensions, and full text. |
| `slides_get_element_text` | Read text from a specific shape or text element by object ID. |
| `slides_delete_element` | Delete a page element from a slide by its object ID. |
| `slides_format_text` | Format text within an element — bold, italic, underline, font, size, color, and links. |
| `slides_get_slide_notes` | Get or set speaker notes for a slide. |
| `slides_replace_all_text` | Find and replace text across all slides in a presentation. |
| `slides_set_slide_background` | Set the background color of a slide using a solid fill color. |
| `slides_insert_line` | Insert a line connector between two points on a slide (STRAIGHT, BENT, CURVED). |
| `slides_batch` | Execute multiple operations (up to 20) in a single round-trip. |

## Key Features

- **Auto-positioning** — `insert_text_box`, `insert_image`, `insert_shape`, and `insert_table` all support `autoPosition: true` (the default). Elements stack automatically below existing content without manual coordinate calculation. Override with explicit `left`, `top`, `width`, `height` when needed.
- **Rich element model** — `slides_get_slide_elements` returns every element on a slide with its type, object ID, bounding box, and full text content. Use `slides_get_element_text` to read one text element directly.
- **15 shape types** — RECTANGLE, ROUND_RECTANGLE, ELLIPSE, TRIANGLE, ARROW_RIGHT, ARROW_LEFT, STAR_5, HEXAGON, CLOUD, FLOW_CHART_PROCESS, FLOW_CHART_DECISION, WAVE, CHEVRON, PENTAGON, TRAPEZOID.
- **Text formatting on find** — `slides_format_text` searches within an element for specific text and applies formatting only to matches — no need to know character indices.
- **Slide reordering** — `duplicate_slide`, `move_slide`, and `delete_slide` enable full programmatic slide deck manipulation.
- **Batch operations** — Use `slides_batch` to chain up to 20 slides operations in a single round-trip.

## Examples

**Build a title slide and content slide with auto-positioning:**

```pseudo
# Create presentation
slides_create_presentation({ name: "Q4 Review" })

# Add a title slide
slides_add_slide({
  presentationId: "<id>",
  titleText: "Q4 Business Review",
  bodyText: "Presented by Engineering"
})

# Add a content slide with image and text
slides_add_slide({
  presentationId: "<id>",
  titleText: "Key Metrics"
})
slides_insert_image({
  presentationId: "<id>",
  slideIndex: 1,
  imageUrl: "https://example.com/chart.png"
  // autoPosition: true stacks below title automatically
})
slides_insert_text_box({
  presentationId: "<id>",
  slideIndex: 1,
  text: "Revenue grew 23% quarter-over-quarter."
  // autoPosition: true stacks below image automatically
})
```

**Format specific phrases in a text element:**

```pseudo
# Get element IDs
slides_get_slide_elements({ presentationId: "<id>", slideIndex: 0 })

# Read text from a single element if needed
slides_get_element_text({
  presentationId: "<id>",
  slideIndex: 0,
  objectId: "<element-id>"
})

# Bold the word "Revenue" everywhere in that element
slides_format_text({
  presentationId: "<id>",
  slideIndex: 0,
  objectId: "<element-id>",
  findText: "Revenue",
  bold: true,
  foregroundColor: "#2E86AB"
})
```

**Replace text across all slides:**

```pseudo
slides_replace_all_text({
  presentationId: "<id>",
  findText: "Q4",
  replaceText: "Q1 2027"
})
// Every instance of "Q4" in the entire deck is replaced
```

## Limits & Considerations

- Auto-positioning stacks elements vertically below existing content. It does not handle complex multi-column layouts — use explicit coordinates for those.
- Images must be publicly accessible URLs; local file uploads are not supported directly.
- `slides_format_text` finds and formats all occurrences of the search text within a single element. For cross-element formatting, call it once per element or use `slides_replace_all_text`.
- Slide indices are 0-based and reflect the current order. After `delete_slide` or `move_slide`, indices shift.
- Element object IDs are stable within a presentation session but should always be obtained from `slides_get_slide_elements` rather than hardcoded.
