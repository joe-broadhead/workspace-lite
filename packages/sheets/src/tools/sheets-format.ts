import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  sheetsFormatRangeSchema, sheetsMergeCellsSchema,
  sheetsSetColumnWidthSchema, sheetsFreezeRowsSchema,
  sheetsSortRangeSchema, sheetsSetNoteSchema,
  sheetsConditionalFormatSchema, sheetsDataValidationSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsFormatTools(server: ToolServer) {
  server.tool(
    'sheets_format_range',
    'Apply formatting to a range. Supports background, font color/size/family/bold/italic/underline/strikethrough, alignment, number format, text wrap, and borders. Only specified properties are applied.',
    sheetsFormatRangeSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeFormat', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Formatting applied.' })
    },
  )

  server.tool(
    'sheets_merge_cells',
    'Merge a range of cells into one cell. Content is preserved from the top-left cell.',
    sheetsMergeCellsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeMerge', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Cells merged.' })
    },
  )

  server.tool(
    'sheets_unmerge_cells',
    'Unmerge a range of cells back into individual cells.',
    sheetsMergeCellsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeUnmerge', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Cells unmerged.' })
    },
  )

  server.tool(
    'sheets_set_column_width',
    'Set the width of a column in pixels.',
    sheetsSetColumnWidthSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('columnWidth', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Column width set.' })
    },
  )

  server.tool(
    'sheets_freeze_rows',
    'Freeze a number of rows at the top of a sheet (header rows). Set 0 to unfreeze.',
    sheetsFreezeRowsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('freezeRows', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: args.numRows === 0 ? 'Rows unfrozen.' : 'Rows frozen.' })
    },
  )

  server.tool(
    'sheets_sort_range',
    'Sort a range by a single column. Header rows outside the range are not sorted.',
    sheetsSortRangeSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeSort', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Range sorted.' })
    },
  )

  server.tool(
    'sheets_set_note',
    'Add or clear a note in a cell or range. Use an empty string to clear notes.',
    sheetsSetNoteSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('noteSet', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Note updated.' })
    },
  )

  server.tool(
    'sheets_get_conditional_formatting',
    'Read conditional format rules on a sheet. Returns serialized rule descriptions with ranges, boolean conditions, and gradient conditions.',
    sheetsConditionalFormatSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('conditionalFormatGet', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Conditional formatting rules retrieved.' })
    },
  )

  server.tool(
    'sheets_set_data_validation',
    'Set data validation on a range. Supports VALUE_IN_LIST, NUMBER_BETWEEN, NUMBER_GREATER_THAN, TEXT_CONTAINS, DATE_BEFORE, CHECKBOX, CUSTOM_FORMULA, and more.',
    sheetsDataValidationSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('dataValidationSet', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Data validation set.' })
    },
  )
}
