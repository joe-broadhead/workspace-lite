import fs from 'node:fs'
import path from 'node:path'
import { loadRegistry } from './registry-helpers.mjs'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const { services } = loadRegistry()

const failures = []

for (const service of services) {
  const manifestPath = path.join(root, 'packages', service.key, 'apps-script', 'appsscript.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const enabled = manifest.dependencies?.enabledAdvancedServices ?? []
  const serviceIds = enabled.map((entry) => entry.serviceId).sort()
  const scopes = manifest.oauthScopes ?? []
  const expectedServices = service.advancedServices.map((entry) => entry.serviceId).sort()

  if (manifest.executionApi) {
    failures.push(`${service.key}: executionApi must not be configured`)
  }

  if (manifest.webapp?.executeAs !== 'USER_DEPLOYING' || manifest.webapp?.access !== 'ANYONE_ANONYMOUS') {
    failures.push(`${service.key}: webapp deployment must run as USER_DEPLOYING with explicit anonymous access`)
  }

  if (JSON.stringify(serviceIds) !== JSON.stringify(expectedServices)) {
    failures.push(`${service.key}: expected Advanced Services ${expectedServices.join(', ') || '(none)'}, got ${serviceIds.join(', ') || '(none)'}`)
  }

  for (const scope of service.oauthScopes) {
    if (!scopes.includes(scope)) failures.push(`${service.key}: missing OAuth scope ${scope}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Apps Script manifests are valid')
