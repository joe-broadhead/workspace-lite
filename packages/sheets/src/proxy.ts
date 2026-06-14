import { createProxyClient } from '@workspace-lite/shared/proxy-client'
export const { callProxy } = createProxyClient('sheets')
export type { ProxyResponse } from '@workspace-lite/shared'
