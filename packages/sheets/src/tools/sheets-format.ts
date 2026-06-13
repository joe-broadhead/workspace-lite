import { formatResponse } from '@google-apps-script-mcp/shared'
import {
  sheetsFormatRangeSchema, sheetsMergeCellsSchema,
  sheetsSetColumnWidthSchema, sheetsFreezeRowsSchema,
  sheetsSortRangeSchema, sheetsSetNoteSchema,
} from '@google-apps-script-mcp/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsFormatTools(server: { tool: Function }) {
  server.tool(
    'sheets_format_range',
    'Apply formatting to a range. Supports background, font color/size/family/bold/italic/underline/strikethrough, alignment, number format, text wrap, and borders. Only specified properties are applied.',
    sheetsFormatRangeSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeFormat', args)
      return formatResponse(result, { summary: 'Formatting applied.' })
    },
  )

  server.tool(
    'sheets_merge_cells',
    'Merge a range of cells into one cell. Content is preserved from the top-left cell.',
    sheetsMergeCellsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeMerge', args)
      return formatResponse(result, { summary: 'Cells merged.' })
    },
  )

  server.tool(
    'sheets_unmerge_cells',
    'Unmerge a range of cells back into individual cells.',
    sheetsMergeCellsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeUnmerge', args)
      return formatResponse(result, { summary: 'Cells unmerged.' })
    },
  )

  server.tool(
    'sheets_set_column_width',
    'Set the width of a column in pixels.',
    sheetsSetColumnWidthSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('columnWidth', args)
      return formatResponse(result, { summary: 'Column width set.' })
    },
  )

  server.tool(
    'sheets_freeze_rows',
    'Freeze a number of rows at the top of a sheet (header rows). Set 0 to unfreeze.',
    sheetsFreezeRowsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('freezeRows', args)
      return formatResponse(result, { summary: args.numRows === 0 ? 'Rows unfrozen.' : 'Rows frozen.' })
    },
  )

  server.tool(
    'sheets_sort_range',
    'Sort a range by a single column. Header rows outside the range are not sorted.',
    sheetsSortRangeSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeSort', args)
      return formatResponse(result, { summary: 'Range sorted.' })
    },
  )

  server.tool(
    'sheets_set_note',
    'Add or clear a note in a cell or range. Use an empty string to clear notes.',
    sheetsSetNoteSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('noteSet', args)
      return formatResponse(result, { summary: 'Note updated.' })
    },
  )
}
