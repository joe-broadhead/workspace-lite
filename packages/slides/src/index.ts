#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerSlidesTools } from './tools/index.js'

const server = new McpServer({
  name: 'google-workspace-slides',
  version: '1.0.0',
})

registerSlidesTools(server as unknown as { tool: Function })

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-slides] MCP server started via STDIO')
}

main().catch((err) => {
  console.error('[google-workspace-slides] Fatal:', err)
  process.exit(1)
})
