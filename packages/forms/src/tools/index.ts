import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { registerFormsBatchTool } from './forms-batch.js'
import { registerFormsItemTools } from './forms-items.js'
import { registerFormsManageTools } from './forms-manage.js'
import { registerFormsResponseTools } from './forms-responses.js'

export function registerFormsTools(server: ToolServer) {
  registerFormsManageTools(server)
  registerFormsItemTools(server)
  registerFormsResponseTools(server)
  registerFormsBatchTool(server)
}
