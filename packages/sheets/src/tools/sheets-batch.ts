import { formatResponse } from '@workspace-lite/shared'
import { sheetsBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsBatchTool(server: { tool: Function }) {
  server.tool(
    'sheets_batch',
    'Execute multiple operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (spreadsheetCreate, spreadsheetGet, sheetAdd, sheetDelete, sheetRename, sheetCopy, rangeRead, rangeWrite, rowsAppend, rangeClear, rangeGetFormulas, rangeGetNotes, valuesBatchGet, rangeFormat, rangeMerge, rangeUnmerge, columnWidth, freezeRows, rangeSort, formulaSet, chartCreate, noteSet, conditionalFormatGet, dataValidationSet, rowsInsert, rowsDelete). Operations execute sequentially; errors are collected and returned per-operation.',
    sheetsBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
