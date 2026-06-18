import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isWindows = process.platform === 'win32' || process.env.OS === 'Windows_NT'

const required = [
  {
    path: 'node_modules/zod/v4/classic/external.js',
    why: 'Zod ESM entrypoint used by MCP server startup',
  },
  {
    path: 'node_modules/ajv/dist/compile/validate/index.js',
    why: 'AJV ESM entrypoint used by transitive schema validation',
  },
  {
    path: isWindows ? 'node_modules/.bin/tsx.cmd' : 'node_modules/.bin/tsx',
    why: 'local tsx executable used by generated MCP client commands',
  },
]

const missing = required.filter((entry) => !existsSync(path.join(root, entry.path)))

if (missing.length > 0) {
  console.error('[workspace-lite] npm install appears incomplete.')
  for (const entry of missing) {
    console.error(`  missing: ${entry.path}`)
    console.error(`    needed for: ${entry.why}`)
  }
  console.error('')
  console.error('Fix: remove node_modules and run a clean install:')
  console.error('  rm -rf node_modules && npm install')
  console.error('')
  console.error('On Windows, run this from Git Bash or MSYS2.')
  process.exit(1)
}
