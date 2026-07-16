#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerCatalogTools } from '@workspace-lite/shared/catalog'
import { tasksTools } from '@workspace-lite/shared/catalog/services/tasks'
import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'

/** Register tasks MCP tools from catalog SSOT (used by tests and server entry). */
export function registerTasksTools(server: ToolServer) {
  registerCatalogTools(server, createProxyClient('tasks'), tasksTools)
}

function isDirectRun(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return import.meta.url === pathToFileURL(entry).href
  } catch {
    return false
  }
}

async function main() {
  const server = new McpServer({ name: 'google-workspace-tasks', version: '1.0.0' })
  registerTasksTools(server)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-tasks] MCP server started via STDIO')
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error('[google-workspace-tasks] Fatal:', err)
    process.exit(1)
  })
}
