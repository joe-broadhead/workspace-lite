#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * Service selection for scripts/setup.sh (JOE-144).
 *
 * Resolves --profile / --services arguments into the ordered list of
 * services setup should touch. Kept in Node (not bash) so profile
 * expansion and list parsing are unit-testable by the repo test suite.
 *
 * CLI contract (consumed by setup.sh):
 *   node scripts/setup-services.mjs [--profile <name>] [--services <csv>]
 * prints the resolved services space-separated on stdout, or a clear
 * error on stderr with exit code 1.
 */

export const ALL_SERVICES = ['drive', 'gmail', 'calendar', 'sheets', 'slides', 'docs', 'tasks', 'forms']

export const PROFILES = {
  full: ALL_SERVICES,
  core: ['drive', 'gmail', 'calendar'],
  authoring: ['drive', 'docs', 'sheets', 'slides'],
  planning: ['calendar', 'tasks', 'docs'],
  forms: ['forms', 'sheets', 'drive'],
}

/**
 * Resolve a profile name and/or CSV service list to an ordered service list.
 * Order is always canonical (ALL_SERVICES order) regardless of input order,
 * so downstream output (deploy prompts, config snippets) is stable.
 * Throws Error with a user-facing message on any invalid input.
 */
export function resolveServices({ profile, services } = {}) {
  if (profile && services) {
    throw new Error('Use either --profile or --services, not both.')
  }
  if (profile) {
    const expanded = PROFILES[profile.toLowerCase().trim()]
    if (!expanded) {
      throw new Error(`Unknown profile "${profile}". Valid profiles: ${Object.keys(PROFILES).join(', ')}.`)
    }
    return [...expanded].sort((a, b) => ALL_SERVICES.indexOf(a) - ALL_SERVICES.indexOf(b))
  }
  if (services !== undefined) {
    const requested = services.split(',').map((s) => s.toLowerCase().trim()).filter(Boolean)
    if (requested.length === 0) {
      throw new Error(`--services requires at least one service. Valid services: ${ALL_SERVICES.join(', ')}.`)
    }
    const unknown = requested.filter((s) => !ALL_SERVICES.includes(s))
    if (unknown.length > 0) {
      throw new Error(`Unknown service${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Valid services: ${ALL_SERVICES.join(', ')}.`)
    }
    return ALL_SERVICES.filter((s) => requested.includes(s))
  }
  return [...ALL_SERVICES]
}

function main(argv) {
  const args = { profile: undefined, services: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--profile') args.profile = argv[++i]
    else if (arg.startsWith('--profile=')) args.profile = arg.slice('--profile='.length)
    else if (arg === '--services') args.services = argv[++i]
    else if (arg.startsWith('--services=')) args.services = arg.slice('--services='.length)
    else {
      process.stderr.write(`Unknown argument: ${arg}\n`)
      process.exit(1)
    }
  }
  try {
    process.stdout.write(`${resolveServices(args).join(' ')}\n`)
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
