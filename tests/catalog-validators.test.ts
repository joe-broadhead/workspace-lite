import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { z } from 'zod'
import type { ToolSpec } from '@workspace-lite/shared/catalog'
import { docsTools } from '@workspace-lite/shared/catalog/services/docs'
import { driveTools } from '@workspace-lite/shared/catalog/services/drive'
import { gmailTools } from '@workspace-lite/shared/catalog/services/gmail'

function findTool(tools: ToolSpec[], name: string): ToolSpec {
  const tool = tools.find((candidate) => candidate.name === name)
  assert.ok(tool, `missing tool ${name}`)
  return tool
}

describe('gmail_create_filter validate', () => {
  const tool = findTool(gmailTools, 'gmail_create_filter')

  it('rejects a filter without any action field', () => {
    assert.throws(() => tool.validate?.({ from: 'someone@example.com' }), /At least one filter action/)
  })

  it('rejects a filter without any criterion field', () => {
    assert.throws(() => tool.validate?.({ addLabels: 'Receipts' }), /At least one filter criterion/)
  })

  it('accepts a filter with a criterion and an action', () => {
    tool.validate?.({ from: 'someone@example.com', addLabels: 'Receipts' })
  })
})

describe('docs_update_page_setup validate', () => {
  const tool = findTool(docsTools, 'docs_update_page_setup')

  it('rejects an update with no page setup fields', () => {
    assert.throws(() => tool.validate?.({ documentId: 'doc-id' }), /at least one page setup field/)
  })

  it('accepts an update with a single margin field', () => {
    tool.validate?.({ documentId: 'doc-id', marginTop: 72 })
  })
})

describe('drive_update_revision schema', () => {
  const tool = findTool(driveTools, 'drive_update_revision')

  it('requires keepForever', () => {
    const parsed = z.object(tool.schema).safeParse({ fileId: 'file-id', revisionId: '1' })
    assert.equal(parsed.success, false)
  })

  it('accepts keepForever boolean', () => {
    const parsed = z.object(tool.schema).safeParse({ fileId: 'file-id', revisionId: '1', keepForever: true })
    assert.equal(parsed.success, true)
  })
})
