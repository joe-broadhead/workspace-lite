import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { slidesBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSlidesBatchTool(server: ToolServer) {
  server.tool(
    'slides_batch',
    'Execute multiple operations in a single round-trip against one existing presentation. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (presentationGet, slideAdd, slideDelete, slideDuplicate, slideMove, textBoxInsert, imageInsert, shapeInsert, tableInsert, lineInsert, slideElementsList, elementDelete, elementGet, elementGetText, elementFormatText, elementGeometryUpdate, elementTransformUpdate, elementAltTextSet, elementLinkSet, elementReorder, slideNotes, textReplaceAll, slideBackground). Operations execute sequentially; errors are collected per-operation with partial-success metadata. Requires presentationId.',
    slidesBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
