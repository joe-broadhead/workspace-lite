#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveServices } from './setup-services.mjs'

/**
 * MCP client config generator (JOE-146).
 *
 * Emits config for a selected set of services (profile or explicit list)
 * without ever touching credentials: OpenCode gets `{env:VAR}` references,
 * and mcpServers-style clients (Claude Code, Claude Desktop, Cursor) get a
 * bash wrapper that sources the repo `.env` at launch. Generation is pure
 * string work — no network, no Google auth, no reading of `.env`.
 *
 * CLI:
 *   node scripts/client-config.mjs [--client <name>] [--profile <p> | --services <csv>]
 *                                  [--root <path>] [--windows]
 * JSON goes to stdout; insertion instructions go to stderr so output can be
 * piped or redirected into a file directly.
 */

export const CLIENTS = ['opencode', 'claude-code', 'claude-desktop', 'cursor']

const CLASS_TOKENS = ['READ', 'WRITE', 'SEND', 'SHARE', 'DESTRUCTIVE', 'ADMIN']

export function envVarNames(service) {
  const prefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
  return [
    `${prefix}_PROXY_URL`,
    `${prefix}_PROXY_TOKEN`,
    ...CLASS_TOKENS.map((c) => `${prefix}_PROXY_${c}_TOKEN`),
  ]
}

function joiner(windows) {
  return (...parts) => parts.join(windows ? '\\' : '/')
}

/** OpenCode `mcp` block — same entry shape setup.sh has always printed. */
export function opencodeConfig(services, root, { windows = false } = {}) {
  const j = joiner(windows)
  const mcp = {}
  for (const service of services) {
    const scriptPath = j(root, 'packages', service, 'src', 'index.ts')
    const command = windows
      ? [j(root, 'node_modules', '.bin', 'tsx.cmd'), scriptPath]
      : ['npx', 'tsx', scriptPath]
    const environment = {}
    for (const name of envVarNames(service)) environment[name] = `{env:${name}}`
    mcp[`google-${service}`] = { type: 'local', command, environment }
  }
  return { mcp }
}

/**
 * mcpServers block (Claude Code `.mcp.json`, Claude Desktop, Cursor).
 * These clients do not interpolate env references, so instead of embedding
 * values the command is a bash wrapper that sources the repo .env and then
 * execs the built server. Requires `npm run build` and bash (Git Bash on
 * Windows).
 */
export function mcpServersConfig(services, root) {
  const mcpServers = {}
  for (const service of services) {
    const script = `set -a; . '${root}/.env' 2>/dev/null; set +a; exec node '${root}/packages/${service}/dist/index.js'`
    mcpServers[`google-${service}`] = { command: 'bash', args: ['-c', script] }
  }
  return { mcpServers }
}

export function generateClientConfig({ client = 'opencode', profile, services, root, windows = false }) {
  if (!CLIENTS.includes(client)) {
    throw new Error(`Unknown client "${client}". Valid clients: ${CLIENTS.join(', ')}.`)
  }
  const selected = resolveServices({ profile, services })
  return client === 'opencode'
    ? opencodeConfig(selected, root, { windows })
    : mcpServersConfig(selected, root)
}

const INSTRUCTIONS = {
  opencode: 'Merge the "mcp" object into your opencode.jsonc. Values are {env:...} references — export the variables (source .env) before starting OpenCode.',
  'claude-code': 'Save as .mcp.json in the project where you run Claude Code (or register per server with `claude mcp add-json <name> <json>`). The bash wrapper sources the repo .env at launch; run `npm run build` first.',
  'claude-desktop': 'Merge the "mcpServers" object into claude_desktop_config.json (macOS: ~/Library/Application Support/Claude/, Windows: %APPDATA%\\Claude\\). The bash wrapper sources the repo .env at launch; run `npm run build` first.',
  cursor: 'Merge the "mcpServers" object into ~/.cursor/mcp.json (or the project .cursor/mcp.json). The bash wrapper sources the repo .env at launch; run `npm run build` first.',
}

function defaultRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), '..')
}

function main(argv) {
  const args = { client: 'opencode', profile: undefined, services: undefined, root: undefined, windows: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--client') args.client = argv[++i]
    else if (arg.startsWith('--client=')) args.client = arg.slice('--client='.length)
    else if (arg === '--profile') args.profile = argv[++i]
    else if (arg.startsWith('--profile=')) args.profile = arg.slice('--profile='.length)
    else if (arg === '--services') args.services = argv[++i]
    else if (arg.startsWith('--services=')) args.services = arg.slice('--services='.length)
    else if (arg === '--root') args.root = argv[++i]
    else if (arg.startsWith('--root=')) args.root = arg.slice('--root='.length)
    else if (arg === '--windows') args.windows = true
    else {
      process.stderr.write(`Unknown argument: ${arg}\nUsage: node scripts/client-config.mjs [--client <${CLIENTS.join('|')}>] [--profile <name> | --services <csv>] [--root <path>] [--windows]\n`)
      process.exit(1)
    }
  }
  try {
    const config = generateClientConfig({ ...args, root: args.root ?? defaultRoot() })
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`)
    process.stderr.write(`${INSTRUCTIONS[args.client]}\n`)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }
}

// realpath both sides: argv[1] may arrive through a symlink (e.g. macOS
// /var → /private/var) while import.meta.url is already resolved.
function isDirectRun() {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href
  } catch {
    return false
  }
}

if (isDirectRun()) {
  main(process.argv.slice(2))
}
