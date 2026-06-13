import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { registerSlidesManageTools } from './slides-manage.js'
import { registerSlidesContentTools } from './slides-content.js'
import { registerSlidesReadTools } from './slides-read.js'
import { registerSlidesBatchTool } from './slides-batch.js'

export function registerSlidesTools(server: ToolServer) {
  registerSlidesManageTools(server)
  registerSlidesContentTools(server)
  registerSlidesReadTools(server)
  registerSlidesBatchTool(server)
}
