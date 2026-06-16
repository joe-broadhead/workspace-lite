import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  sheetsRangeWriteSchema, sheetsAppendRowsSchema, sheetsClearRangeSchema,
  sheetsSetFormulaSchema, sheetsInsertRowsSchema, sheetsDeleteRowsSchema,
  sheetsReplaceTextSchema, sheetsProtectRangeSchema, sheetsProtectSheetSchema,
  sheetsRemoveProtectionSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsWriteTools(server: ToolServer) {
  server.tool(
    'sheets_write_range',
    'Write values to a Google Sheets range. Values is a 2D array where each inner array is a row.',
    sheetsRangeWriteSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeWrite', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Values written.' })
    },
  )

  server.tool(
    'sheets_append_rows',
    'Append rows to the end of a sheet. Values is a 2D array where each inner array is a row.',
    sheetsAppendRowsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rowsAppend', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Rows appended.' })
    },
  )

  server.tool(
    'sheets_clear_range',
    'Clear values from a range. If no range is specified, clears all data in the sheet.',
    sheetsClearRangeSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeClear', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Range cleared.' })
    },
  )

  server.tool(
    'sheets_set_formula',
    'Set a formula in a cell or range (e.g. "=SUM(A1:A10)", "=IF(A1>0,\\"yes\\",\\"no\\")").',
    sheetsSetFormulaSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('formulaSet', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Formula set.' })
    },
  )

  server.tool(
    'sheets_replace_text',
    'Find and replace text in a spreadsheet, sheet, or A1 range using Apps Script TextFinder. Replacement text is treated as plain text; use sheets_set_formula for formulas.',
    sheetsReplaceTextSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('textReplace', args)
      if (!result.success) return formatResponse(result)
      const data = result.data as Record<string, unknown>
      return formatResponse(result, { summary: `Replaced ${data.replacements ?? 0} occurrence(s).` })
    },
  )

  server.tool(
    'sheets_protect_range',
    'Create a protected range with optional description, warning-only mode, additional editors, and domain edit setting.',
    sheetsProtectRangeSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeProtect', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Range protected.' })
    },
  )

  server.tool(
    'sheets_protect_sheet',
    'Protect a sheet with optional description, warning-only mode, unprotected ranges, additional editors, and domain edit setting.',
    sheetsProtectSheetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('sheetProtect', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Sheet protected.' })
    },
  )

  server.tool(
    'sheets_remove_protection',
    'Remove a protected range or sheet selected by type plus optional sheetName, range, description, and filtered index. Requires confirm=true.',
    sheetsRemoveProtectionSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('protectionRemove', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Protection removed.' })
    },
  )

  server.tool(
    'sheets_insert_rows',
    'Insert blank rows at the specified position. Existing rows are shifted down.',
    sheetsInsertRowsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rowsInsert', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Rows inserted.' })
    },
  )

  server.tool(
    'sheets_delete_rows',
    'Delete rows at the specified position. Existing rows below are shifted up.',
    sheetsDeleteRowsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rowsDelete', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Rows deleted.' })
    },
  )
}
