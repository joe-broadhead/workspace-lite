import { isConfirmClass, resolveRiskClass } from './risk.js'
import type { ServiceKey } from './types.js'

export type ConfirmDecision =
  | { ok: true; args: Record<string, unknown> }
  | { ok: false; reason: 'refused' | 'required_non_tty'; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneArgs(args: Record<string, unknown>): Record<string, unknown> {
  return structuredClone(args)
}

/**
 * Apply client-side confirmation before callProxy.
 * - Single tools: if resolveRiskClass is confirm-gated and args.confirm !== true,
 *   prompt or --yes sets args.confirm = true.
 * - Batch tools (action === 'batch' or isBatch):
 *   inject confirm into EACH gated op's params (K14); summary-only prompt (K20).
 * - Outer batch args.confirm is not relied on for nested Policy.gs checks.
 */
export async function applyConfirmPolicy(opts: {
  service: ServiceKey
  action: string
  args: Record<string, unknown>
  isBatch: boolean
  yes: boolean
  tty: boolean
  prompt: (summary: string) => Promise<boolean>
}): Promise<ConfirmDecision> {
  const { service, action, isBatch, yes, tty, prompt } = opts
  const args = cloneArgs(opts.args)

  if (isBatch || action === 'batch') {
    return applyBatchConfirm({ service, args, yes, tty, prompt })
  }

  const risk = resolveRiskClass(service, action, args)
  if (!isConfirmClass(risk) || args.confirm === true) {
    return { ok: true, args }
  }

  if (yes) {
    args.confirm = true
    return { ok: true, args }
  }

  if (!tty) {
    return {
      ok: false,
      reason: 'required_non_tty',
      message: `Confirmation required for ${service}.${action} (${risk}). Re-run with --yes after reviewing the action.`,
    }
  }

  const summary = `Confirm ${service}.${action} [risk=${risk}]?`
  const accepted = await prompt(summary)
  if (!accepted) {
    return { ok: false, reason: 'refused', message: 'Confirmation refused.' }
  }
  args.confirm = true
  return { ok: true, args }
}

async function applyBatchConfirm(opts: {
  service: ServiceKey
  args: Record<string, unknown>
  yes: boolean
  tty: boolean
  prompt: (summary: string) => Promise<boolean>
}): Promise<ConfirmDecision> {
  const { service, yes, tty, prompt } = opts
  const args = opts.args
  const operations = Array.isArray(args.operations) ? args.operations : []

  type Gated = { index: number; action: string; risk: string }
  const gated: Gated[] = []

  for (let index = 0; index < operations.length; index++) {
    const operation = operations[index]
    if (!isRecord(operation)) continue
    const opAction = operation.action
    if (typeof opAction !== 'string') continue
    const opParams = isRecord(operation.params) ? operation.params : {}
    const risk = resolveRiskClass(service, opAction, opParams)
    if (isConfirmClass(risk) && opParams.confirm !== true) {
      gated.push({ index, action: opAction, risk })
    }
  }

  if (gated.length === 0) {
    return { ok: true, args }
  }

  // Summary only: index, action, risk — never full params (K20 / PII)
  const summaryLines = gated.map(
    (g) => `  [${g.index}] ${g.action} (risk=${g.risk})`,
  )
  const summary =
    `Batch confirmation required for ${gated.length} operation(s) on ${service}:\n` +
    summaryLines.join('\n')

  if (!yes) {
    if (!tty) {
      return {
        ok: false,
        reason: 'required_non_tty',
        message: summary + '\nRe-run with --yes after reviewing the operations.',
      }
    }
    const accepted = await prompt(summary + '\nProceed?')
    if (!accepted) {
      return { ok: false, reason: 'refused', message: 'Batch confirmation refused.' }
    }
  }

  // Inject confirm into each gated op's params (clone params objects)
  const nextOps = operations.map((operation, index) => {
    if (!isRecord(operation)) return operation
    if (!gated.some((g) => g.index === index)) return operation
    const opParams = isRecord(operation.params) ? { ...operation.params } : {}
    opParams.confirm = true
    return { ...operation, params: opParams }
  })

  return { ok: true, args: { ...args, operations: nextOps } }
}
