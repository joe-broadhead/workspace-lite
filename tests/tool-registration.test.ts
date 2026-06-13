import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { registerCalendarTools } from '../packages/calendar/src/tools/index.js'
import { registerDocsTools } from '../packages/docs/src/tools/index.js'
import { registerDriveTools } from '../packages/drive/src/tools/index.js'
import { registerGmailTools } from '../packages/gmail/src/tools/index.js'
import { registerSheetsTools } from '../packages/sheets/src/tools/index.js'
import { registerSlidesTools } from '../packages/slides/src/tools/index.js'

type Handler = (args: Record<string, unknown>) => unknown

interface Registration {
  name: string
  description: string
  schema: Record<string, unknown>
}

class CaptureServer {
  readonly registrations: Registration[] = []

  registerTool(name: string, config: { description?: string; inputSchema?: Record<string, unknown> }, _handler: Handler) {
    this.registrations.push({
      name,
      description: config.description ?? '',
      schema: config.inputSchema ?? {},
    })
  }

  tool(name: string, description: string, schema: Record<string, unknown>, _handler: Handler) {
    this.registrations.push({ name, description, schema })
  }
}

const services = [
  { key: 'drive', title: 'Drive', expected: 29, register: registerDriveTools },
  { key: 'gmail', title: 'Gmail', expected: 33, register: registerGmailTools },
  { key: 'calendar', title: 'Calendar', expected: 15, register: registerCalendarTools },
  { key: 'sheets', title: 'Sheets', expected: 27, register: registerSheetsTools },
  { key: 'slides', title: 'Slides', expected: 19, register: registerSlidesTools },
  { key: 'docs', title: 'Docs', expected: 17, register: registerDocsTools },
]

function registrationsFor(register: (server: ToolServer) => void) {
  const server = new CaptureServer()
  register(server as unknown as ToolServer)
  return server.registrations
}

function assertMentionsTool(documentText: string, toolName: string, sourceName: string) {
  assert.match(documentText, new RegExp('`' + toolName + '`'), `${sourceName} must mention ${toolName}`)
}

describe('tool registration', () => {
  it('registers the expected tool count with descriptions and schemas for every service', () => {
    let total = 0
    for (const service of services) {
      const registrations = registrationsFor(service.register)
      const names = registrations.map((registration) => registration.name)
      total += registrations.length

      assert.equal(registrations.length, service.expected, `${service.key} registered tool count changed`)
      assert.equal(new Set(names).size, names.length, `${service.key} has duplicate tool names`)
      assert.ok(names.every((name) => name.startsWith(service.key + '_')), `${service.key} tools must use service prefix`)

      for (const registration of registrations) {
        assert.ok(registration.description.length > 10, `${registration.name} must have a useful description`)
        assert.equal(typeof registration.schema, 'object', `${registration.name} must have an input schema object`)
      }
    }

    assert.equal(total, 140)
  })

  it('keeps README, service docs, and skill catalog tool names aligned with registrations', () => {
    const readme = readFileSync('README.md', 'utf8')
    const catalog = readFileSync('skills/google-workspace/references/tool-catalog.md', 'utf8')

    for (const service of services) {
      const registrations = registrationsFor(service.register)
      const serviceDocs = readFileSync(`docs/services/${service.key}.md`, 'utf8')

      assert.match(readme, new RegExp('\\| `' + service.key + '` \\| ' + service.expected + ' \\|'), `README count for ${service.key} must match registrations`)
      assert.match(catalog, new RegExp('## ' + service.title + ' . ' + service.expected + ' tools'), `skill catalog count for ${service.title} must match registrations`)

      for (const registration of registrations) {
        assertMentionsTool(serviceDocs, registration.name, `docs/services/${service.key}.md`)
        assertMentionsTool(catalog, registration.name, 'skills/google-workspace/references/tool-catalog.md')
      }
    }
  })
})
