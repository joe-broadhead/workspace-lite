import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { formsBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerFormsBatchTool(server: ToolServer) {
  server.tool(
    'forms_batch',
    'Execute multiple Google Forms operations in a single round-trip. Operations execute sequentially; errors are collected per-operation. Up to 20 operations.',
    formsBatchSchema,
    async (args: Record<string, unknown>) => formatResponse(await callProxy('batch', args), { summary: 'Forms batch completed.' }),
  )
}
