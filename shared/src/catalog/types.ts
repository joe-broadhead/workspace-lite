import type { ZodTypeAny } from 'zod'
import type { ProxyResponse } from '../response.js'
import type { TokenClass } from './risk.js' // client routing class only — ToolSpec never stores hand-authored riskClass

export type ServiceKey =
  | 'drive' | 'gmail' | 'calendar' | 'sheets'
  | 'slides' | 'docs' | 'tasks' | 'forms'

/**
 * How the tool maps Zod fields to CLI flags.
 * Default: kebab-case of schema keys; booleans as --flag / --no-flag.
 * Note: schema key `confirm` is NEVER emitted as a CLI flag (see Confirm rules).
 */
export interface CliFlagHints {
  /** Override flag name for a schema key, e.g. { pageSize: 'page-size' } */
  aliases?: Record<string, string>
  /** Keys accepted as positional args in order, e.g. ['fileId'] */
  positionals?: string[]
  /** Prefer reading this key from a file path flag (e.g. content from --content-file) */
  fileInputs?: Record<string, string>
  /**
   * Keys that must be supplied as JSON (string or @file) even in sugared mode.
   * Default auto-detection: z.array, z.object, z.union/discriminatedUnion → json keys.
   */
  jsonKeys?: string[]
  /** Hide from generated help; still available via --params-json */
  advancedKeys?: string[]
  /**
   * v1 params-json-only tool: do not generate per-field flags (batch tools default true).
   */
  paramsJsonOnly?: boolean
}

export type OutputKind =
  | 'json-default'
  | 'list'
  | 'text'
  | 'permissions'
  | 'raw-proxy'

export interface ToolFormatter {
  kind: OutputKind
  /** MCP content[] formatter — MUST receive args (not {}) */
  formatMcp?: (
    result: ProxyResponse,
    args: Record<string, unknown>,
  ) => { content: { type: 'text'; text: string }[] }
  /** Optional CLI human formatter; goldens prefer --json */
  formatCli?: (result: ProxyResponse, args: Record<string, unknown>) => string
  listOptions?: {
    itemsKey: string
    noun: string
    itemSummary: (item: unknown) => string
  }
  summary?: string
  hint?: string
}

export interface ToolSpec {
  /** Canonical MCP tool name, e.g. drive_get_file */
  name: string
  service: ServiceKey
  /** Default Apps Script action, e.g. fileGet */
  action: string
  description: string
  /** Zod raw shape Record (same as today in schemas.ts) */
  schema: Record<string, ZodTypeAny>
  /**
   * DO NOT hand-author static risk here.
   * Use staticRiskClass(service, action) / resolveRiskClass(service, action, params)
   * from risk.ts for docs, help, and confirm.
   */
  /** Extra client-side validation after Zod (e.g. calendar date order) */
  validate?: (args: Record<string, unknown>) => void
  /** True if action appears in BATCH_ACTIONS for the service */
  batchEligible: boolean
  /** This tool is the service batch entrypoint (action === 'batch') */
  isBatchTool?: boolean
  /**
   * Multi-action tools (e.g. drive_list_folders → folderList | folderListRoot).
   * Runtime selection of which proxy action to call.
   * MUST be paired with `actions` when more than one action is possible.
   */
  resolveAction?: (args: Record<string, unknown>) => string
  /**
   * Static enumerable set of all proxy actions this tool may invoke.
   * Required when `resolveAction` is set (or whenever action is not 1:1 with the tool).
   */
  actions?: string[]
  formatter?: ToolFormatter
  cli?: CliFlagHints
  /** Help group; default 'general' when omitted */
  group?: 'list' | 'read' | 'write' | 'manage' | 'settings' | 'batch' | 'advanced' | 'general'
}

/** Effective static action list for mappings and wslite call (never probe resolveAction). */
export function effectiveActions(tool: ToolSpec): string[] {
  return tool.actions?.length ? tool.actions : [tool.action]
}

export interface Catalog {
  version: 1
  tools: ToolSpec[]
  byName: Map<string, ToolSpec>
  byService: Map<ServiceKey, ToolSpec[]>
}

/** Re-export TokenClass so catalog consumers need one import surface. */
export type { TokenClass }
