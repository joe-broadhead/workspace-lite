import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { tasksTools } from '@workspace-lite/shared/catalog/services/tasks'
import { effectiveActions, assertUniqueCliPaths } from '@workspace-lite/shared/catalog'
import { registerTasksTools } from '../packages/tasks/src/index.js'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'

const registry = JSON.parse(readFileSync('config/service-registry.json', 'utf8')) as {
  services: Array<{ key: string; toolCount: number }>
}

class CaptureServer {
  readonly names: string[] = []
  registerTool(name: string) {
    this.names.push(name)
  }
  tool(name: string) {
    this.names.push(name)
  }
}

describe('tasks catalog parity', () => {
  it('catalog length matches registry toolCount', () => {
    const expected = registry.services.find((s) => s.key === 'tasks')?.toolCount
    assert.equal(tasksTools.length, expected)
  })

  it('MCP registration names match catalog 1:1', () => {
    const server = new CaptureServer()
    registerTasksTools(server as unknown as ToolServer)
    const catalogNames = tasksTools.map((t) => t.name).sort()
    const registered = [...server.names].sort()
    assert.deepEqual(registered, catalogNames)
  })

  it('every tool has unique CLI path and effectiveActions non-empty', () => {
    assertUniqueCliPaths(tasksTools.map((t) => t.name))
    for (const tool of tasksTools) {
      const actions = effectiveActions(tool)
      assert.ok(actions.length >= 1, tool.name)
      assert.ok(actions.includes(tool.action), `${tool.name} actions must include primary action`)
      assert.equal(tool.service, 'tasks')
      // ToolSpec must not carry hand-authored riskClass
      assert.equal('riskClass' in tool, false)
    }
  })

  it('old tools directory is deleted (no dual registration)', () => {
    let exists = true
    try {
      readFileSync('packages/tasks/src/tools/index.ts', 'utf8')
    } catch {
      exists = false
    }
    assert.equal(exists, false)
  })
})
