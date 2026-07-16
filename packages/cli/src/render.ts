import type { ProxyResponse } from '@workspace-lite/shared/response'
import type { ToolSpec } from '@workspace-lite/shared/catalog'
import type { ExecuteResult } from './execute.js'

export function renderResult(
  result: ExecuteResult,
  opts: { json: boolean; quiet: boolean },
  tool?: ToolSpec,
): void {
  if (opts.json) {
    const envelope = buildJsonEnvelope(result, tool)
    process.stdout.write(JSON.stringify(envelope, null, 2) + '\n')
    return
  }

  if (result.errorMessage && !result.response) {
    process.stderr.write(result.errorMessage + '\n')
    return
  }

  if (!result.response) return

  if (tool?.formatter?.formatCli) {
    process.stdout.write(tool.formatter.formatCli(result.response, result.args ?? {}) + '\n')
    return
  }

  if (tool?.formatter?.formatMcp && result.response.success) {
    const mcp = tool.formatter.formatMcp(result.response, result.args ?? {})
    const text = mcp.content.map((c) => c.text).join('\n')
    process.stdout.write(text + '\n')
    return
  }

  // Default human: pretty data or error
  if (!result.response.success) {
    const err = result.response.error
    process.stderr.write(`[${err?.code ?? 'ERROR'}] ${err?.message ?? 'Request failed'}\n`)
    return
  }

  const payload = result.response.partial && result.response.results
    ? { data: result.response.data, results: result.response.results, partial: true }
    : result.response.data
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n')
}

function buildJsonEnvelope(result: ExecuteResult, tool?: ToolSpec) {
  if (result.response) {
    return {
      ok: result.response.success,
      tool: result.tool ?? tool?.name,
      service: result.service ?? tool?.service,
      action: result.action,
      data: result.response.data,
      error: result.response.error,
      partial: result.response.partial ?? false,
      results: result.response.results,
      exitCode: result.exitCode,
    }
  }
  return {
    ok: false,
    tool: result.tool ?? tool?.name,
    service: result.service,
    action: result.action,
    error: { code: result.exitCode === 4 ? 'USAGE' : result.exitCode === 2 ? 'CONFIRMATION_REQUIRED' : 'CLIENT_ERROR', message: result.errorMessage ?? 'Unknown error' },
    exitCode: result.exitCode,
  }
}

export type { ProxyResponse }
