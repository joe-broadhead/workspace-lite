#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerCatalogTools } from '@workspace-lite/shared/catalog'
import { slidesTools } from '@workspace-lite/shared/catalog/services/slides'
import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'

export function registerSlidesTools(server: ToolServer) {
  registerCatalogTools(server, createProxyClient('slides'), slidesTools)
}

function isDirectRun(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try { return import.meta.url === pathToFileURL(entry).href } catch { return false }
}

async function main() {
  const server = new McpServer({ name: 'google-workspace-slides', version: '1.0.0' })
  registerSlidesTools(server)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('[google-workspace-slides] MCP server started via STDIO')
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error('[google-workspace-slides] Fatal:', err)
    process.exit(1)
  })
}
