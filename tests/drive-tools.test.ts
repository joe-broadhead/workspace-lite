import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { TestProxyClient } from '../shared/src/test-proxy-client.js'

describe('drive_about', () => {
  it('calls about action and returns storage info', async () => {
    const client = new TestProxyClient()
    client.addResponse('about', { success: true, data: { storageUsed: 100, storageLimit: 1000, rootFolderId: 'root' } })

    const result = await client.callProxy('about')

    assert.equal(result.success, true)
    assert.equal(client.getCallLog()[0].action, 'about')
    assert.equal(client.getCallLog()[0].params, undefined)
    assert.equal((result.data as Record<string, unknown>).storageUsed, 100)
    assert.equal((result.data as Record<string, unknown>).storageLimit, 1000)
    assert.equal((result.data as Record<string, unknown>).rootFolderId, 'root')
  })
})

describe('drive_get_file', () => {
  it('calls fileGet action with fileId param', async () => {
    const client = new TestProxyClient()
    client.addResponse('fileGet', {
      success: true,
      data: { id: 'abc123', name: 'report.pdf', mimeType: 'application/pdf', size: 2048 }
    })

    const result = await client.callProxy('fileGet', { fileId: 'abc123' })

    assert.equal(result.success, true)
    assert.equal(client.getCallLog()[0].action, 'fileGet')
    assert.deepEqual(client.getCallLog()[0].params, { fileId: 'abc123' })
    const data = result.data as Record<string, unknown>
    assert.equal(data.id, 'abc123')
    assert.equal(data.name, 'report.pdf')
    assert.equal(data.mimeType, 'application/pdf')
  })
})

describe('drive_list_files', () => {
  it('calls fileList action with folderId param', async () => {
    const client = new TestProxyClient()
    client.addResponse('fileList', {
      success: true,
      data: [
        { id: 'f1', name: 'doc.txt', mimeType: 'text/plain' },
        { id: 'f2', name: 'sheet.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      ],
      pagination: { hasMore: false }
    })

    const result = await client.callProxy('fileList', { folderId: 'folderX' })

    assert.equal(result.success, true)
    assert.equal(client.getCallLog()[0].action, 'fileList')
    assert.deepEqual(client.getCallLog()[0].params, { folderId: 'folderX' })
    const items = result.data as unknown[]
    assert.equal(items.length, 2)
    assert.equal(result.pagination?.hasMore, false)
  })

  it('returns empty list when no files', async () => {
    const client = new TestProxyClient()
    client.addResponse('fileList', { success: true, data: [] })

    const result = await client.callProxy('fileList', { folderId: 'empty' })

    assert.equal(result.success, true)
    assert.deepEqual(result.data, [])
  })
})

describe('drive_batch', () => {
  it('dispatches batch operations and receives sequential results', async () => {
    const client = new TestProxyClient()
    client.addResponse('batch', {
      success: true,
      data: [
        { action: 'about', success: true, data: { storageUsed: 500 } },
        { action: 'fileGet', success: true, data: { id: 'x', name: 'readme.md' } }
      ]
    })

    const result = await client.callProxy('batch', {
      operations: [
        { action: 'about', params: {} },
        { action: 'fileGet', params: { fileId: 'x' } }
      ]
    })

    assert.equal(result.success, true)
    const log = client.getCallLog()
    assert.equal(log.length, 1)
    assert.equal(log[0].action, 'batch')
    assert.ok(log[0].params && 'operations' in log[0].params)
    const results = result.data as Record<string, unknown>[]
    assert.equal(results.length, 2)
    assert.equal(results[0].action, 'about')
    assert.equal(results[1].action, 'fileGet')
  })
})

describe('error handling', () => {
  it('returns error when no response queued', async () => {
    const client = new TestProxyClient()
    const result = await client.callProxy('fileGet', { fileId: 'missing' })

    assert.equal(result.success, false)
    assert.equal(result.error?.code, 'NOT_FOUND')
  })

  it('returns queued error response', async () => {
    const client = new TestProxyClient()
    client.addResponse('fileDelete', { success: false, error: { code: 'PERMISSION_DENIED', message: 'Cannot delete root folder' } })

    const result = await client.callProxy('fileDelete', { fileId: 'root' })

    assert.equal(result.success, false)
    assert.equal(result.error?.code, 'PERMISSION_DENIED')
    assert.equal(result.error?.message, 'Cannot delete root folder')
  })
})
