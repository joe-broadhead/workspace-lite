import type { ProxyResponse } from './response.js'

export interface ProxyClient {
  callProxy(action: string, params?: Record<string, unknown>): Promise<ProxyResponse>
}

export function createProxyClient(service: string): ProxyClient {
  const envPrefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
  const proxyUrl = process.env[`${envPrefix}_PROXY_URL`] ?? ''
  const proxyToken = process.env[`${envPrefix}_PROXY_TOKEN`] ?? ''

  if (!proxyUrl) throw new Error(`${envPrefix}_PROXY_URL not set`)
  if (!proxyToken) throw new Error(`${envPrefix}_PROXY_TOKEN not set`)

  return {
    async callProxy(action, params) {
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: proxyToken, action, params }),
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) throw new Error(`Proxy returned ${res.status} ${res.statusText}`)
      const data = (await res.json()) as ProxyResponse
      if (!data.success) throw new Error(`[${data.error?.code}] ${data.error?.message}`)
      return data
    },
  }
}
