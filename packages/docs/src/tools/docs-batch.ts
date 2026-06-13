import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { docsBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDocsBatchTool(server: ToolServer) {
  server.tool(
    'docs_batch',
    'Execute multiple operations in a single round-trip against one existing document. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (documentGet, documentGetJson, paragraphInsert, paragraphUpdate, paragraphDelete, setText, replaceText, listInsert, tableInsert, imageInsert, pageBreakInsert, horizontalRuleInsert, formatText, headerSet, footerSet). Operations execute sequentially; errors are collected per-operation with partial-success metadata. Requires documentId.',
    docsBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
