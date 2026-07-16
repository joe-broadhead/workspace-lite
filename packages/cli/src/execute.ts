import {
  applyConfirmPolicy,
  parseCliArgs,
  ParseCliArgsError,
  resolveRiskClass,
  type ToolSpec,
} from '@workspace-lite/shared/catalog'
import { createProxyClient, type CreateProxyClientOptions } from '@workspace-lite/shared/proxy-client'
import type { ProxyResponse } from '@workspace-lite/shared/response'
import { exitCodeFor, EXIT } from './exit-codes.js'
import { interactivePrompt } from './prompt.js'

export interface ExecuteOpts {
  yes: boolean
  json: boolean
  tty: boolean
  verbose?: boolean
  /** Injected for tests — defaults to createProxyClient */
  clientFactory?: (service: string) => { callProxy: (action: string, params?: Record<string, unknown>) => Promise<ProxyResponse> }
  prompt?: (summary: string) => Promise<boolean>
  /** When true, log token env **names** only (never values) via onTokenSelected */
  tokenDiagnostics?: boolean
}

export interface ExecuteResult {
  response?: ProxyResponse
  exitCode: number
  errorMessage?: string
  service?: string
  action?: string
  tool?: string
  args?: Record<string, unknown>
}

export async function executeTool(
  tool: ToolSpec,
  rawArgs: Record<string, unknown>,
  opts: ExecuteOpts,
): Promise<ExecuteResult> {
  try {
    const parsed = parseCliArgs(tool.schema, rawArgs, tool.cli)
    tool.validate?.(parsed)
    const action = tool.resolveAction?.(parsed) ?? tool.action
    const isBatch = tool.isBatchTool === true || action === 'batch'

    if (opts.verbose) {
      const risk = resolveRiskClass(tool.service, action, parsed)
      process.stderr.write(`[wslite] service=${tool.service} action=${action} risk=${risk}\n`)
    }

    const confirmed = await applyConfirmPolicy({
      service: tool.service,
      action,
      args: parsed,
      isBatch,
      yes: opts.yes,
      tty: opts.tty,
      prompt: opts.prompt ?? interactivePrompt,
    })
    if (!confirmed.ok) {
      return {
        exitCode: EXIT.CONFIRM,
        errorMessage: confirmed.message,
        service: tool.service,
        action,
        tool: tool.name,
      }
    }

    const factory = opts.clientFactory ?? ((service: string) => {
      const options: CreateProxyClientOptions = {}
      if (opts.tokenDiagnostics || opts.verbose) {
        options.onTokenSelected = (info) => {
          process.stderr.write(
            `[wslite] tokenClass=${info.tokenClass} envName=${info.envName} (candidates: ${info.candidateEnvNames.join(', ')})\n`,
          )
        }
      }
      return createProxyClient(service, options)
    })
    const client = factory(tool.service)
    const response = await client.callProxy(action, confirmed.args)
    return {
      response,
      exitCode: exitCodeFor(response),
      service: tool.service,
      action,
      tool: tool.name,
      args: confirmed.args,
    }
  } catch (error) {
    if (error instanceof ParseCliArgsError) {
      return { exitCode: EXIT.USAGE, errorMessage: error.message, tool: tool.name }
    }
    const message = error instanceof Error ? error.message : String(error)
    return { exitCode: EXIT.FAILURE, errorMessage: message, tool: tool.name }
  }
}

/** Raw call path: no Zod; still runs confirm via resolveRiskClass. */
export async function executeRaw(
  service: string,
  action: string,
  params: Record<string, unknown>,
  opts: ExecuteOpts,
): Promise<ExecuteResult> {
  try {
    const isBatch = action === 'batch'
    if (opts.verbose) {
      const risk = resolveRiskClass(service, action, params)
      process.stderr.write(`[wslite] service=${service} action=${action} risk=${risk} (raw)\n`)
    }
    const confirmed = await applyConfirmPolicy({
      service: service as ToolSpec['service'],
      action,
      args: params,
      isBatch,
      yes: opts.yes,
      tty: opts.tty,
      prompt: opts.prompt ?? interactivePrompt,
    })
    if (!confirmed.ok) {
      return { exitCode: EXIT.CONFIRM, errorMessage: confirmed.message, service, action }
    }
    const factory = opts.clientFactory ?? ((s: string) => createProxyClient(s))
    const client = factory(service)
    const response = await client.callProxy(action, confirmed.args)
    return {
      response,
      exitCode: exitCodeFor(response),
      service,
      action,
      args: confirmed.args,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { exitCode: EXIT.FAILURE, errorMessage: message, service, action }
  }
}
