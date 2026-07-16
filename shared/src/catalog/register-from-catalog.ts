import type { ProxyClient } from '../proxy-client.js'
import { registerTool, type ToolServer } from '../tool-helpers.js'
import type { ToolSpec } from './types.js'

/**
 * Register MCP tools from catalog ToolSpec entries via extended registerTool.
 */
export function registerCatalogTools(
  server: ToolServer,
  client: ProxyClient,
  tools: ToolSpec[],
): void {
  for (const tool of tools) {
    registerTool(server, client, {
      name: tool.name,
      description: tool.description,
      schema: tool.schema,
      action: tool.action,
      resolveAction: tool.resolveAction,
      validate: tool.validate,
      summary: tool.formatter?.summary,
      hint: tool.formatter?.hint,
      format: tool.formatter?.formatMcp
        ? (result, args) => tool.formatter!.formatMcp!(result, args)
        : undefined,
    })
  }
}
