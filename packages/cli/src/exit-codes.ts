import type { ProxyResponse } from '@workspace-lite/shared/response'

export const EXIT = {
  SUCCESS: 0,
  FAILURE: 1,
  CONFIRM: 2,
  PARTIAL: 3,
  USAGE: 4,
} as const

export function exitCodeFor(response: ProxyResponse): number {
  if (response.success) {
    if (response.partial) return EXIT.PARTIAL
    return EXIT.SUCCESS
  }
  if (response.error?.code === 'CONFIRMATION_REQUIRED') return EXIT.CONFIRM
  return EXIT.FAILURE
}
