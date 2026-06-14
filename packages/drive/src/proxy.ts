import { createProxyClient } from '@workspace-lite/shared/proxy-client'
export const { callProxy } = createProxyClient('drive')
export type { ProxyResponse } from '@workspace-lite/shared'
