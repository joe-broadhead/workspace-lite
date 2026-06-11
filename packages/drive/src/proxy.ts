const PROXY_URL = process.env.GOOGLE_WORKSPACE_DRIVE_PROXY_URL ?? ''
const PROXY_TOKEN = process.env.GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN ?? ''

if (!PROXY_URL) throw new Error('GOOGLE_WORKSPACE_DRIVE_PROXY_URL not set')
if (!PROXY_TOKEN) throw new Error('GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN not set')

export interface ProxyResponse {
  success: boolean
  data?: unknown
  error?: { code: string; message: string }
  pagination?: { nextPageToken?: string; hasMore?: boolean }
}

export async function callProxy(action: string, params?: Record<string, unknown>): Promise<ProxyResponse> {
  const url = `${PROXY_URL}?token=${encodeURIComponent(PROXY_TOKEN)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  })

  if (!res.ok) throw new Error(`Proxy returned ${res.status} ${res.statusText}`)

  const data = (await res.json()) as ProxyResponse

  if (!data.success) {
    throw new Error(`[${data.error?.code}] ${data.error?.message}`)
  }

  return data
}
