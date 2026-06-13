import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { registerTasksBatchTool } from './tasks-batch.js'
import { registerTasksListTools } from './tasks-list.js'
import { registerTasksWriteTools } from './tasks-write.js'

export function registerTasksTools(server: ToolServer) {
  registerTasksListTools(server)
  registerTasksWriteTools(server)
  registerTasksBatchTool(server)
}
