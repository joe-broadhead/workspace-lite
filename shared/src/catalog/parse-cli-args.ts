import { readFileSync } from 'node:fs'
import { z, type ZodTypeAny } from 'zod'
import type { CliFlagHints } from './types.js'

export class ParseCliArgsError extends Error {
  readonly code = 'BAD_REQUEST' as const
  constructor(message: string) {
    super(message)
    this.name = 'ParseCliArgsError'
  }
}

/** Unwrap optional / default / nullable wrappers to the core Zod type. */
function unwrapZod(schema: ZodTypeAny): ZodTypeAny {
  let current: ZodTypeAny = schema
  for (let i = 0; i < 8; i++) {
    const t = current.type
    if (t === 'optional' || t === 'default' || t === 'nullable') {
      const withUnwrap = current as unknown as { unwrap?: () => ZodTypeAny; def?: { innerType?: ZodTypeAny } }
      if (typeof withUnwrap.unwrap === 'function') {
        current = withUnwrap.unwrap()
        continue
      }
      const inner = withUnwrap.def?.innerType
      if (inner) {
        current = inner
        continue
      }
    }
    break
  }
  return current
}

function isComplexZodType(schema: ZodTypeAny): boolean {
  const core = unwrapZod(schema)
  const t = core.type
  return t === 'array' || t === 'object' || t === 'union' || t === 'record' || t === 'tuple' || t === 'map'
}

function isNumberLike(schema: ZodTypeAny): boolean {
  return unwrapZod(schema).type === 'number'
}

function isBooleanLike(schema: ZodTypeAny): boolean {
  return unwrapZod(schema).type === 'boolean'
}

function detectJsonKeys(shape: Record<string, ZodTypeAny>, hints?: CliFlagHints): Set<string> {
  const keys = new Set<string>(hints?.jsonKeys ?? [])
  for (const [key, schema] of Object.entries(shape)) {
    if (key === 'confirm') continue
    if (isComplexZodType(schema)) keys.add(key)
  }
  return keys
}

function parseJsonValue(raw: string, key: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    throw new ParseCliArgsError(`Invalid JSON for ${key}`)
  }
}

function coerceBoolean(value: unknown, key: string): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y'].includes(lower)) return true
    if (['false', '0', 'no', 'n'].includes(lower)) return false
  }
  throw new ParseCliArgsError(`Invalid boolean for ${key}: ${String(value)}`)
}

function coerceNumber(value: unknown, key: string): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (!Number.isNaN(n)) return n
  }
  throw new ParseCliArgsError(`Invalid number for ${key}: ${String(value)}`)
}

function readMaybeFile(value: unknown): string {
  if (typeof value !== 'string') return String(value)
  if (value.startsWith('@')) {
    const path = value.slice(1)
    try {
      return readFileSync(path, 'utf8')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ParseCliArgsError(`Failed to read file ${path}: ${message}`)
    }
  }
  return value
}

function loadParamsJson(raw: unknown): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === '') return {}
  const text = readMaybeFile(raw)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ParseCliArgsError('Invalid --params-json: expected JSON object')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ParseCliArgsError('Invalid --params-json: expected JSON object')
  }
  return { ...(parsed as Record<string, unknown>) }
}

/**
 * parseCliArgs(shape, rawFlags) → coerced then z.object(shape).strict().parse(...)
 *
 * Coercion pipeline on raw flag values BEFORE Zod:
 * 1. Drop reserved key `confirm` (only applyConfirmPolicy may set it)
 * 2. Per-key coercion (JSON / number / boolean / string)
 * 3. Apply fileInputs
 * 4. Merge --params-json as base (flags override)
 * 5. Zod strict parse with same shape MCP registers
 */
export function parseCliArgs(
  shape: Record<string, ZodTypeAny>,
  raw: Record<string, unknown>,
  hints?: CliFlagHints,
): Record<string, unknown> {
  const jsonKeys = detectJsonKeys(shape, hints)
  const base = loadParamsJson(raw['paramsJson'] ?? raw['params-json'] ?? raw.params_json)

  // operations-file sugar for batch tools → { operations: <file json> }
  const operationsFile = raw['operationsFile'] ?? raw['operations-file'] ?? raw.operations_file
  if (operationsFile !== undefined) {
    if (typeof operationsFile !== 'string' || operationsFile.length === 0) {
      throw new ParseCliArgsError('Invalid --operations-file: expected file path')
    }
    const path = operationsFile.startsWith('@') ? operationsFile.slice(1) : operationsFile
    let text: string
    try {
      text = readFileSync(path, 'utf8')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new ParseCliArgsError(`Failed to read --operations-file ${path}: ${message}`)
    }
    let operations: unknown
    try {
      operations = JSON.parse(text)
    } catch {
      throw new ParseCliArgsError('Invalid --operations-file: expected JSON array')
    }
    if (!Array.isArray(operations)) {
      throw new ParseCliArgsError('Invalid --operations-file: expected JSON array')
    }
    base.operations = operations
  }

  const coerced: Record<string, unknown> = { ...base }

  // fileInputs: map source flag key → target schema key (or target key → file path flag name)
  // Design: fileInputs: Record<string, string> prefer reading this key from a file path flag
  if (hints?.fileInputs) {
    for (const [targetKey, fileFlagKey] of Object.entries(hints.fileInputs)) {
      const filePath = raw[fileFlagKey] ?? raw[targetKey + 'File'] ?? raw[targetKey + '-file']
      if (filePath !== undefined && filePath !== null && filePath !== '') {
        coerced[targetKey] = readMaybeFile(typeof filePath === 'string' && !filePath.startsWith('@') ? `@${filePath}` : filePath)
      }
    }
  }

  for (const [key, value] of Object.entries(raw)) {
    if (
      key === 'confirm' ||
      key === 'paramsJson' || key === 'params-json' || key === 'params_json' ||
      key === 'operationsFile' || key === 'operations-file' || key === 'operations_file' ||
      key === 'yes' || key === 'json' || key === 'quiet' || key === 'verbose' ||
      key === 'idempotencyKey' || key === 'idempotency-key'
    ) {
      continue
    }
    // Skip file-input source flags already applied
    if (hints?.fileInputs && Object.values(hints.fileInputs).includes(key)) continue
    if (!(key in shape)) {
      // Allow alias reverse lookup
      const aliased = hints?.aliases
        ? Object.entries(hints.aliases).find(([, flag]) => flag === key || flag === key.replace(/-/g, ''))
        : undefined
      if (!aliased) continue
      const realKey = aliased[0]
      if (realKey === 'confirm') continue
      coerced[realKey] = coerceValue(shape[realKey], value, realKey, jsonKeys)
      continue
    }
    if (key === 'confirm') continue
    coerced[key] = coerceValue(shape[key], value, key, jsonKeys)
  }

  // Global idempotency-key merges into schema when present
  const idem = raw['idempotencyKey'] ?? raw['idempotency-key']
  if (idem !== undefined && 'idempotencyKey' in shape) {
    coerced.idempotencyKey = idem
  }

  // Never allow confirm from raw flags
  delete coerced.confirm

  try {
    return z.object(shape).strict().parse(coerced) as Record<string, unknown>
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0]
      const path = first?.path?.join('.') || '(root)'
      throw new ParseCliArgsError(`${path}: ${first?.message ?? 'invalid input'}`)
    }
    throw error
  }
}

function coerceValue(
  schema: ZodTypeAny,
  value: unknown,
  key: string,
  jsonKeys: Set<string>,
): unknown {
  if (value === undefined) return undefined

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (jsonKeys.has(key) || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return parseJsonValue(trimmed.startsWith('@') ? readMaybeFile(trimmed) : trimmed, key)
    }
    if (isNumberLike(schema)) return coerceNumber(value, key)
    if (isBooleanLike(schema)) return coerceBoolean(value, key)
    return value
  }

  if (isBooleanLike(schema)) return coerceBoolean(value, key)
  if (isNumberLike(schema)) return coerceNumber(value, key)
  return value
}
