import type { ZodTypeAny } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ProxyClient } from './proxy-client.js'
import { formatResponse, type ProxyResponse } from './response.js'

export type ToolServer = Pick<McpServer, 'registerTool' | 'tool'>

export interface ToolDef {
  name: string
  description: string
  schema: Record<string, ZodTypeAny>
  action: string
  resolveAction?: (args: Record<string, unknown>) => string
  validate?: (args: Record<string, unknown>) => void
  summary?: string
  hint?: string
  /**
   * Receives args — required for formatters that close over inputs.
   * Single-arg formatters remain assignable (extra param ignored at runtime).
   */
  format?: (
    result: ProxyResponse,
    args: Record<string, unknown>,
  ) => { content: { type: 'text'; text: string }[] }
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
      const action = def.resolveAction?.(args) ?? def.action
      try {
        const result = await client.callProxy(action, args)
        if (def.format) return def.format(result, args)
        return formatResponse(result, {
          summary: def.summary,
          hint: def.hint,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Proxy call failed'
        return formatResponse({ success: false, error: { code: 'PROXY_ERROR', message } })
      }
    },
  )
}
