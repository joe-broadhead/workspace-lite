#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerCatalogTools } from '@workspace-lite/shared/catalog'
import { docsTools } from '@workspace-lite/shared/catalog/services/docs'
import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'

export function registerDocsTools(server: ToolServer) {
  registerCatalogTools(server, createProxyClient('docs'), docsTools)
}

function isDirectRun(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try { return import.meta.url === pathToFileURL(entry).href } catch { return false }
}

async function main() {
  const server = new McpServer({ name: 'google-workspace-docs', version: '1.0.0' })
  registerDocsTools(server)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-docs] MCP server started via STDIO')
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error('[google-workspace-docs] Fatal:', err)
    process.exit(1)
  })
}
