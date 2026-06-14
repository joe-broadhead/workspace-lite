import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { registerDriveListTools } from './drive-list.js'
import { registerDriveReadTools } from './drive-read.js'
import { registerDriveWriteTools } from './drive-write.js'
import { registerDriveManageTools } from './drive-manage.js'
import { registerDriveBatchTool } from './drive-batch.js'
import { registerDriveAdvancedTools } from './drive-advanced.js'

export function registerDriveTools(server: ToolServer) {
  registerDriveListTools(server)
  registerDriveReadTools(server)
  registerDriveWriteTools(server)
  registerDriveManageTools(server)
  registerDriveAdvancedTools(server)
  registerDriveBatchTool(server)
}
