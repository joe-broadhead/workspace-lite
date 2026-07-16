import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EXIT, exitCodeFor, executeTool, loadCatalogTools } from '../../packages/cli/src/index.js'
import { runCli } from '../../packages/cli/src/program.js'
import type { ProxyResponse } from '@workspace-lite/shared/response'
import { findToolByName } from '../../packages/cli/src/catalog-load.js'
import { tasksTools } from '@workspace-lite/shared/catalog/services/tasks'

function mockFactory(calls: Array<{ action: string; params: Record<string, unknown> }>, response?: ProxyResponse) {
  return (service: string) => ({
    async callProxy(action: string, params: Record<string, unknown> = {}) {
      calls.push({ action, params })
      assert.equal(service, 'tasks')
      return response ?? ({ success: true, data: { ok: true, action } } as ProxyResponse)
    },
  })
}

describe('CLI MVP', () => {
  it('includes tasks tools in catalog load', () => {
    const tools = loadCatalogTools()
    const tasks = tools.filter((t) => t.service === 'tasks')
    assert.equal(tasks.length, tasksTools.length)
    assert.ok(tools.length >= tasksTools.length)
  })

  it('exitCodeFor maps success / partial / confirm / fail', () => {
    assert.equal(exitCodeFor({ success: true, data: {} }), EXIT.SUCCESS)
    assert.equal(exitCodeFor({ success: true, partial: true, data: {}, results: [] }), EXIT.PARTIAL)
    assert.equal(exitCodeFor({ success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'x' } }), EXIT.CONFIRM)
    assert.equal(exitCodeFor({ success: false, error: { code: 'INTERNAL_ERROR', message: 'x' } }), EXIT.FAILURE)
  })

  it('executeTool injects confirm for destructive with --yes and calls proxy', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = []
    const tool = findToolByName(loadCatalogTools(), 'tasks_delete_task')!
    const result = await executeTool(
      tool,
      { tasklistId: 'tl1', taskId: 't1' },
      { yes: true, json: true, tty: false, clientFactory: mockFactory(calls) },
    )
    assert.equal(result.exitCode, EXIT.SUCCESS)
    assert.equal(calls[0]?.action, 'tasksDelete')
    assert.equal(calls[0]?.params.confirm, true)
  })

  it('executeTool returns exit 2 without --yes on non-tty for destructive', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = []
    const tool = findToolByName(loadCatalogTools(), 'tasks_delete_task')!
    const result = await executeTool(
      tool,
      { tasklistId: 'tl1', taskId: 't1' },
      { yes: false, json: true, tty: false, clientFactory: mockFactory(calls) },
    )
    assert.equal(result.exitCode, EXIT.CONFIRM)
    assert.equal(calls.length, 0)
  })

  it('batch --yes injects per-op confirm (K14)', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = []
    const tool = findToolByName(loadCatalogTools(), 'tasks_batch')!
    const result = await executeTool(
      tool,
      {
        paramsJson: JSON.stringify({
          operations: [
            { action: 'tasksCreate', params: { tasklistId: 'tl', title: 'a' } },
            { action: 'tasksDelete', params: { tasklistId: 'tl', taskId: 't' } },
          ],
        }),
      },
      { yes: true, json: true, tty: false, clientFactory: mockFactory(calls) },
    )
    assert.equal(result.exitCode, EXIT.SUCCESS)
    const ops = calls[0]?.params.operations as Array<{ action: string; params: Record<string, unknown> }>
    assert.equal(ops[0].params.confirm, undefined)
    assert.equal(ops[1].params.confirm, true)
  })

  it('wslite tools --json lists tasks tools', async () => {
    const chunks: string[] = []
    const orig = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk))
      return true
    }) as typeof process.stdout.write
    try {
      const code = await runCli(['node', 'wslite', 'tools', '--json'], {
        tty: false,
        exit: () => {},
      })
      assert.equal(code, EXIT.SUCCESS)
      const parsed = JSON.parse(chunks.join(''))
      assert.ok(Array.isArray(parsed.tools))
      const tasks = parsed.tools.filter((t: { service: string }) => t.service === 'tasks')
      assert.equal(tasks.length, tasksTools.length)
      assert.ok(parsed.tools.length >= tasksTools.length)
    } finally {
      process.stdout.write = orig
    }
  })

  it('wslite doctor reports env presence', async () => {
    const chunks: string[] = []
    const orig = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk))
      return true
    }) as typeof process.stdout.write
    try {
      const code = await runCli(['node', 'wslite', 'doctor', '--json'], {
        tty: false,
        env: {
          GOOGLE_WORKSPACE_TASKS_PROXY_URL: 'https://example.invalid',
          GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN: 'secret',
          GOOGLE_WORKSPACE_FORMS_PROXY_URL: 'https://example.invalid/forms',
          GOOGLE_WORKSPACE_FORMS_PROXY_TOKEN: 'secret-forms',
          GOOGLE_WORKSPACE_CALENDAR_PROXY_URL: 'https://example.invalid/calendar',
          GOOGLE_WORKSPACE_CALENDAR_PROXY_TOKEN: 'secret-cal',
          GOOGLE_WORKSPACE_SLIDES_PROXY_URL: 'https://example.invalid/slides',
          GOOGLE_WORKSPACE_SLIDES_PROXY_TOKEN: 'secret-slides',
          GOOGLE_WORKSPACE_DOCS_PROXY_URL: 'https://example.invalid/docs',
          GOOGLE_WORKSPACE_DOCS_PROXY_TOKEN: 'secret-docs',
        },
        exit: () => {},
      })
      assert.equal(code, EXIT.SUCCESS)
      const parsed = JSON.parse(chunks.join(''))
      const tasks = parsed.services.find((s: { service: string }) => s.service === 'tasks')
      assert.equal(tasks.proxyUrl, 'set')
      assert.equal(tasks.primaryToken, 'set')
      // never leak token value
      assert.doesNotMatch(chunks.join(''), /secret/)
    } finally {
      process.stdout.write = orig
    }
  })

  it('wslite call refuses unknown action without raw', async () => {
    const err: string[] = []
    const orig = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string | Uint8Array) => {
      err.push(String(chunk))
      return true
    }) as typeof process.stderr.write
    try {
      const code = await runCli(['node', 'wslite', 'call', 'tasks', 'notARealAction'], {
        tty: false,
        exit: () => {},
      })
      assert.equal(code, EXIT.USAGE)
      assert.match(err.join(''), /Unknown action/)
    } finally {
      process.stderr.write = orig
    }
  })

  it('wslite call --raw without env exits 4', async () => {
    const err: string[] = []
    const orig = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string | Uint8Array) => {
      err.push(String(chunk))
      return true
    }) as typeof process.stderr.write
    try {
      const code = await runCli(['node', 'wslite', 'call', 'tasks', 'notARealAction', '--raw'], {
        tty: false,
        env: {},
        exit: () => {},
      })
      assert.equal(code, EXIT.USAGE)
      assert.match(err.join(''), /WSLITE_ALLOW_RAW/)
    } finally {
      process.stderr.write = orig
    }
  })

  it('sugared tasks list-tasklists hits proxy with correct action', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = []
    const out: string[] = []
    const origOut = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Uint8Array) => {
      out.push(String(chunk))
      return true
    }) as typeof process.stdout.write
    try {
      const code = await runCli(
        ['node', 'wslite', 'tasks', 'list-tasklists', '--json', '--max-results', '5'],
        {
          tty: false,
          clientFactory: mockFactory(calls),
          exit: () => {},
        },
      )
      assert.equal(code, EXIT.SUCCESS)
      assert.equal(calls[0]?.action, 'tasklistsList')
      const parsed = JSON.parse(out.join(''))
      assert.equal(parsed.ok, true)
      assert.equal(parsed.action, 'tasklistsList')
      assert.equal(parsed.tool, 'tasks_list_tasklists')
    } finally {
      process.stdout.write = origOut
    }
  })
})
