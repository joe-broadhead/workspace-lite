import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { sheetsCreateChartSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsChartTools(server: ToolServer) {
  server.tool(
    'sheets_create_chart',
    'Create a chart in a sheet from a data range. Supports AREA, BAR, COLUMN, COMBO, HISTOGRAM, LINE, PIE, SCATTER, TABLE, TIMELINE, and WATERFALL chart types.',
    sheetsCreateChartSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('chartCreate', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, {
        summary: `Chart created at position ${(result.data as Record<string, unknown>)?.position || args.position}.`,
      })
    },
  )
}
