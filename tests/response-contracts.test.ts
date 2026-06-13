import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { createProxyClient } from '../shared/src/proxy-client.js'
import { formatBytes, formatList, formatResponse, validateProxyResponse } from '../shared/src/response.js'

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }

afterEach(() => {
  globalThis.fetch = originalFetch
  process.env = { ...originalEnv }
})

function setProxyEnv() {
  process.env.GOOGLE_WORKSPACE_DRIVE_PROXY_URL = 'https://script.example/proxy'
  process.env.GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN = 'secret-token'
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), { status: 200, statusText: 'OK', ...init })
}

describe('validateProxyResponse', () => {
  it('accepts canonical success, error, and partial success envelopes', () => {
    assert.deepEqual(validateProxyResponse({ success: true, data: { ok: true }, pagination: { hasMore: false }, warnings: ['near limit'] }), {
      success: true,
      data: { ok: true },
      pagination: { hasMore: false },
      warnings: ['near limit'],
      partial: undefined,
      results: undefined,
    })
    assert.deepEqual(validateProxyResponse({ success: false, error: { code: 'INTERNAL_ERROR', message: 'failed', correlationId: 'abc' } }), {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'failed', correlationId: 'abc' },
    })
    assert.deepEqual(validateProxyResponse({ success: true, data: { failed: 1 }, partial: true, results: [{ success: false }] }), {
      success: true,
      data: { failed: 1 },
      partial: true,
      results: [{ success: false }],
      pagination: undefined,
      warnings: undefined,
    })
  })

  it('rejects malformed envelopes', () => {
    assert.throws(() => validateProxyResponse({}), /success must be a boolean/)
    assert.throws(() => validateProxyResponse({ success: true }), /must include data/)
    assert.throws(() => validateProxyResponse({ success: true, data: {}, error: { code: 'BAD', message: 'bad' } }), /cannot include error/)
    assert.throws(() => validateProxyResponse({ success: true, data: { success: false, error: { code: 'BAD', message: 'bad' } } }), /cannot wrap a failed response/)
    assert.throws(() => validateProxyResponse({ success: true, data: { results: [{ success: false }] } }), /top-level partial results/)
    assert.throws(() => validateProxyResponse({ success: true, data: {}, partial: true }), /must include results/)
    assert.throws(() => validateProxyResponse({ success: false, error: { code: '', message: 'bad' } }), /error.code/)
  })
})

describe('createProxyClient', () => {
  it('sends timeout-bound POSTs and returns validated success responses', async () => {
    setProxyEnv()
    let request: RequestInit | undefined
    globalThis.fetch = async (_input, init) => {
      request = init
      return jsonResponse({ success: true, data: { id: 'file-1' }, pagination: { hasMore: false } })
    }

    const result = await createProxyClient('drive').callProxy('fileGet', { fileId: 'file-1' })

    assert.deepEqual(result.data, { id: 'file-1' })
    assert.equal(request?.method, 'POST')
    assert.ok(request?.signal instanceof AbortSignal)
    assert.equal(JSON.parse(String(request?.body)).token, 'secret-token')
  })

  it('uses class-scoped proxy tokens when configured', async () => {
    setProxyEnv()
    process.env.GOOGLE_WORKSPACE_DRIVE_PROXY_READ_TOKEN = 'read-token'
    process.env.GOOGLE_WORKSPACE_DRIVE_PROXY_WRITE_TOKEN = 'write-token'
    process.env.GOOGLE_WORKSPACE_DRIVE_PROXY_SHARE_TOKEN = 'share-token'
    process.env.GOOGLE_WORKSPACE_DRIVE_PROXY_DESTRUCTIVE_TOKEN = 'destructive-token'
    process.env.GOOGLE_WORKSPACE_DRIVE_PROXY_ADMIN_TOKEN = 'admin-token'
    const tokens: string[] = []
    globalThis.fetch = async (_input, init) => {
      tokens.push(JSON.parse(String(init?.body)).token)
      return jsonResponse({ success: true, data: { ok: true } })
    }

    const client = createProxyClient('drive')
    await client.callProxy('about')
    await client.callProxy('fileCreate', { name: 'note.txt', content: 'hello' })
    await client.callProxy('fileSetSharing', { fileId: 'file-1', access: 'PRIVATE', permission: 'VIEW', confirm: true })
    await client.callProxy('fileTrash', { fileId: 'file-1', confirm: true })
    await client.callProxy('batch', { operations: [{ action: 'fileSetSharing' }, { action: 'fileTrash' }] })

    assert.deepEqual(tokens, ['read-token', 'write-token', 'share-token', 'destructive-token', 'admin-token'])
  })

  it('rejects HTTP errors, non-JSON bodies, malformed envelopes, and proxy errors', async () => {
    setProxyEnv()
    globalThis.fetch = async () => new Response('unavailable', { status: 503, statusText: 'Service Unavailable' })
    await assert.rejects(() => createProxyClient('drive').callProxy('about'), /Proxy returned 503 Service Unavailable/)

    globalThis.fetch = async () => new Response('not-json', { status: 200 })
    await assert.rejects(() => createProxyClient('drive').callProxy('about'), /expected JSON/)

    globalThis.fetch = async () => jsonResponse({ success: true })
    await assert.rejects(() => createProxyClient('drive').callProxy('about'), /must include data/)

    globalThis.fetch = async () => jsonResponse({ success: false, error: { code: 'INTERNAL_ERROR', message: 'failed', correlationId: 'abc' } })
    await assert.rejects(() => createProxyClient('drive').callProxy('about'), /\[INTERNAL_ERROR\] failed \(correlationId: abc\)/)
  })
})

describe('formatters', () => {
  it('handles unknown sizes and pagination metadata', () => {
    assert.equal(formatBytes(undefined), 'unknown size')
    const output = formatList(
      { success: true, data: [{ name: 'Untitled', size: undefined }], pagination: { hasMore: true, nextPageToken: '2' } },
      { itemsKey: 'items', noun: 'file', itemSummary: (item) => `${(item as { name: string }).name} ${formatBytes((item as { size?: number }).size)}` },
    )

    assert.match(output.content[0].text, /Untitled unknown size/)
    assert.match(output.content[0].text, /Next page token: 2/)
  })

  it('truncates large output and renders partial batch results', () => {
    const large = formatResponse({ success: true, data: { text: 'x'.repeat(30000) } })
    assert.match(large.content[0].text, /Output truncated at 24000 characters/)

    const circular: Record<string, unknown> = {}
    circular.self = circular
    assert.equal(formatResponse({ success: true, data: circular }).content[0].text, '[Unserializable response data]')

    const partial = formatResponse({ success: true, data: { failed: 1 }, partial: true, results: [{ success: false, error: { code: 'BAD_REQUEST', message: 'bad' } }] })
    assert.match(partial.content[0].text, /"results"/)
    assert.match(partial.content[0].text, /"success": false/)
  })
})
