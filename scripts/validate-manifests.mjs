import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)

const expected = {
  drive: {
    services: ['drive'],
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/script.external_request'],
  },
  gmail: {
    services: ['gmail'],
    scopes: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/script.send_mail',
      'https://www.googleapis.com/auth/script.external_request',
    ],
  },
  calendar: {
    services: ['calendar'],
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/script.external_request'],
  },
  sheets: {
    services: ['sheets'],
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/script.external_request'],
  },
  slides: {
    services: [],
    scopes: ['https://www.googleapis.com/auth/presentations', 'https://www.googleapis.com/auth/script.external_request'],
  },
  docs: {
    services: ['docs'],
    scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/script.external_request'],
  },
}

const failures = []

for (const [service, spec] of Object.entries(expected)) {
  const manifestPath = path.join(root, 'packages', service, 'apps-script', 'appsscript.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const enabled = manifest.dependencies?.enabledAdvancedServices ?? []
  const serviceIds = enabled.map((entry) => entry.serviceId).sort()
  const scopes = manifest.oauthScopes ?? []

  if (manifest.executionApi) {
    failures.push(`${service}: executionApi must not be configured`)
  }

  if (manifest.webapp?.executeAs !== 'USER_DEPLOYING' || manifest.webapp?.access !== 'ANYONE') {
    failures.push(`${service}: webapp deployment must run as USER_DEPLOYING with explicit ANYONE access`)
  }

  if (JSON.stringify(serviceIds) !== JSON.stringify([...spec.services].sort())) {
    failures.push(`${service}: expected Advanced Services ${spec.services.join(', ') || '(none)'}, got ${serviceIds.join(', ') || '(none)'}`)
  }

  for (const scope of spec.scopes) {
    if (!scopes.includes(scope)) failures.push(`${service}: missing OAuth scope ${scope}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Apps Script manifests are valid')
