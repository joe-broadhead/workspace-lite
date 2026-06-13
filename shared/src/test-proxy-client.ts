import type { ProxyResponse } from './response.js'

export class TestProxyClient {
  private actions: Map<string, ProxyResponse[]> = new Map()
  private cursors: Map<string, number> = new Map()
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
    const index = this.cursors.get(action) ?? 0
    this.cursors.set(action, index + 1)
    if (!queue || index >= queue.length) {
      return { success: false, error: { code: 'NOT_FOUND', message: `No response queued for action: ${action}` } }
    }
    const response = queue[index]
    return { ...response }
  }
}
