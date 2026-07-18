import type { ProxyClient } from '@workspace-lite/shared/proxy-client'

/**
 * Live doctor probes (JOE-141).
 *
 * Two probes per configured service, both cheap and redaction-safe:
 *
 * 1. Health: unauthenticated GET on the proxy URL. Every proxy's doGet returns
 *    `{status:'healthy', version, service:'google-workspace-proxy-<svc>'}`,
 *    which also lets us detect a URL wired to the wrong service.
 * 2. Auth: one authenticated read through the normal client path. Four
 *    services have zero-argument reads; for the rest we call a read action
 *    with empty params — the proxy validates auth before params, so a
 *    BAD_REQUEST response proves the token was accepted.
 *
 * Output rules: env var names and error codes/correlationIds only. Never
 * token values, and never full proxy URLs or deployment IDs.
 */

export interface ProbeSpec {
  action: string
  params: Record<string, unknown>
  /** BAD_REQUEST proves auth for services without zero-arg reads. */
  badRequestMeansAuthOk: boolean
}

export const PROBE_ACTIONS: Record<string, ProbeSpec> = {
  drive: { action: 'about', params: {}, badRequestMeansAuthOk: false },
  gmail: { action: 'profile', params: {}, badRequestMeansAuthOk: false },
  calendar: { action: 'getColors', params: {}, badRequestMeansAuthOk: false },
  tasks: { action: 'tasklistsList', params: { maxResults: 1 }, badRequestMeansAuthOk: false },
  sheets: { action: 'spreadsheetGet', params: {}, badRequestMeansAuthOk: true },
  slides: { action: 'presentationGet', params: {}, badRequestMeansAuthOk: true },
  docs: { action: 'documentGet', params: {}, badRequestMeansAuthOk: true },
  forms: { action: 'formGet', params: {}, badRequestMeansAuthOk: true },
}

export type HealthStatus = 'healthy' | 'service-mismatch' | 'invalid-response' | 'unreachable'
export type AuthStatus = 'ok' | 'unauthorized' | 'rate-limited' | 'error' | 'skipped'

export interface LiveProbeResult {
  health: HealthStatus
  healthNote?: string
  proxyReportsService?: string
  auth: AuthStatus
  authNote?: string
  ready: boolean
  advice?: string
}

export type FetchLike = (url: string, init: { method: string; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>

async function probeHealth(service: string, url: string, fetchImpl: FetchLike): Promise<Pick<LiveProbeResult, 'health' | 'healthNote' | 'proxyReportsService'>> {
  let text: string
  try {
    const res = await fetchImpl(url, { method: 'GET', signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return { health: 'unreachable', healthNote: `HTTP ${res.status}` }
    text = await res.text()
  } catch (error) {
    const name = error instanceof Error ? error.name : 'Error'
    return { health: 'unreachable', healthNote: name === 'TimeoutError' ? 'timeout after 15s' : 'network error' }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { health: 'invalid-response', healthNote: 'non-JSON response (URL may not be an Apps Script /exec deployment)' }
  }
  const data = (parsed as { data?: { status?: string; service?: string } })?.data
  if (data?.status !== 'healthy') return { health: 'invalid-response', healthNote: 'unexpected health payload' }
  const expected = `google-workspace-proxy-${service}`
  if (data.service && data.service !== expected) {
    return { health: 'service-mismatch', proxyReportsService: data.service, healthNote: `URL answers as ${data.service}` }
  }
  return { health: 'healthy' }
}

async function probeAuth(service: string, client: ProxyClient): Promise<Pick<LiveProbeResult, 'auth' | 'authNote'>> {
  const spec = PROBE_ACTIONS[service]
  if (!spec) return { auth: 'skipped', authNote: 'no probe action defined' }
  let response
  try {
    response = await client.callProxy(spec.action, spec.params)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'probe failed'
    // Config errors from the client name env vars only; network errors carry no secrets.
    return { auth: 'skipped', authNote: message }
  }
  if (response.success) return { auth: 'ok' }
  const code = response.error?.code ?? 'ERROR'
  const correlation = response.error?.correlationId ? ` corr=${response.error.correlationId}` : ''
  if (code === 'UNAUTHORIZED') return { auth: 'unauthorized', authNote: 'proxy rejected the token' }
  if (code === 'RATE_LIMITED') return { auth: 'rate-limited', authNote: 'per-minute budget exhausted; retry in 60s' }
  if (code === 'BAD_REQUEST' && spec.badRequestMeansAuthOk) {
    return { auth: 'ok', authNote: 'verified via param check (auth precedes validation)' }
  }
  return { auth: 'error', authNote: `${code}${correlation}` }
}

function adviceFor(result: Pick<LiveProbeResult, 'health' | 'auth'>, service: string): string | undefined {
  const prefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
  if (result.health === 'unreachable') return `check ${prefix}_PROXY_URL and redeploy via skills/workspace-lite-installer/scripts/deploy-single.sh`
  if (result.health === 'invalid-response') return `verify ${prefix}_PROXY_URL points at the versioned /exec deployment (not /dev)`
  if (result.health === 'service-mismatch') return `fix ${prefix}_PROXY_URL — it is wired to a different service's proxy`
  if (result.auth === 'unauthorized') return `rotate the token for ${prefix}_PROXY_TOKEN via scripts/setup.sh token recovery`
  if (result.auth === 'rate-limited') return 'wait 60 seconds and re-run doctor --live'
  if (result.auth === 'skipped') return 'set the missing env vars named above, then re-run'
  if (result.auth === 'error') return 'inspect Apps Script logs (clasp logs) with the correlationId above'
  return undefined
}

export async function probeService(
  service: string,
  url: string,
  clientFactory: (service: string) => ProxyClient,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<LiveProbeResult> {
  const health = await probeHealth(service, url, fetchImpl)
  const auth = health.health === 'healthy' || health.health === 'service-mismatch'
    ? await probeAuth(service, clientFactory(service))
    : { auth: 'skipped' as const, authNote: 'health probe failed' }
  const combined = { ...health, ...auth }
  const ready = combined.health === 'healthy' && combined.auth === 'ok'
  return { ...combined, ready, advice: ready ? undefined : adviceFor(combined, service) }
}
