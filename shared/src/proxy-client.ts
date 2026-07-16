import { validateProxyResponse, type ProxyResponse } from './response.js'
import { resolveRiskClass, type TokenClass } from './catalog/risk.js'

export interface ProxyClient {
  callProxy(action: string, params?: Record<string, unknown>): Promise<ProxyResponse>
}

/** Diagnostics for token selection — env **names** only, never token values (PR16). */
export type TokenSelectedInfo = {
  service: string
  action: string
  tokenClass: TokenClass
  envName: string
  candidateEnvNames: string[]
}

export type CreateProxyClientOptions = {
  onTokenSelected?: (info: TokenSelectedInfo) => void
}

function selectProxyToken(envPrefix: string, tokenClass: TokenClass) {
  const primaryEnvName = `${envPrefix}_PROXY_TOKEN`
  const adminEnvName = `${envPrefix}_PROXY_ADMIN_TOKEN`
  const classEnvName = `${envPrefix}_PROXY_${tokenClass.toUpperCase()}_TOKEN`
  const candidateEnvNames = tokenClass === 'admin'
    ? [adminEnvName, primaryEnvName]
    : tokenClass === 'read'
      ? [classEnvName, primaryEnvName, adminEnvName]
      : [classEnvName, adminEnvName, primaryEnvName]

  for (const envName of candidateEnvNames) {
    const token = process.env[envName]
    if (token) return { token, envName, candidateEnvNames }
  }

  return { token: '', envName: '', candidateEnvNames }
}

export function createProxyClient(service: string, options: CreateProxyClientOptions = {}): ProxyClient {
  const envPrefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
  const proxyUrl = process.env[`${envPrefix}_PROXY_URL`] ?? ''

  return {
    async callProxy(action, params) {
      if (!proxyUrl) throw new Error(`${envPrefix}_PROXY_URL not set`)
      const tokenClass = resolveRiskClass(service, action, params)
      const proxyToken = selectProxyToken(envPrefix, tokenClass)
      if (!proxyToken.token) throw new Error(`${proxyToken.candidateEnvNames.join(', ')} not set`)
      options.onTokenSelected?.({
        service,
        action,
        tokenClass,
        envName: proxyToken.envName,
        candidateEnvNames: proxyToken.candidateEnvNames,
      })
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: proxyToken.token, action, params }),
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
      return data
    },
  }
}
