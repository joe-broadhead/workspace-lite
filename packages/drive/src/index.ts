#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerDriveTools } from './tools/index.js'

const server = new McpServer({
  name: 'google-workspace-drive',
  version: '1.0.0',
})

registerDriveTools(server as unknown as { tool: Function })

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-drive] MCP server started via STDIO')
}

main().catch((err) => {
  console.error('[google-workspace-drive] Fatal:', err)
  process.exit(1)
})
