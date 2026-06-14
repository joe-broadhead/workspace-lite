import { createProxyClient } from '@workspace-lite/shared/proxy-client'
export const { callProxy } = createProxyClient('slides')
export type { ProxyResponse } from '@workspace-lite/shared'
