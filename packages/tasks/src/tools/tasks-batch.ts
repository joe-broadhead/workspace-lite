import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { tasksBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerTasksBatchTool(server: ToolServer) {
  server.tool(
    'tasks_batch',
    'Execute multiple Google Tasks operations in a single round-trip. Operations execute sequentially; errors are collected per-operation. Up to 20 operations.',
    tasksBatchSchema,
    async (args: Record<string, unknown>) => formatResponse(await callProxy('batch', args), { summary: 'Tasks batch completed.' }),
  )
}
