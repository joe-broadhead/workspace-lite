import type { ProxyResponse } from './response.js'

export class TestProxyClient {
  private actions: Map<string, ProxyResponse[]> = new Map()
  private callLog: { action: string; params: Record<string, unknown> | undefined }[] = []

  addResponse(action: string, response: ProxyResponse) {
    if (!this.actions.has(action)) this.actions.set(action, [])
    this.actions.get(action)!.push(response)
  }

  getCallLog() { return [...this.callLog] }
  getCallsFor(action: string) { return this.callLog.filter(c => c.action === action) }

  async callProxy(action: string, params?: Record<string, unknown>): Promise<ProxyResponse> {
    this.callLog.push({ action, params })
    const queue = this.actions.get(action)
    if (!queue || queue.length === 0) {
      return { success: false, error: { code: 'NOT_FOUND', message: `No response queued for action: ${action}` } }
    }
    const response = queue.shift()!
    return { ...response }
  }
}
