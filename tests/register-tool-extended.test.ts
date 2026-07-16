import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { z } from 'zod'
import { registerCatalogTools } from '@workspace-lite/shared/catalog'
import type { ToolSpec } from '@workspace-lite/shared/catalog'
import { registerTool, type ToolServer } from '@workspace-lite/shared/tool-helpers'
import type { ProxyClient } from '@workspace-lite/shared/proxy-client'
import type { ProxyResponse } from '@workspace-lite/shared/response'

class CaptureServer {
  handlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>()

  registerTool(
    name: string,
    _config: { description?: string; inputSchema?: Record<string, unknown> },
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ) {
    this.handlers.set(name, handler)
  }

  tool() {
    throw new Error('not used')
  }

  asToolServer(): ToolServer {
    return this as unknown as ToolServer
  }
}

function mockClient(calls: Array<{ action: string; params: Record<string, unknown> }>): ProxyClient {
  return {
    async callProxy(action, params = {}) {
      calls.push({ action, params })
      return { success: true, data: { ok: true, action } } as ProxyResponse
    },
  }
}

describe('registerTool resolveAction + format(result, args)', () => {
  it('uses resolveAction for multi-action tools', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = []
    const server = new CaptureServer()
    const client = mockClient(calls)

    registerTool(server.asToolServer(), client, {
      name: 'drive_list_folders',
      description: 'List folders',
      schema: {
        folderId: z.string().optional(),
      },
      action: 'folderList',
      resolveAction: (args) => (args.folderId ? 'folderList' : 'folderListRoot'),
    })

    const handler = server.handlers.get('drive_list_folders')
    assert.ok(handler)
    await handler({})
    await handler({ folderId: 'abc' })
    assert.deepEqual(calls.map((c) => c.action), ['folderListRoot', 'folderList'])
  })

  it('passes args to format formatter', async () => {
    const server = new CaptureServer()
    const client = mockClient([])
    let seenArgs: Record<string, unknown> | undefined

    registerTool(server.asToolServer(), client, {
      name: 'tasks_get_task',
      description: 'Get task',
      schema: { taskId: z.string() },
      action: 'tasksGet',
      format: (result, args) => {
        seenArgs = args
        return { content: [{ type: 'text', text: JSON.stringify(result) }] }
      },
    })

    await server.handlers.get('tasks_get_task')!({ taskId: 't1' })
    assert.deepEqual(seenArgs, { taskId: 't1' })
  })

  it('registerCatalogTools wires formatMcp and resolveAction', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = []
    const server = new CaptureServer()
    const client = mockClient(calls)
    let formatArgs: Record<string, unknown> | undefined

    const tools: ToolSpec[] = [
      {
        name: 'drive_list_folders',
        service: 'drive',
        action: 'folderList',
        actions: ['folderList', 'folderListRoot'],
        description: 'List folders under a parent, or root when folderId omitted.',
        schema: { folderId: z.string().optional() },
        batchEligible: true,
        resolveAction: (args) => (args.folderId ? 'folderList' : 'folderListRoot'),
        formatter: {
          kind: 'list',
          formatMcp: (result, args) => {
            formatArgs = args
            return { content: [{ type: 'text', text: `action-data:${JSON.stringify(result.data)}` }] }
          },
        },
      },
    ]

    registerCatalogTools(server.asToolServer(), client, tools)
    const out = await server.handlers.get('drive_list_folders')!({ folderId: 'parent' }) as {
      content: { text: string }[]
    }
    assert.equal(calls[0]?.action, 'folderList')
    assert.deepEqual(formatArgs, { folderId: 'parent' })
    assert.match(out.content[0].text, /action-data/)
  })

  it('validate errors become BAD_REQUEST without calling proxy', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = []
    const server = new CaptureServer()
    const client = mockClient(calls)

    registerTool(server.asToolServer(), client, {
      name: 'calendar_create_event',
      description: 'Create event',
      schema: { start: z.string(), end: z.string() },
      action: 'createEvent',
      validate: (args) => {
        if (String(args.start) > String(args.end)) throw new Error('start must be before end')
      },
    })

    const out = await server.handlers.get('calendar_create_event')!({ start: 'z', end: 'a' }) as {
      content: { text: string }[]
    }
    assert.equal(calls.length, 0)
    assert.match(out.content[0].text, /BAD_REQUEST|start must be before end/)
  })
})
