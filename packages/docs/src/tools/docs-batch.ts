import { formatResponse } from '@google-apps-script-mcp/shared'
import { docsBatchSchema } from '@google-apps-script-mcp/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDocsBatchTool(server: { tool: Function }) {
  server.tool(
    'docs_batch',
    'Execute multiple operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (documentGet, insertParagraph, setText, replaceText, insertList, insertTable, insertImage, insertPageBreak, insertHorizontalRule, formatText). Operations execute sequentially; errors are collected per-operation. Requires documentId.',
    docsBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
