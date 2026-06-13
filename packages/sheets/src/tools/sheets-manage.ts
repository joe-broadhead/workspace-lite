import { formatResponse } from '@google-apps-script-mcp/shared'
import {
  sheetsSpreadsheetCreateSchema, sheetsSpreadsheetGetSchema,
  sheetsAddSheetSchema, sheetsDeleteSheetSchema,
  sheetsRenameSheetSchema, sheetsCopySheetSchema,
} from '@google-apps-script-mcp/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsManageTools(server: { tool: Function }) {
  server.tool(
    'sheets_create_spreadsheet',
    'Create a new Google Sheets spreadsheet.',
    sheetsSpreadsheetCreateSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('spreadsheetCreate', args)
      return formatResponse(result, {
        summary: 'Spreadsheet created.',
        hint: 'Use sheets_read_range to read data.',
      })
    },
  )

  server.tool(
    'sheets_get_spreadsheet',
    'Get spreadsheet metadata including ID, name, URL, and list of sheets (tabs) with row/column counts.',
    sheetsSpreadsheetGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('spreadsheetGet', args)
      return formatResponse(result, {
        summary: 'Spreadsheet metadata retrieved.',
        hint: 'Use sheets_read_range to read data.',
      })
    },
  )

  server.tool(
    'sheets_add_sheet',
    'Add a new sheet (tab) to a spreadsheet.',
    sheetsAddSheetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('sheetAdd', args)
      return formatResponse(result, { summary: 'Sheet added.' })
    },
  )

  server.tool(
    'sheets_delete_sheet',
    'Delete a sheet (tab) from a spreadsheet. Cannot delete the only remaining sheet.',
    sheetsDeleteSheetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('sheetDelete', args)
      return formatResponse(result, { summary: 'Sheet deleted.' })
    },
  )

  server.tool(
    'sheets_rename_sheet',
    'Rename a sheet (tab) in a spreadsheet.',
    sheetsRenameSheetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('sheetRename', args)
      return formatResponse(result, { summary: 'Sheet renamed.' })
    },
  )

  server.tool(
    'sheets_copy_sheet',
    'Copy a sheet within the same spreadsheet or to a different spreadsheet.',
    sheetsCopySheetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('sheetCopy', args)
      return formatResponse(result, { summary: 'Sheet copied.' })
    },
  )
}
