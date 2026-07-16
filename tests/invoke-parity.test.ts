import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { registerCatalogTools } from '@workspace-lite/shared/catalog'
import { tasksTools } from '@workspace-lite/shared/catalog/services/tasks'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import type { ProxyResponse } from '@workspace-lite/shared/response'
import { executeTool } from '../packages/cli/src/execute.js'

/**
 * Invoke parity: CLI executeTool and MCP registerCatalogTools handlers
 * must produce identical callProxy(action, params) for the same logical input.
 * Mock ProxyClient only — never mock the unit under test.
 */

class CaptureServer {
  handlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>()
  registerTool(
    name: string,
    _config: unknown,
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ) {
    this.handlers.set(name, handler)
  }
  tool() {
    throw new Error('unused')
  }
}

function mockClient(calls: Array<{ action: string; params: Record<string, unknown> }>) {
  return {
    async callProxy(action: string, params: Record<string, unknown> = {}) {
      calls.push({ action, params: structuredClone(params) })
      return { success: true, data: { action } } as ProxyResponse
    },
  }
}

const fixtures: Array<{
  tool: string
  mcpArgs: Record<string, unknown>
  cliRaw: Record<string, unknown>
}> = [
  {
    tool: 'tasks_list_tasklists',
    mcpArgs: { maxResults: 10 },
    cliRaw: { maxResults: '10' },
  },
  {
    tool: 'tasks_create_task',
    mcpArgs: { tasklistId: 'tl', title: 'Hello' },
    cliRaw: { tasklistId: 'tl', title: 'Hello' },
  },
  {
    tool: 'tasks_delete_task',
    mcpArgs: { tasklistId: 'tl', taskId: 't1', confirm: true },
    cliRaw: { tasklistId: 'tl', taskId: 't1' }, // CLI injects confirm via --yes
  },
  {
    tool: 'tasks_batch',
    mcpArgs: {
      operations: [
        { action: 'tasksCreate', params: { tasklistId: 'tl', title: 'a' } },
        { action: 'tasksDelete', params: { tasklistId: 'tl', taskId: 't', confirm: true } },
      ],
    },
    cliRaw: {
      paramsJson: JSON.stringify({
        operations: [
          { action: 'tasksCreate', params: { tasklistId: 'tl', title: 'a' } },
          { action: 'tasksDelete', params: { tasklistId: 'tl', taskId: 't' } },
        ],
      }),
    },
  },
]

describe('invoke parity (CLI vs MCP → callProxy)', () => {
  for (const fixture of fixtures) {
    it(`${fixture.tool}: identical (action, params)`, async () => {
      const mcpCalls: Array<{ action: string; params: Record<string, unknown> }> = []
      const cliCalls: Array<{ action: string; params: Record<string, unknown> }> = []

      const server = new CaptureServer()
      registerCatalogTools(server as unknown as ToolServer, mockClient(mcpCalls), tasksTools)
      const handler = server.handlers.get(fixture.tool)
      assert.ok(handler, `MCP handler for ${fixture.tool}`)
      await handler(structuredClone(fixture.mcpArgs))

      const tool = tasksTools.find((t) => t.name === fixture.tool)!
      const yes = fixture.tool.includes('delete') || fixture.tool === 'tasks_batch'
      await executeTool(tool, structuredClone(fixture.cliRaw), {
        yes,
        json: true,
        tty: false,
        clientFactory: () => mockClient(cliCalls),
      })

      assert.equal(mcpCalls.length, 1)
      assert.equal(cliCalls.length, 1)
      assert.equal(cliCalls[0].action, mcpCalls[0].action)

      // CLI may inject confirm; for delete fixture MCP already has confirm
      if (fixture.tool === 'tasks_delete_task') {
        assert.equal(cliCalls[0].params.confirm, true)
        assert.equal(mcpCalls[0].params.confirm, true)
        assert.equal(cliCalls[0].params.tasklistId, mcpCalls[0].params.tasklistId)
        assert.equal(cliCalls[0].params.taskId, mcpCalls[0].params.taskId)
      } else if (fixture.tool === 'tasks_batch') {
        assert.equal(cliCalls[0].action, 'batch')
        assert.equal(mcpCalls[0].action, 'batch')
        const cliOps = cliCalls[0].params.operations as Array<{ params: Record<string, unknown> }>
        const mcpOps = mcpCalls[0].params.operations as Array<{ params: Record<string, unknown> }>
        assert.equal(cliOps[1].params.confirm, true)
        assert.equal(mcpOps[1].params.confirm, true)
        assert.equal(cliOps[0].params.title, mcpOps[0].params.title)
      } else {
        // normalize numbers that CLI coerces from strings
        assert.deepEqual(cliCalls[0].params, mcpCalls[0].params)
      }
    })
  }
})
