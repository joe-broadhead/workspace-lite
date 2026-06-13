import type { ProxyClient } from './proxy-client.js'
import { formatResponse } from './response.js'

export interface ToolDef {
  name: string
  description: string
  schema: Record<string, unknown>
  action: string
  format?: (result: unknown) => { content: { type: string; text: string }[] }
  summary?: string
}

export function registerTool(
  server: { tool: Function },
  client: ProxyClient,
  def: ToolDef,
) {
  server.tool(
    def.name,
    def.description,
    def.schema,
    async (args: Record<string, unknown>) => {
      const result = await client.callProxy(def.action, args)
      if (def.format) return def.format(result)
      return formatResponse(result, {
        summary: def.summary,
      })
    },
  )
}
