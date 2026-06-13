import { validateProxyResponse, type ProxyResponse } from './response.js'

export interface ProxyClient {
  callProxy(action: string, params?: Record<string, unknown>): Promise<ProxyResponse>
}

export function createProxyClient(service: string): ProxyClient {
  const envPrefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
  const proxyUrl = process.env[`${envPrefix}_PROXY_URL`] ?? ''
  const proxyToken = process.env[`${envPrefix}_PROXY_TOKEN`] ?? ''

  return {
    async callProxy(action, params) {
      if (!proxyUrl) throw new Error(`${envPrefix}_PROXY_URL not set`)
      if (!proxyToken) throw new Error(`${envPrefix}_PROXY_TOKEN not set`)
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: proxyToken, action, params }),
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) throw new Error(`Proxy returned ${res.status} ${res.statusText}`)
      const body = await res.text()
      let json: unknown
      try {
        json = JSON.parse(body)
      } catch {
        throw new Error('Proxy returned malformed response: expected JSON')
      }
      const data = validateProxyResponse(json)
      if (!data.success) {
        const error = data.error
        if (!error) throw new Error('Proxy returned malformed response: error must be an object')
        const correlation = error.correlationId ? ` (correlationId: ${error.correlationId})` : ''
        throw new Error(`[${error.code}] ${error.message}${correlation}`)
      }
      return data
    },
  }
}
