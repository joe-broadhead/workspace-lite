import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { effectiveActions, assertUniqueCliPaths } from '@workspace-lite/shared/catalog'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { tasksTools } from '@workspace-lite/shared/catalog/services/tasks'
import { registerTasksTools } from '../packages/tasks/src/index.js'
import { formsTools } from '@workspace-lite/shared/catalog/services/forms'
import { registerFormsTools } from '../packages/forms/src/index.js'
import { calendarTools } from '@workspace-lite/shared/catalog/services/calendar'
import { registerCalendarTools } from '../packages/calendar/src/index.js'
import { slidesTools } from '@workspace-lite/shared/catalog/services/slides'
import { registerSlidesTools } from '../packages/slides/src/index.js'

const registry = JSON.parse(readFileSync('config/service-registry.json', 'utf8')) as {
  services: Array<{ key: string; toolCount: number }>
}

class CaptureServer {
  readonly names: string[] = []
  registerTool(name: string) { this.names.push(name) }
  tool(name: string) { this.names.push(name) }
}

function parityFor(service: string, catalog: { name: string; action: string; service: string }[], register: (server: ToolServer) => void) {
  describe(`${service} catalog parity`, () => {
    it('catalog length matches registry toolCount', () => {
      const expected = registry.services.find((s) => s.key === service)?.toolCount
      assert.equal(catalog.length, expected)
    })
    it('MCP registration names match catalog 1:1', () => {
      const server = new CaptureServer()
      register(server as unknown as ToolServer)
      assert.deepEqual([...server.names].sort(), catalog.map((t) => t.name).sort())
    })
    it('every tool has unique CLI path and effectiveActions non-empty', () => {
      assertUniqueCliPaths(catalog.map((t) => t.name))
      for (const tool of catalog) {
        const actions = effectiveActions(tool as never)
        assert.ok(actions.length >= 1, tool.name)
        assert.ok(actions.includes(tool.action), `${tool.name} actions must include primary action`)
        assert.equal(tool.service, service)
        assert.equal('riskClass' in tool, false)
      }
    })
    it('old tools directory is deleted (no dual registration)', () => {
      let exists = true
      try { readFileSync(`packages/${service}/src/tools/index.ts`, 'utf8') } catch { exists = false }
      assert.equal(exists, false)
    })
  })
}

parityFor('tasks', tasksTools, registerTasksTools)
parityFor('forms', formsTools, registerFormsTools)
parityFor('calendar', calendarTools, registerCalendarTools)
parityFor('slides', slidesTools, registerSlidesTools)
