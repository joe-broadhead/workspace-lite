import type { ZodTypeAny } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ProxyClient } from './proxy-client.js'
import { formatResponse } from './response.js'

export type ToolServer = Pick<McpServer, 'registerTool' | 'tool'>

export interface ToolDef {
  name: string
  description: string
  schema: Record<string, ZodTypeAny>
  action: string
  format?: (result: unknown) => { content: { type: 'text'; text: string }[] }
  summary?: string
  validate?: (args: Record<string, unknown>) => void
}

export function registerTool(
  server: ToolServer,
  client: ProxyClient,
  def: ToolDef,
) {
  server.registerTool(
    def.name,
    {
      description: def.description,
      inputSchema: def.schema,
    },
    async (args: Record<string, unknown>) => {
      try {
        def.validate?.(args)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid tool input'
        return formatResponse({ success: false, error: { code: 'BAD_REQUEST', message } })
      }
      const result = await client.callProxy(def.action, args)
      if (def.format) return def.format(result)
      return formatResponse(result, {
        summary: def.summary,
      })
    },
  )
}
