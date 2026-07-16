import type { ServiceKey } from './types.js'

const SERVICE_KEYS = new Set<ServiceKey>([
  'drive', 'gmail', 'calendar', 'sheets', 'slides', 'docs', 'tasks', 'forms',
])

/**
 * drive_get_file → { service: 'drive', path: ['get-file'], mcpName: 'drive_get_file' }
 * Command: wslite <service> <path[0]> e.g. wslite drive get-file
 * Alias: wslite run <mcpName> e.g. wslite run drive_get_file
 */
export function mcpNameToCliPath(name: string): {
  service: ServiceKey
  path: string[]
  mcpName: string
} {
  const underscore = name.indexOf('_')
  if (underscore <= 0) {
    throw new Error(`Invalid MCP tool name (missing service prefix): ${name}`)
  }
  const service = name.slice(0, underscore) as ServiceKey
  if (!SERVICE_KEYS.has(service)) {
    throw new Error(`Unknown service prefix in tool name: ${name}`)
  }
  const rest = name.slice(underscore + 1)
  if (!rest) {
    throw new Error(`Invalid MCP tool name (empty rest): ${name}`)
  }
  // one subcommand segment: get_file → get-file
  return {
    service,
    path: [rest.split('_').join('-')],
    mcpName: name,
  }
}

/** Schema / flag key to kebab-case CLI flag (pageSize → page-size). */
export function keyToFlagName(key: string, aliases?: Record<string, string>): string {
  if (aliases?.[key]) return aliases[key]
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase()
}

/** Assert unique (service, path[0]) for a list of MCP tool names. */
export function assertUniqueCliPaths(toolNames: string[]): void {
  const seen = new Map<string, string>()
  for (const name of toolNames) {
    const { service, path } = mcpNameToCliPath(name)
    const key = `${service}/${path[0]}`
    const prior = seen.get(key)
    if (prior) {
      throw new Error(`CLI path collision: ${key} used by both ${prior} and ${name}`)
    }
    seen.set(key, name)
  }
}
