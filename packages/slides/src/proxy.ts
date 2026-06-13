import type { ProxyResponse } from '@workspace-lite/shared'

const PROXY_URL = process.env.GOOGLE_WORKSPACE_SLIDES_PROXY_URL ?? ''
const PROXY_TOKEN = process.env.GOOGLE_WORKSPACE_SLIDES_PROXY_TOKEN ?? ''

if (!PROXY_URL) throw new Error('GOOGLE_WORKSPACE_SLIDES_PROXY_URL not set')
if (!PROXY_TOKEN) throw new Error('GOOGLE_WORKSPACE_SLIDES_PROXY_TOKEN not set')

export type { ProxyResponse }

export async function callProxy(action: string, params?: Record<string, unknown>): Promise<ProxyResponse> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: PROXY_TOKEN, action, params }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) throw new Error(`Proxy returned ${res.status} ${res.statusText}`)

  const data = (await res.json()) as ProxyResponse

  if (!data.success) {
    throw new Error(`[${data.error?.code}] ${data.error?.message}`)
  }

  return data
}
