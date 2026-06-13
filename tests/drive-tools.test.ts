import { describe, it, expect } from 'bun:test'
import { TestProxyClient } from '../shared/src/test-proxy-client.js'

describe('drive_about', () => {
  it('calls about action and returns storage info', async () => {
    const client = new TestProxyClient()
    client.addResponse('about', { success: true, data: { storageUsed: 100, storageLimit: 1000, rootFolderId: 'root' } })

    const result = await client.callProxy('about')

    expect(result.success).toBe(true)
    expect(client.getCallLog()[0].action).toBe('about')
    expect(client.getCallLog()[0].params).toBeUndefined()
    expect((result.data as Record<string, unknown>).storageUsed).toBe(100)
    expect((result.data as Record<string, unknown>).storageLimit).toBe(1000)
    expect((result.data as Record<string, unknown>).rootFolderId).toBe('root')
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

    expect(result.success).toBe(true)
    expect(client.getCallLog()[0].action).toBe('fileGet')
    expect(client.getCallLog()[0].params).toEqual({ fileId: 'abc123' })
    const data = result.data as Record<string, unknown>
    expect(data.id).toBe('abc123')
    expect(data.name).toBe('report.pdf')
    expect(data.mimeType).toBe('application/pdf')
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

    expect(result.success).toBe(true)
    expect(client.getCallLog()[0].action).toBe('fileList')
    expect(client.getCallLog()[0].params).toEqual({ folderId: 'folderX' })
    const items = result.data as unknown[]
    expect(items).toHaveLength(2)
    expect(result.pagination?.hasMore).toBe(false)
  })

  it('returns empty list when no files', async () => {
    const client = new TestProxyClient()
    client.addResponse('fileList', { success: true, data: [] })

    const result = await client.callProxy('fileList', { folderId: 'empty' })

    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
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

    expect(result.success).toBe(true)
    const log = client.getCallLog()
    expect(log).toHaveLength(1)
    expect(log[0].action).toBe('batch')
    expect(log[0].params).toHaveProperty('operations')
    const results = result.data as Record<string, unknown>[]
    expect(results).toHaveLength(2)
    expect(results[0].action).toBe('about')
    expect(results[1].action).toBe('fileGet')
  })
})

describe('error handling', () => {
  it('returns error when no response queued', async () => {
    const client = new TestProxyClient()
    const result = await client.callProxy('fileGet', { fileId: 'missing' })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('NOT_FOUND')
  })

  it('returns queued error response', async () => {
    const client = new TestProxyClient()
    client.addResponse('fileDelete', { success: false, error: { code: 'PERMISSION_DENIED', message: 'Cannot delete root folder' } })

    const result = await client.callProxy('fileDelete', { fileId: 'root' })

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe('PERMISSION_DENIED')
    expect(result.error?.message).toBe('Cannot delete root folder')
  })
})
