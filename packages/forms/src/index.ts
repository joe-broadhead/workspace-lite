#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerFormsTools } from './tools/index.js'

const server = new McpServer({ name: 'google-workspace-forms', version: '1.0.0' })
registerFormsTools(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-forms] MCP server started via STDIO')
}

main().catch((err) => {
  console.error('[google-workspace-forms] Fatal:', err)
  process.exit(1)
})
