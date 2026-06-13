#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerGmailTools } from './tools/index.js'

const server = new McpServer({
  name: 'google-workspace-gmail',
  version: '1.0.0',
})

registerGmailTools(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-gmail] MCP server started via STDIO')
}

main().catch((err) => {
  console.error('[google-workspace-gmail] Fatal:', err)
  process.exit(1)
})
