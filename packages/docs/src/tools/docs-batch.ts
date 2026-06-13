import { formatResponse } from '@workspace-lite/shared'
import { docsBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDocsBatchTool(server: { tool: Function }) {
  server.tool(
    'docs_batch',
    'Execute multiple operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (documentGet, paragraphInsert, paragraphUpdate, paragraphDelete, setText, replaceText, listInsert, tableInsert, imageInsert, pageBreakInsert, horizontalRuleInsert, formatText, headerSet, footerSet, tocInsert, footnoteInsert). Operations execute sequentially; errors are collected per-operation. Requires documentId.',
    docsBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
