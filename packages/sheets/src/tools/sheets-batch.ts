import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { sheetsBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsBatchTool(server: ToolServer) {
  server.tool(
    'sheets_batch',
    'Execute multiple operations in a single round-trip against one existing spreadsheet. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (spreadsheetGet, sheetAdd, sheetDelete, sheetRename, sheetCopy, rangeRead, rangeWrite, rowsAppend, rangeClear, rangeGetFormulas, rangeGetNotes, valuesBatchGet, textFind, textReplace, rangeFormat, rangeMerge, rangeUnmerge, columnWidth, freezeRows, rangeSort, formulaSet, chartCreate, noteSet, conditionalFormatGet, dataValidationSet, protectionsList, rangeProtect, sheetProtect, protectionRemove, rowsInsert, rowsDelete). Operations execute sequentially; errors are collected and returned per-operation with partial-success metadata.',
    sheetsBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
