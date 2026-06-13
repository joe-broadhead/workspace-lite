import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { registerDocsManageTools } from './docs-manage.js'
import { registerDocsContentTools } from './docs-content.js'
import { registerDocsFormatTools } from './docs-format.js'
import { registerDocsBatchTool } from './docs-batch.js'

export function registerDocsTools(server: ToolServer) {
  registerDocsManageTools(server)
  registerDocsContentTools(server)
  registerDocsFormatTools(server)
  registerDocsBatchTool(server)
}
