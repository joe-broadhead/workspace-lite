import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { z } from 'zod'
import {
  applyConfirmPolicy,
  assertUniqueCliPaths,
  effectiveActions,
  mcpNameToCliPath,
  parseCliArgs,
  ParseCliArgsError,
  type ToolSpec,
} from '@workspace-lite/shared/catalog'

describe('catalog naming', () => {
  it('maps MCP names to service + kebab subcommand', () => {
    assert.deepEqual(mcpNameToCliPath('drive_get_file'), {
      service: 'drive',
      path: ['get-file'],
      mcpName: 'drive_get_file',
    })
    assert.deepEqual(mcpNameToCliPath('tasks_list'), {
      service: 'tasks',
      path: ['list'],
      mcpName: 'tasks_list',
    })
  })

  it('detects CLI path collisions', () => {
    assert.throws(
      () => assertUniqueCliPaths(['drive_get_file', 'drive_get_file']),
      /collision/,
    )
    assert.doesNotThrow(() => assertUniqueCliPaths(['drive_get_file', 'drive_list_files']))
  })
})

describe('effectiveActions', () => {
  it('returns actions[] when set, otherwise [action]', () => {
    const single = {
      name: 'tasks_list',
      service: 'tasks',
      action: 'tasklistsList',
      description: 'x',
      schema: {},
      batchEligible: true,
    } as ToolSpec
    assert.deepEqual(effectiveActions(single), ['tasklistsList'])

    const multi = {
      ...single,
      name: 'drive_list_folders',
      service: 'drive',
      action: 'folderList',
      actions: ['folderList', 'folderListRoot'],
    } as ToolSpec
    assert.deepEqual(effectiveActions(multi), ['folderList', 'folderListRoot'])
  })
})

describe('parseCliArgs', () => {
  const shape = {
    title: z.string(),
    pageSize: z.number().min(1).max(100).default(50),
    includeCompleted: z.boolean().optional(),
    confirm: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }

  it('coerces numbers and booleans and strips confirm from flags', () => {
    const parsed = parseCliArgs(shape, {
      title: 'Hello',
      pageSize: '25',
      includeCompleted: 'yes',
      confirm: true,
    })
    assert.equal(parsed.title, 'Hello')
    assert.equal(parsed.pageSize, 25)
    assert.equal(parsed.includeCompleted, true)
    assert.equal(parsed.confirm, undefined)
  })

  it('parses JSON for complex keys and params-json base with flag override', () => {
    const parsed = parseCliArgs(shape, {
      paramsJson: JSON.stringify({ title: 'from-json', pageSize: 10 }),
      title: 'from-flag',
      tags: '["a","b"]',
    })
    assert.equal(parsed.title, 'from-flag')
    assert.equal(parsed.pageSize, 10)
    assert.deepEqual(parsed.tags, ['a', 'b'])
  })

  it('loads operations from --operations-file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wslite-parse-'))
    const file = join(dir, 'ops.json')
    writeFileSync(file, JSON.stringify([{ action: 'tasksCreate', params: { title: 't' } }]))
    const batchShape = {
      operations: z.array(z.object({ action: z.string(), params: z.record(z.string(), z.unknown()).optional() })),
    }
    const parsed = parseCliArgs(batchShape, { operationsFile: file })
    assert.equal(Array.isArray(parsed.operations), true)
    assert.equal((parsed.operations as unknown[])[0] && (parsed.operations as { action: string }[])[0].action, 'tasksCreate')
  })

  it('rejects invalid numbers with ParseCliArgsError', () => {
    assert.throws(
      () => parseCliArgs(shape, { title: 'x', pageSize: 'nope' }),
      (err: unknown) => err instanceof ParseCliArgsError,
    )
  })
})

describe('applyConfirmPolicy', () => {
  it('injects top-level confirm for single high-risk tools with --yes', async () => {
    const decision = await applyConfirmPolicy({
      service: 'tasks',
      action: 'tasksDelete',
      args: { tasklistId: 'tl', taskId: 't' },
      isBatch: false,
      yes: true,
      tty: false,
      prompt: async () => false,
    })
    assert.equal(decision.ok, true)
    if (decision.ok) assert.equal(decision.args.confirm, true)
  })

  it('requires non-tty --yes for single high-risk without confirm', async () => {
    const decision = await applyConfirmPolicy({
      service: 'gmail',
      action: 'send',
      args: { to: 'a@b.com', subject: 's', body: 'b' },
      isBatch: false,
      yes: false,
      tty: false,
      prompt: async () => true,
    })
    assert.equal(decision.ok, false)
    if (!decision.ok) assert.equal(decision.reason, 'required_non_tty')
  })

  it('injects confirm into each gated batch op params (K14), summary-only prompt (K20)', async () => {
    let promptText = ''
    const decision = await applyConfirmPolicy({
      service: 'gmail',
      args: {
        operations: [
          { action: 'markRead', params: { id: '1' } },
          { action: 'send', params: { to: 'secret@example.com', body: 'PII body' } },
          { action: 'deleteMessage', params: { id: '2' } },
        ],
      },
      action: 'batch',
      isBatch: true,
      yes: false,
      tty: true,
      prompt: async (summary) => {
        promptText = summary
        return true
      },
    })
    assert.equal(decision.ok, true)
    if (!decision.ok) return
    const ops = decision.args.operations as Array<{ action: string; params: Record<string, unknown> }>
    assert.equal(ops[0].params.confirm, undefined)
    assert.equal(ops[1].params.confirm, true)
    assert.equal(ops[2].params.confirm, true)
    // Summary only — no full params / PII
    assert.match(promptText, /send/)
    assert.match(promptText, /deleteMessage/)
    assert.doesNotMatch(promptText, /secret@example.com/)
    assert.doesNotMatch(promptText, /PII body/)
  })

  it('admin mixed-risk batch still injects per-op confirm under --yes', async () => {
    const decision = await applyConfirmPolicy({
      service: 'drive',
      action: 'batch',
      isBatch: true,
      yes: true,
      tty: false,
      prompt: async () => false,
      args: {
        operations: [
          { action: 'fileSetSharing', params: { fileId: 'f' } },
          { action: 'fileDelete', params: { fileId: 'f2' } },
        ],
      },
    })
    assert.equal(decision.ok, true)
    if (!decision.ok) return
    const ops = decision.args.operations as Array<{ params: Record<string, unknown> }>
    assert.equal(ops[0].params.confirm, true)
    assert.equal(ops[1].params.confirm, true)
  })

  it('does not require confirm for read/write-only tools', async () => {
    const decision = await applyConfirmPolicy({
      service: 'tasks',
      action: 'tasksCreate',
      args: { tasklistId: 'tl', title: 't' },
      isBatch: false,
      yes: false,
      tty: false,
      prompt: async () => false,
    })
    assert.equal(decision.ok, true)
    if (decision.ok) assert.equal(decision.args.confirm, undefined)
  })
})

describe('catalog path resolution smoke', () => {
  it('resolves nested @workspace-lite/shared/catalog/risk', async () => {
    const risk = await import('@workspace-lite/shared/catalog/risk')
    assert.equal(typeof risk.resolveRiskClass, 'function')
    assert.equal(risk.staticRiskClass('tasks', 'tasksDelete'), 'destructive')
  })
})
