#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { runCli } from './program.js'

function isDirectRun(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return import.meta.url === pathToFileURL(entry).href
  } catch {
    return false
  }
}

export { buildProgram, runCli } from './program.js'
export { executeTool, executeRaw } from './execute.js'
export { EXIT, exitCodeFor } from './exit-codes.js'
export { loadCatalogTools } from './catalog-load.js'

if (isDirectRun()) {
  runCli(process.argv).then((code) => {
    process.exit(code)
  }).catch((err) => {
    console.error('[wslite] Fatal:', err)
    process.exit(1)
  })
}
