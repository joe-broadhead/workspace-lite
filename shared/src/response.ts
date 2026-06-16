export interface ProxyResponse {
  success: boolean
  data?: unknown
  error?: { code: string; message: string; correlationId?: string }
  pagination?: { nextPageToken?: string; hasMore?: boolean }
  warnings?: string[]
  partial?: true
  results?: unknown[]
}

const MAX_TOOL_OUTPUT_CHARS = 24000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function validatePagination(value: unknown) {
  if (value === undefined) return undefined
  if (!isRecord(value)) throw new Error('Proxy returned malformed response: pagination must be an object')
  const pagination: NonNullable<ProxyResponse['pagination']> = {}
  if (value.nextPageToken !== undefined) {
    if (typeof value.nextPageToken !== 'string') {
      throw new Error('Proxy returned malformed response: pagination.nextPageToken must be a string')
    }
    pagination.nextPageToken = value.nextPageToken
  }
  if (value.hasMore !== undefined) {
    if (typeof value.hasMore !== 'boolean') {
      throw new Error('Proxy returned malformed response: pagination.hasMore must be a boolean')
    }
    pagination.hasMore = value.hasMore
  }
  return pagination
}

function validateWarnings(value: unknown) {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((warning) => typeof warning !== 'string')) {
    throw new Error('Proxy returned malformed response: warnings must be an array of strings')
  }
  return value
}

export function validateProxyResponse(value: unknown): ProxyResponse {
  if (!isRecord(value)) throw new Error('Proxy returned malformed response: expected an object')
  if (typeof value.success !== 'boolean') {
    throw new Error('Proxy returned malformed response: success must be a boolean')
  }

  if (value.success) {
    if (hasOwn(value, 'error')) throw new Error('Proxy returned malformed response: successful response cannot include error')
    if (!hasOwn(value, 'data')) throw new Error('Proxy returned malformed response: successful response must include data')
    if (isRecord(value.data) && value.data.success === false) {
      throw new Error('Proxy returned malformed response: successful response cannot wrap a failed response in data')
    }
    if (isRecord(value.data) && Array.isArray(value.data.results)) {
      const failedNestedResult = value.data.results.some((item) => isRecord(item) && item.success === false)
      if (failedNestedResult) {
        throw new Error('Proxy returned malformed response: partial failures must use top-level partial results')
      }
    }
    if (value.partial !== undefined && value.partial !== true) {
      throw new Error('Proxy returned malformed response: partial must be true when present')
    }
    if (value.results !== undefined && !Array.isArray(value.results)) {
      throw new Error('Proxy returned malformed response: results must be an array')
    }
    if (value.partial === true && !Array.isArray(value.results)) {
      throw new Error('Proxy returned malformed response: partial response must include results')
    }
    return {
      success: true,
      data: value.data,
      pagination: validatePagination(value.pagination),
      warnings: validateWarnings(value.warnings),
      partial: value.partial,
      results: value.results,
    }
  }

  if (!isRecord(value.error)) throw new Error('Proxy returned malformed response: error must be an object')
  if (typeof value.error.code !== 'string' || !value.error.code.trim()) {
    throw new Error('Proxy returned malformed response: error.code must be a non-empty string')
  }
  if (typeof value.error.message !== 'string' || !value.error.message.trim()) {
    throw new Error('Proxy returned malformed response: error.message must be a non-empty string')
  }
  if (value.error.correlationId !== undefined && typeof value.error.correlationId !== 'string') {
    throw new Error('Proxy returned malformed response: error.correlationId must be a string')
  }
  return {
    success: false,
    error: {
      code: value.error.code,
      message: value.error.message,
      correlationId: value.error.correlationId,
    },
  }
}

function truncateText(text: string) {
  if (text.length <= MAX_TOOL_OUTPUT_CHARS) return text
  return `${text.slice(0, MAX_TOOL_OUTPUT_CHARS)}\n\n[Output truncated at ${MAX_TOOL_OUTPUT_CHARS} characters. Narrow the request or use pagination for more.]`
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2) ?? 'null'
  } catch {
    return '[Unserializable response data]'
  }
}

function metadataLines(result: ProxyResponse) {
  const lines: string[] = []
  if (result.pagination?.hasMore) {
    lines.push('More results are available.')
    if (result.pagination.nextPageToken) lines.push(`Next page token: ${result.pagination.nextPageToken}`)
  }
  if (result.warnings?.length) lines.push(...result.warnings.map((warning) => `Warning: ${warning}`))
  return lines
}

export function formatResponse(result: ProxyResponse, opts?: { summary?: string; hint?: string }) {
  if (!result.success) {
    const correlation = result.error?.correlationId ? ` (correlationId: ${result.error.correlationId})` : ''
    return { content: [{ type: 'text' as const, text: `[${result.error?.code ?? 'ERROR'}] ${result.error?.message ?? 'Request failed'}${correlation}` }] }
  }
  const metadata = metadataLines(result)
  const payload = result.partial && result.results
    ? { ...(isRecord(result.data) ? result.data : { data: result.data }), results: result.results }
    : result.data
  const text = safeStringify(payload)
  const summary = opts?.summary ? `${opts.summary}\n\n` : ''
  const footer = [...metadata, opts?.hint].filter(Boolean).join('\n')
  const hint = footer ? `\n\n${footer}` : ''
  return { content: [{ type: 'text' as const, text: truncateText(summary + text + hint) }] }
}

export function formatList(
  result: ProxyResponse,
  opts: { itemsKey: string; noun: string; itemSummary: (item: unknown) => string; hint?: string }
) {
  if (!result.success) return formatResponse(result)
  const items = Array.isArray(result.data) ? result.data : ((result.data as Record<string, unknown[]>)?.[opts.itemsKey] || [])
  const lines = items.map(opts.itemSummary)
  const pagination = result.pagination
  const metadata = metadataLines(result)
  let text = `Found ${items.length} ${opts.noun}${items.length !== 1 ? 's' : ''}${pagination?.hasMore ? ' (more available)' : ''}\n\n${lines.join('\n')}`
  const footer = [...metadata, opts.hint].filter(Boolean).join('\n')
  if (footer) text += `\n\n${footer}`
  return { content: [{ type: 'text' as const, text: truncateText(text) }] }
}

export function formatBytes(bytes: unknown): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return 'unknown size'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
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
