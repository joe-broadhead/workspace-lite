import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ProxyResponse } from '@workspace-lite/shared/response'
import { PROBE_ACTIONS, probeService, type FetchLike } from '../../packages/cli/src/doctor.js'

function healthFetch(payload: unknown, status = 200): FetchLike {
  return async () => ({ ok: status < 400, status, text: async () => JSON.stringify(payload) })
}

function healthyPayload(service: string) {
  return { success: true, data: { status: 'healthy', version: '1.0.0', service: `google-workspace-proxy-${service}` } }
}

function clientReturning(response: ProxyResponse) {
  return () => ({ async callProxy() { return response } })
}

describe('doctor --live probes', () => {
  it('defines a probe action for every service', () => {
    assert.deepEqual(
      Object.keys(PROBE_ACTIONS).sort(),
      ['calendar', 'docs', 'drive', 'forms', 'gmail', 'sheets', 'slides', 'tasks'],
    )
  })

  it('reports ready when health is healthy and the probe read succeeds', async () => {
    const result = await probeService('drive', 'https://proxy.example/exec',
      clientReturning({ success: true, data: {} }), healthFetch(healthyPayload('drive')))
    assert.equal(result.health, 'healthy')
    assert.equal(result.auth, 'ok')
    assert.equal(result.ready, true)
    assert.equal(result.advice, undefined)
  })

  it('treats BAD_REQUEST as auth-ok only for empty-params probe services', async () => {
    const badRequest: ProxyResponse = { success: false, error: { code: 'BAD_REQUEST', message: 'Missing required parameter: spreadsheetId' } }
    const sheets = await probeService('sheets', 'https://proxy.example/exec',
      clientReturning(badRequest), healthFetch(healthyPayload('sheets')))
    assert.equal(sheets.auth, 'ok')
    assert.equal(sheets.ready, true)

    const drive = await probeService('drive', 'https://proxy.example/exec',
      clientReturning(badRequest), healthFetch(healthyPayload('drive')))
    assert.equal(drive.auth, 'error')
    assert.equal(drive.ready, false)
  })

  it('maps UNAUTHORIZED and RATE_LIMITED with actionable advice', async () => {
    const unauthorized = await probeService('gmail', 'https://proxy.example/exec',
      clientReturning({ success: false, error: { code: 'UNAUTHORIZED', message: 'bad token' } }),
      healthFetch(healthyPayload('gmail')))
    assert.equal(unauthorized.auth, 'unauthorized')
    assert.match(unauthorized.advice ?? '', /GOOGLE_WORKSPACE_GMAIL_PROXY_TOKEN/)

    const limited = await probeService('gmail', 'https://proxy.example/exec',
      clientReturning({ success: false, error: { code: 'RATE_LIMITED', message: 'slow down' } }),
      healthFetch(healthyPayload('gmail')))
    assert.equal(limited.auth, 'rate-limited')
    assert.equal(limited.ready, false)
  })

  it('detects a URL wired to the wrong service proxy', async () => {
    const result = await probeService('drive', 'https://proxy.example/exec',
      clientReturning({ success: true, data: {} }), healthFetch(healthyPayload('gmail')))
    assert.equal(result.health, 'service-mismatch')
    assert.equal(result.proxyReportsService, 'google-workspace-proxy-gmail')
    assert.equal(result.ready, false)
    assert.match(result.advice ?? '', /GOOGLE_WORKSPACE_DRIVE_PROXY_URL/)
  })

  it('reports unreachable / non-JSON URLs without calling the auth probe', async () => {
    let authCalls = 0
    const countingClient = () => ({ async callProxy(): Promise<ProxyResponse> { authCalls++; return { success: true, data: {} } } })

    const down = await probeService('tasks', 'https://proxy.example/exec', countingClient, healthFetch({}, 500))
    assert.equal(down.health, 'unreachable')
    assert.equal(down.auth, 'skipped')

    const html: FetchLike = async () => ({ ok: true, status: 200, text: async () => '<html>login</html>' })
    const notJson = await probeService('tasks', 'https://proxy.example/exec', countingClient, html)
    assert.equal(notJson.health, 'invalid-response')
    assert.match(notJson.advice ?? '', /versioned \/exec deployment/)
    assert.equal(authCalls, 0)
  })

  it('retries the health probe once after a timeout (Apps Script cold start)', async () => {
    let calls = 0
    const coldStart: FetchLike = async () => {
      calls++
      if (calls === 1) {
        const err = new Error('timeout')
        err.name = 'TimeoutError'
        throw err
      }
      return { ok: true, status: 200, text: async () => JSON.stringify(healthyPayload('tasks')) }
    }
    const result = await probeService('tasks', 'https://proxy.example/exec',
      clientReturning({ success: true, data: {} }), coldStart)
    assert.equal(result.health, 'healthy')
    assert.equal(calls, 2)

    const alwaysTimeout: FetchLike = async () => {
      const err = new Error('timeout')
      err.name = 'TimeoutError'
      throw err
    }
    const down = await probeService('tasks', 'https://proxy.example/exec',
      clientReturning({ success: true, data: {} }), alwaysTimeout)
    assert.equal(down.health, 'unreachable')
    assert.match(down.healthNote ?? '', /retry/)
  })

  it('reports client config errors as skipped with env names only', async () => {
    const throwing = () => ({ async callProxy(): Promise<ProxyResponse> { throw new Error('GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN not set') } })
    const result = await probeService('tasks', 'https://proxy.example/exec', throwing, healthFetch(healthyPayload('tasks')))
    assert.equal(result.auth, 'skipped')
    assert.match(result.authNote ?? '', /PROXY_TOKEN not set/)
    assert.equal(result.ready, false)
  })

  it('correlationIds surface for unexpected proxy errors', async () => {
    const result = await probeService('gmail', 'https://proxy.example/exec',
      clientReturning({ success: false, error: { code: 'INTERNAL_ERROR', message: 'boom', correlationId: 'abc-123' } }),
      healthFetch(healthyPayload('gmail')))
    assert.equal(result.auth, 'error')
    assert.match(result.authNote ?? '', /INTERNAL_ERROR corr=abc-123/)
  })
})
