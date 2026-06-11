#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerCalendarTools } from './tools/index.js'

const server = new McpServer({ name: 'google-workspace-calendar', version: '1.0.0' })
registerCalendarTools(server as unknown as { tool: Function })

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-calendar] MCP server started via STDIO')
}

main().catch((err) => {
  console.error('[google-workspace-calendar] Fatal:', err)
  process.exit(1)
})
