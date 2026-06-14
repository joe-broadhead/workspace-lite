# Google Sheets

Create spreadsheets, manage sheets/tabs, read and write data, find and replace text, protect sheets/ranges, apply formatting, sort, chart, and more.

## Tools

| Tool Name | Description |
|---|---|
| `sheets_create_spreadsheet` | Create a new spreadsheet with a given name. |
| `sheets_get_spreadsheet` | Get spreadsheet metadata including ID, name, URL, and list of sheets with row/column counts. |
| `sheets_add_sheet` | Add a new sheet (tab) to a spreadsheet. |
| `sheets_delete_sheet` | Delete a sheet from a spreadsheet (cannot delete the last remaining sheet). |
| `sheets_rename_sheet` | Rename a sheet/tab. |
| `sheets_copy_sheet` | Copy a sheet within the same spreadsheet or to a different spreadsheet. |
| `sheets_read_range` | Read cell values from a range as a 2D array. |
| `sheets_write_range` | Write a 2D array of values to a range. |
| `sheets_append_rows` | Append rows to the end of a sheet. |
| `sheets_clear_range` | Clear values from a range (or all data if no range specified). |
| `sheets_set_formula` | Set a formula in a cell or range (e.g. `=SUM(A1:A10)`). |
| `sheets_read_formulas` | Read both formulas and display values from a range. |
| `sheets_find_text` | Find text with Apps Script TextFinder options: case, full cell, formula text, regex, and diacritics. |
| `sheets_replace_text` | Replace text with Apps Script TextFinder within a spreadsheet, sheet, or A1 range. |
| `sheets_get_notes` | Read notes from a range of cells. |
| `sheets_set_note` | Add or clear a note on a cell or range. |
| `sheets_format_range` | Apply formatting: background, font color/size/family, bold, italic, underline, alignment, number format, text wrap, borders. |
| `sheets_merge_cells` | Merge a range of cells into one (top-left content preserved). |
| `sheets_unmerge_cells` | Unmerge a range back into individual cells. |
| `sheets_set_column_width` | Set the pixel width of a column. |
| `sheets_freeze_rows` | Freeze a number of header rows (0 to unfreeze). |
| `sheets_sort_range` | Sort a range by a single column, ascending or descending. |
| `sheets_create_chart` | Create a chart (AREA, BAR, COLUMN, LINE, PIE, SCATTER, etc.) from a data range. |
| `sheets_batch_get` | Read multiple ranges from a spreadsheet in a single API call. |
| `sheets_insert_rows` | Insert blank rows at the specified position, shifting existing rows down. |
| `sheets_delete_rows` | Delete rows at the specified position, shifting existing rows up. |
| `sheets_set_data_validation` | Set data validation on a range (value lists, number ranges, checkboxes, custom formulas). |
| `sheets_get_conditional_formatting` | Read conditional format rules on a sheet. |
| `sheets_list_protections` | List protected ranges and sheets with filtered indexes for follow-up removal. |
| `sheets_protect_range` | Protect a range with optional description, warning-only mode, editors, and domain edit setting. |
| `sheets_protect_sheet` | Protect a sheet with optional unprotected ranges, description, warning-only mode, editors, and domain edit setting. |
| `sheets_remove_protection` | Remove a protected range or sheet selected by type, filters, and index. |
| `sheets_batch` | Execute up to 20 sheets operations in a single round-trip. |

## Key Features

- **Batch operations for compound workflows** — Use `sheets_batch` to chain up to 20 operations in a single round-trip. Combine `write_range`, `format_range`, `freeze_rows`, and `set_column_width` atomically to build styled, formatted sheets in one call.
- **Rich formatting surface** — `format_range` supports colors, fonts, alignment, number formatting, text wrapping, and customizable borders (style and color).
- **Formula support** — `set_formula` writes formulas; `read_formulas` returns both raw formulas and computed display values for auditing.
- **TextFinder search/replace** — `find_text` and `replace_text` expose documented Apps Script TextFinder options, including regex and formula text matching.
- **Protection management** — `list_protections`, `protect_range`, `protect_sheet`, and `remove_protection` manage documented Apps Script `Protection` objects without raw batchUpdate passthroughs.
- **Chart creation** — `create_chart` supports 11 chart types (AREA, BAR, COLUMN, COMBO, HISTOGRAM, LINE, PIE, SCATTER, TABLE, TIMELINE, WATERFALL) with configurable titles, axes, legend position, and stacking.
- **Cell notes** — `set_note` and `get_notes` provide per-cell annotations independent of cell values (useful for documentation or review comments).

## Examples

**Build a styled report in one batch:**

```pseudo
sheets_batch({
  spreadsheetId: "<id>",
  operations: [
    { action: "rangeWrite", params: { range: "A1:B3", values: [["Month","Revenue"],["Jan",5000],["Feb",6200]] } },
    { action: "rangeFormat", params: { range: "A1:B1", bold: true, background: "#E8E8E8" } },
    { action: "freezeRows", params: { numRows: 1 } },
    { action: "setColumnWidth", params: { column: 2, width: 120 } },
    { action: "rangeFormat", params: { range: "B2:B3", numberFormat: "$#,##0.00" } }
  ]
})
// Creates a formatted revenue table with frozen header row
```

**Read and analyze data:**

```pseudo
# Read raw data
sheets_read_range({ spreadsheetId: "<id>", range: "A1:D100" })

# Check formulas for auditing
sheets_read_formulas({ spreadsheetId: "<id>", range: "C2:C100" })

# Read annotations
sheets_get_notes({ spreadsheetId: "<id>", range: "A1:A100" })
```

**Find, replace, and protect:**

```pseudo
# Find case-sensitive matches in formulas
sheets_find_text({
  spreadsheetId: "<id>",
  sheetName: "Forecast",
  findText: "SUM",
  matchFormulaText: true,
  matchCase: true
})

# Replace plain text in one range
sheets_replace_text({
  spreadsheetId: "<id>",
  sheetName: "Forecast",
  range: "A2:A100",
  findText: "Draft",
  replaceText: "Final"
})

# Protect a header range
sheets_protect_range({
  spreadsheetId: "<id>",
  sheetName: "Forecast",
  range: "A1:E1",
  description: "Locked headers",
  warningOnly: false
})
```

**Sort and chart:**

```pseudo
# Sort by revenue descending (column 2)
sheets_sort_range({
  spreadsheetId: "<id>",
  range: "A2:B13",
  sortColumn: 2,
  ascending: false
})

# Create a bar chart
sheets_create_chart({
  spreadsheetId: "<id>",
  range: "A1:B13",
  chartType: "COLUMN",
  title: "Monthly Revenue",
  position: "D1"
})
```

## Limits & Considerations

- `sheets_delete_sheet` cannot delete the last remaining sheet in a spreadsheet.
- Range operations use A1 notation; column numbers for `set_column_width`, `freeze_rows`, and `sort_range` are 1-based (A=1).
- `append_rows` always writes to the bottom of the sheet; it cannot insert rows at specific positions.
- `replace_text` rejects replacements that start with formula metacharacters; use `set_formula` for formulas.
- `remove_protection` requires `confirm=true`; because Apps Script `Protection` has no durable ID, use `list_protections` filters and index immediately before removal.
- Chart creation has size limits (100-1200px width, 100-1200px height) and supports up to 50 rows and 20 columns in the data table.
- Batch operations are most effective when operations are independent; sequential dependencies (e.g., writing then formatting the same range) work within a batch because operations execute in order.
