#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerTasksTools } from './tools/index.js'

const server = new McpServer({ name: 'google-workspace-tasks', version: '1.0.0' })
registerTasksTools(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-tasks] MCP server started via STDIO')
}

main().catch((err) => {
  console.error('[google-workspace-tasks] Fatal:', err)
  process.exit(1)
})
