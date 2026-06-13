import { createProxyClient } from '@workspace-lite/shared/proxy-client'
export const { callProxy } = createProxyClient('gmail')
export type { ProxyResponse } from '@workspace-lite/shared'
