import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  sheetsRangeWriteSchema, sheetsAppendRowsSchema, sheetsClearRangeSchema,
  sheetsSetFormulaSchema, sheetsInsertRowsSchema, sheetsDeleteRowsSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsWriteTools(server: ToolServer) {
  server.tool(
    'sheets_write_range',
    'Write values to a Google Sheets range. Values is a 2D array where each inner array is a row.',
    sheetsRangeWriteSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeWrite', args)
      return formatResponse(result, { summary: 'Values written.' })
    },
  )

  server.tool(
    'sheets_append_rows',
    'Append rows to the end of a sheet. Values is a 2D array where each inner array is a row.',
    sheetsAppendRowsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rowsAppend', args)
      return formatResponse(result, { summary: 'Rows appended.' })
    },
  )

  server.tool(
    'sheets_clear_range',
    'Clear values from a range. If no range is specified, clears all data in the sheet.',
    sheetsClearRangeSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeClear', args)
      return formatResponse(result, { summary: 'Range cleared.' })
    },
  )

  server.tool(
    'sheets_set_formula',
    'Set a formula in a cell or range (e.g. "=SUM(A1:A10)", "=IF(A1>0,\\"yes\\",\\"no\\")").',
    sheetsSetFormulaSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('formulaSet', args)
      return formatResponse(result, { summary: 'Formula set.' })
    },
  )

  server.tool(
    'sheets_insert_rows',
    'Insert blank rows at the specified position. Existing rows are shifted down.',
    sheetsInsertRowsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rowsInsert', args)
      return formatResponse(result, { summary: 'Rows inserted.' })
    },
  )

  server.tool(
    'sheets_delete_rows',
    'Delete rows at the specified position. Existing rows below are shifted up.',
    sheetsDeleteRowsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rowsDelete', args)
      return formatResponse(result, { summary: 'Rows deleted.' })
    },
  )
}
