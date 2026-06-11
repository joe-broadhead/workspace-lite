export interface ProxyResponse {
  success: boolean
  data?: unknown
  error?: { code: string; message: string }
  pagination?: { nextPageToken?: string; hasMore?: boolean }
}

export function formatResponse(result: ProxyResponse, opts?: { summary?: string; hint?: string }) {
  const text = JSON.stringify(result.data, null, 2)
  const summary = opts?.summary ? `${opts.summary}\n\n` : ''
  const hint = opts?.hint ? `\n\n${opts.hint}` : ''
  return { content: [{ type: 'text' as const, text: summary + text + hint }] }
}

export function formatList(
  result: ProxyResponse,
  opts: { itemsKey: string; noun: string; itemSummary: (item: unknown) => string; hint?: string }
) {
  const items = Array.isArray(result.data) ? result.data : ((result.data as Record<string, unknown[]>)?.[opts.itemsKey] || [])
  const lines = items.map(opts.itemSummary)
  const pagination = result.pagination
  let text = `Found ${items.length} ${opts.noun}${items.length !== 1 ? 's' : ''}${pagination?.hasMore ? ' (more available)' : ''}\n\n${lines.join('\n')}`
  if (opts.hint) text += `\n\n${opts.hint}`
  return { content: [{ type: 'text' as const, text }] }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatPermissions(data: Record<string, unknown>): string {
  return [
    `Owner: ${data.owner || 'unknown'}`,
    `Sharing: ${data.sharingAccess} / ${data.sharingPermission}`,
    `Editors: ${(data.editors as string[] || []).join(', ') || 'none'}`,
    `Viewers: ${(data.viewers as string[] || []).join(', ') || 'none'}`,
  ].join('\n')
}
