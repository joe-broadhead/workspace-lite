import { formatResponse } from '@workspace-lite/shared'
import { slidesBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSlidesBatchTool(server: { tool: Function }) {
  server.tool(
    'slides_batch',
    'Execute multiple operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (presentationGet, slideAdd, slideDelete, slideDuplicate, slideMove, textBoxInsert, imageInsert, shapeInsert, tableInsert, slideElementsList, slideNotes, textReplaceAll). Operations execute sequentially; errors are collected per-operation. Requires presentationId.',
    slidesBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
