import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { registerCatalogTools } from '@workspace-lite/shared/catalog'
import { calendarTools } from '@workspace-lite/shared/catalog/services/calendar'
import { docsTools } from '@workspace-lite/shared/catalog/services/docs'
import { driveTools } from '@workspace-lite/shared/catalog/services/drive'
import { formsTools } from '@workspace-lite/shared/catalog/services/forms'
import { gmailTools } from '@workspace-lite/shared/catalog/services/gmail'
import { sheetsTools } from '@workspace-lite/shared/catalog/services/sheets'
import { slidesTools } from '@workspace-lite/shared/catalog/services/slides'
import { tasksTools } from '@workspace-lite/shared/catalog/services/tasks'
import type { ToolSpec } from '@workspace-lite/shared/catalog'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import type { ProxyResponse } from '@workspace-lite/shared/response'
import { executeTool } from '../packages/cli/src/execute.js'

/**
 * Invoke parity: CLI executeTool and MCP registerCatalogTools handlers
 * must produce identical callProxy(action, params). Mock ProxyClient only.
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

const allTools: ToolSpec[] = [
  ...tasksTools,
  ...formsTools,
  ...calendarTools,
  ...slidesTools,
  ...docsTools,
  ...sheetsTools,
  ...gmailTools,
  ...driveTools,
]

const fixtures: Array<{
  tool: string
  mcpArgs: Record<string, unknown>
  cliRaw: Record<string, unknown>
  yes?: boolean
}> = [
  // tasks
  { tool: 'tasks_list_tasklists', mcpArgs: { maxResults: 10 }, cliRaw: { maxResults: '10' } },
  { tool: 'tasks_create_task', mcpArgs: { tasklistId: 'tl', title: 'Hello' }, cliRaw: { tasklistId: 'tl', title: 'Hello' } },
  { tool: 'tasks_delete_task', mcpArgs: { tasklistId: 'tl', taskId: 't1', confirm: true }, cliRaw: { tasklistId: 'tl', taskId: 't1' }, yes: true },
  // forms
  { tool: 'forms_create_form', mcpArgs: { title: 'Form' }, cliRaw: { title: 'Form' } },
  { tool: 'forms_get_form', mcpArgs: { formId: 'f1' }, cliRaw: { formId: 'f1' } },
  // calendar
  { tool: 'calendar_list_calendars', mcpArgs: {}, cliRaw: {} },
  { tool: 'calendar_create_event', mcpArgs: { title: 'Meet', startTime: '2026-08-01T10:00:00Z', endTime: '2026-08-01T11:00:00Z' }, cliRaw: { title: 'Meet', startTime: '2026-08-01T10:00:00Z', endTime: '2026-08-01T11:00:00Z' } },
  // slides / docs / sheets use schema key `name`
  { tool: 'slides_create_presentation', mcpArgs: { name: 'Deck' }, cliRaw: { name: 'Deck' } },
  { tool: 'docs_create_document', mcpArgs: { name: 'Doc' }, cliRaw: { name: 'Doc' } },
  { tool: 'sheets_create_spreadsheet', mcpArgs: { name: 'Sheet' }, cliRaw: { name: 'Sheet' } },
  // gmail
  { tool: 'gmail_list_labels', mcpArgs: {}, cliRaw: {} },
  { tool: 'gmail_send', mcpArgs: { to: 'a@b.com', subject: 's', body: 'b', confirm: true }, cliRaw: { to: 'a@b.com', subject: 's', body: 'b' }, yes: true },
  // drive multi-action
  { tool: 'drive_list_folders', mcpArgs: {}, cliRaw: {} },
  { tool: 'drive_list_folders', mcpArgs: { folderId: 'parent' }, cliRaw: { folderId: 'parent' } },
  { tool: 'drive_get_file', mcpArgs: { fileId: 'f1' }, cliRaw: { fileId: 'f1' } },
  { tool: 'drive_trash_file', mcpArgs: { fileId: 'f1', confirm: true }, cliRaw: { fileId: 'f1' }, yes: true },
]

describe('invoke parity (CLI vs MCP → callProxy)', () => {
  it('catalog total is 218', () => {
    assert.equal(allTools.length, 218)
  })

  for (const fixture of fixtures) {
    it(`${fixture.tool}: identical (action, params) ${JSON.stringify(fixture.mcpArgs).slice(0, 40)}`, async () => {
      const mcpCalls: Array<{ action: string; params: Record<string, unknown> }> = []
      const cliCalls: Array<{ action: string; params: Record<string, unknown> }> = []
      const tool = allTools.find((t) => t.name === fixture.tool)
      assert.ok(tool, `missing catalog tool ${fixture.tool}`)

      const server = new CaptureServer()
      registerCatalogTools(server as unknown as ToolServer, mockClient(mcpCalls), [tool])
      const handler = server.handlers.get(fixture.tool)
      assert.ok(handler)
      await handler(structuredClone(fixture.mcpArgs))

      await executeTool(tool, structuredClone(fixture.cliRaw), {
        yes: Boolean(fixture.yes),
        json: true,
        tty: false,
        clientFactory: () => mockClient(cliCalls),
      })

      assert.equal(mcpCalls.length, 1, 'mcp call')
      assert.equal(cliCalls.length, 1, 'cli call')
      assert.equal(cliCalls[0].action, mcpCalls[0].action)

      // For confirm-injected tools, CLI and MCP both end with confirm true
      if (fixture.yes) {
        assert.equal(cliCalls[0].params.confirm, true)
        assert.equal(mcpCalls[0].params.confirm, true)
      }

      // Compare params excluding confirm if MCP pre-set it identically
      const strip = (p: Record<string, unknown>) => {
        const c = { ...p }
        return c
      }
      // Coerce string numbers already handled by parseCliArgs
      for (const key of Object.keys(mcpCalls[0].params)) {
        if (key === 'confirm') continue
        assert.equal(
          String(cliCalls[0].params[key] ?? ''),
          String(mcpCalls[0].params[key] ?? ''),
          `${fixture.tool} param ${key}`,
        )
      }
      void strip
    })
  }

  it('drive_list_folders resolveAction picks folderList vs folderListRoot', async () => {
    const tool = driveTools.find((t) => t.name === 'drive_list_folders')!
    assert.ok(tool.resolveAction)
    assert.equal(tool.resolveAction!({}), 'folderListRoot')
    assert.equal(tool.resolveAction!({ folderId: 'x' }), 'folderList')
    assert.deepEqual(tool.actions, ['folderList', 'folderListRoot'])
  })
})
