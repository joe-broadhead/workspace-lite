import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { registerSheetsManageTools } from './sheets-manage.js'
import { registerSheetsReadTools } from './sheets-read.js'
import { registerSheetsWriteTools } from './sheets-write.js'
import { registerSheetsFormatTools } from './sheets-format.js'
import { registerSheetsChartTools } from './sheets-chart.js'
import { registerSheetsBatchTool } from './sheets-batch.js'

export function registerSheetsTools(server: ToolServer) {
  registerSheetsManageTools(server)
  registerSheetsReadTools(server)
  registerSheetsWriteTools(server)
  registerSheetsFormatTools(server)
  registerSheetsChartTools(server)
  registerSheetsBatchTool(server)
}
