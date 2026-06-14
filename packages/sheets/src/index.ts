#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerSheetsTools } from './tools/index.js'

const server = new McpServer({
  name: 'google-workspace-sheets',
  version: '1.0.0',
})

registerSheetsTools(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-sheets] MCP server started via STDIO')
}

main().catch((err) => {
  console.error('[google-workspace-sheets] Fatal:', err)
  process.exit(1)
})
