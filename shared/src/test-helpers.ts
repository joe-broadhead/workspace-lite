import type { ProxyResponse } from './response.js'
import { TestProxyClient } from './test-proxy-client.js'

export function okResponse(data: unknown): ProxyResponse {
  return { success: true, data }
}

export function errResponse(code: string, message: string): ProxyResponse {
  return { success: false, error: { code, message } }
}

export function listResponse(items: unknown[]): ProxyResponse {
  return { success: true, data: items }
}

export { TestProxyClient }
