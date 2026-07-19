import { join } from 'node:path'
import { probeHealth, type FetchLike } from './doctor.js'
import { checkDeployment, fingerprintId, type ExecLike } from './deployments.js'

/**
 * Guided repair for common install drift (JOE-145).
 *
 * Diagnosis produces serializable findings; applying a finding is a separate
 * step so tests can exercise both halves with fixture fs/exec/fetch. Every
 * mutating repair requires explicit confirmation, and token rotation
 * additionally requires an interactive prompt — it never happens under
 * --yes alone. Where automation is unsafe (redeploys, missing bootstrap
 * secrets, malformed .env lines that may hold secrets) the finding carries
 * manual instructions instead of an apply step.
 *
 * Redaction: same rules as doctor — env var names, fingerprinted IDs, and
 * error codes only. Full secrets, URLs, script IDs, and deployment IDs are
 * never placed in summaries or proposals; values needed to perform a repair
 * travel in `data`, which is stripped from all output.
 */

export type RepairKind =
  | 'env-crlf'
  | 'env-malformed'
  | 'clasp-config-missing'
  | 'token-missing'
  | 'bootstrap-secret-missing'
  | 'health-failing'
  | 'deployment-not-found'
  | 'deployment-stale'

export interface RepairFinding {
  kind: RepairKind
  /** Absent for repo-wide findings (.env file issues). */
  service?: string
  /** What is wrong. Redaction-safe. */
  summary: string
  /** 'confirm' findings have an apply step; 'manual' findings only instruct. */
  action: 'confirm' | 'manual'
  /** What applying will change, or the manual instructions. Redaction-safe. */
  proposal: string
  /** Values needed by applyRepair. Never printed. */
  data?: Record<string, string>
}

export interface FsLike {
  exists(path: string): boolean
  readFile(path: string): string
  writeFile(path: string, content: string): void
}

export interface RepairIO {
  root: string
  env: NodeJS.ProcessEnv
  fs: FsLike
  fetchImpl?: FetchLike
  execImpl?: ExecLike
  /**
   * Interactive-only gate for token rotation. Absent (non-TTY) means
   * rotation is refused with manual instructions — never automatic.
   */
  promptRotate?: (service: string) => Promise<boolean>
}

const DEPLOY_CMD = (service: string) => `bash skills/workspace-lite-installer/scripts/deploy-single.sh . ${service} "repair redeploy"`
const SETUP_CMD = (service: string) => `bash ./scripts/setup.sh --services ${service}`

function serviceTitle(service: string): string {
  return `Google Workspace Proxy - ${service.charAt(0).toUpperCase()}${service.slice(1)}`
}

function envPrefix(service: string): string {
  return `GOOGLE_WORKSPACE_${service.toUpperCase()}`
}

// ── .env file analysis ──

// Both shell-export style (setup.sh) and plain dotenv style (MCP wrappers)
// are valid; values may be double-quoted, single-quoted, or bare.
const ENV_LINE = /^(?:export\s+)?GOOGLE_WORKSPACE_[A-Z]+_PROXY_[A-Z_]*(?:URL|TOKEN)=(?:"[^"]*"|'[^']*'|[^\s"']+)\s*$/

export function analyzeEnvFile(content: string): { findings: RepairFinding[]; normalized: string } {
  const findings: RepairFinding[] = []
  const normalized = content.replace(/\r\n?/g, '\n')
  if (normalized !== content) {
    findings.push({
      kind: 'env-crlf',
      summary: '.env contains CRLF (Windows) line endings, which corrupt sourced values',
      action: 'confirm',
      proposal: 'rewrite .env with LF line endings (content otherwise unchanged; idempotent)',
    })
  }
  const malformed: number[] = []
  normalized.split('\n').forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    if (!trimmed.includes('GOOGLE_WORKSPACE_') || !trimmed.includes('=')) return
    if (!ENV_LINE.test(trimmed)) malformed.push(index + 1)
  })
  if (malformed.length > 0) {
    findings.push({
      kind: 'env-malformed',
      summary: `.env line${malformed.length > 1 ? 's' : ''} ${malformed.join(', ')} set GOOGLE_WORKSPACE variables but do not match the expected format`,
      action: 'manual',
      proposal: 'edit .env so each entry reads export GOOGLE_WORKSPACE_<SVC>_PROXY_<KIND>="value" — line content is not shown because it may contain a token',
    })
  }
  return { findings, normalized }
}

// ── clasp list parsing (for .clasp.json recovery) ──

export function findProjectIdByTitle(claspListJson: string, service: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(claspListJson)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null
  const title = serviceTitle(service)
  const match = parsed.find((p: { name?: string }) => p?.name === title) as { id?: string; scriptId?: string } | undefined
  const id = match?.id || match?.scriptId || ''
  return id || null
}

export function claspConfigContent(scriptId: string): string {
  // Identical shape to scripts/setup.sh write_clasp_config.
  return `${JSON.stringify(
    {
      scriptId,
      rootDir: '',
      scriptExtensions: ['.js', '.gs'],
      htmlExtensions: ['.html'],
      jsonExtensions: ['.json'],
      filePushOrder: [],
      skipSubdirectories: false,
    },
    null,
    2,
  )}\n`
}

// ── diagnosis ──

async function diagnoseService(service: string, io: RepairIO, claspList: () => Promise<string | null>): Promise<RepairFinding[]> {
  const findings: RepairFinding[] = []
  const prefix = envPrefix(service)
  const url = io.env[`${prefix}_PROXY_URL`]
  const token = io.env[`${prefix}_PROXY_TOKEN`]
  const appsScriptDir = join(io.root, 'packages', service, 'apps-script')
  const claspJsonPath = join(appsScriptDir, '.clasp.json')
  const secretPath = join(appsScriptDir, 'BootstrapSecret.gs')
  const inCheckout = io.fs.exists(appsScriptDir)

  if (inCheckout && !io.fs.exists(claspJsonPath)) {
    const listing = await claspList()
    const scriptId = listing === null ? null : findProjectIdByTitle(listing, service)
    if (scriptId) {
      findings.push({
        kind: 'clasp-config-missing',
        service,
        summary: `.clasp.json is missing but clasp lists an existing project titled "${serviceTitle(service)}"`,
        action: 'confirm',
        proposal: `write packages/${service}/apps-script/.clasp.json pointing at that project (script ID ${fingerprintId(scriptId)})`,
        data: { scriptId },
      })
    } else {
      findings.push({
        kind: 'clasp-config-missing',
        service,
        summary: '.clasp.json is missing and no canonical Apps Script project was found by title',
        action: 'manual',
        proposal: `rerun setup for this service to create the project: ${SETUP_CMD(service)}`,
      })
    }
  }

  if (url && io.fetchImpl) {
    const health = await probeHealth(service, url, io.fetchImpl)
    if (health.health !== 'healthy') {
      const advice = health.health === 'service-mismatch'
        ? `fix ${prefix}_PROXY_URL in .env — the URL answers as ${health.proxyReportsService ?? 'another service'}`
        : `verify the web app deployment in the Apps Script editor, or redeploy: ${DEPLOY_CMD(service)}`
      findings.push({
        kind: 'health-failing',
        service,
        summary: `health probe failed: ${health.health}${health.healthNote ? ` (${health.healthNote})` : ''}`,
        action: 'manual',
        proposal: advice,
      })
    }
  }

  if (url && !token) {
    if (inCheckout && io.fs.exists(secretPath)) {
      findings.push({
        kind: 'token-missing',
        service,
        summary: `${prefix}_PROXY_URL is set but ${prefix}_PROXY_TOKEN is missing`,
        action: 'confirm',
        proposal: 'recover the token via the bootstrap endpoint using the local setup key; if bootstrap was already consumed, rotation requires an additional interactive confirmation (never automatic)',
        data: { url },
      })
    } else {
      findings.push({
        kind: 'bootstrap-secret-missing',
        service,
        summary: `${prefix}_PROXY_TOKEN is missing and there is no local BootstrapSecret.gs to recover it with`,
        action: 'manual',
        proposal: `rerun setup for this service to regenerate the secret, push it, and bootstrap: ${SETUP_CMD(service)}`,
      })
    }
  }

  if (url && inCheckout && io.fs.exists(claspJsonPath)) {
    const check = await checkDeployment(service, url, io.execImpl)
    if (check.status === 'stale') {
      findings.push({
        kind: 'deployment-stale',
        service,
        summary: `.env deployment ${check.envDeploymentId ?? ''} is @${check.envVersion} but @${check.latestVersion} exists — pushed source is not live`,
        action: 'manual',
        proposal: `redeploy so the .env URL serves the latest version: ${DEPLOY_CMD(service)}`,
      })
    } else if (check.status === 'not-found' || check.status === 'head') {
      findings.push({
        kind: 'deployment-not-found',
        service,
        summary: check.status === 'head'
          ? '.env URL points at the @HEAD deployment, which must not serve MCP traffic'
          : `.env deployment ${check.envDeploymentId ?? ''} is not listed by clasp deployments`,
        action: 'manual',
        proposal: `create/refresh a versioned deployment and update .env if needed: ${DEPLOY_CMD(service)}`,
      })
    }
  }

  return findings
}

export async function diagnoseRepairs(services: string[], io: RepairIO): Promise<RepairFinding[]> {
  const findings: RepairFinding[] = []
  const envPath = join(io.root, '.env')
  if (io.fs.exists(envPath)) {
    findings.push(...analyzeEnvFile(io.fs.readFile(envPath)).findings)
  }
  let cachedList: string | null | undefined
  const claspList = async (): Promise<string | null> => {
    if (cachedList !== undefined) return cachedList
    if (!io.execImpl) {
      cachedList = null
      return cachedList
    }
    const result = await io.execImpl('clasp', ['list', '--json'], io.root)
    cachedList = result.code === 0 ? result.stdout : null
    return cachedList
  }
  for (const service of services) {
    findings.push(...(await diagnoseService(service, io, claspList)))
  }
  return findings
}

// ── apply ──

interface BootstrapResponse {
  success?: boolean
  data?: { token?: string }
  error?: { code?: string; message?: string }
}

async function bootstrapRequest(url: string, setupKey: string, rotate: boolean, fetchImpl: FetchLike): Promise<BootstrapResponse> {
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupKey, rotate }),
    })
    return JSON.parse(await res.text()) as BootstrapResponse
  } catch {
    return { success: false, error: { code: 'NETWORK_ERROR', message: 'bootstrap request failed' } }
  }
}

function readSetupKey(fs: FsLike, root: string, service: string): string | null {
  const path = join(root, 'packages', service, 'apps-script', 'BootstrapSecret.gs')
  if (!fs.exists(path)) return null
  const match = /BOOTSTRAP_SETUP_SECRET = '([^']*)'/.exec(fs.readFile(path))
  return match ? match[1] : null
}

function appendEnvEntries(io: RepairIO, service: string, url: string, token: string): void {
  const envPath = join(io.root, '.env')
  const prefix = envPrefix(service)
  const existing = io.fs.exists(envPath) ? io.fs.readFile(envPath) : ''
  const lines: string[] = []
  if (!new RegExp(`^export ${prefix}_PROXY_URL=`, 'm').test(existing)) {
    lines.push(`export ${prefix}_PROXY_URL="${url}"`)
  }
  lines.push(`export ${prefix}_PROXY_TOKEN="${token}"`)
  const separator = existing.length === 0 || existing.endsWith('\n') ? '' : '\n'
  io.fs.writeFile(envPath, `${existing}${separator}${lines.join('\n')}\n`)
}

export async function applyRepair(finding: RepairFinding, io: RepairIO): Promise<{ ok: boolean; outcome: string }> {
  if (finding.action !== 'confirm') {
    return { ok: false, outcome: 'manual repair — follow the instructions above' }
  }
  switch (finding.kind) {
    case 'env-crlf': {
      const envPath = join(io.root, '.env')
      io.fs.writeFile(envPath, analyzeEnvFile(io.fs.readFile(envPath)).normalized)
      return { ok: true, outcome: '.env rewritten with LF line endings' }
    }
    case 'clasp-config-missing': {
      const scriptId = finding.data?.scriptId
      if (!finding.service || !scriptId) return { ok: false, outcome: 'missing script ID for repair' }
      const path = join(io.root, 'packages', finding.service, 'apps-script', '.clasp.json')
      io.fs.writeFile(path, claspConfigContent(scriptId))
      return { ok: true, outcome: `.clasp.json written (script ID ${fingerprintId(scriptId)})` }
    }
    case 'token-missing': {
      const service = finding.service
      const url = finding.data?.url
      if (!service || !url) return { ok: false, outcome: 'missing service/url for repair' }
      if (!io.fetchImpl) return { ok: false, outcome: 'no network layer available for bootstrap' }
      const setupKey = readSetupKey(io.fs, io.root, service)
      if (!setupKey) return { ok: false, outcome: 'BootstrapSecret.gs is missing or unreadable' }
      const first = await bootstrapRequest(url, setupKey, false, io.fetchImpl)
      if (first.success && first.data?.token) {
        appendEnvEntries(io, service, url, first.data.token)
        return { ok: true, outcome: 'token bootstrapped (bootstrap was unconsumed) and appended to .env — restart your MCP client' }
      }
      if (first.error?.code !== 'FORBIDDEN') {
        return { ok: false, outcome: `bootstrap failed: ${first.error?.code ?? 'UNKNOWN'}` }
      }
      // Bootstrap already consumed — rotation invalidates the previous
      // primary token, so it is gated on an interactive prompt and never
      // happens under --yes alone.
      if (!io.promptRotate) {
        return { ok: false, outcome: 'bootstrap already consumed; token rotation needs an interactive run (rerun without --json in a TTY) or the manual rotation steps in docs/operations/troubleshooting.md' }
      }
      const confirmed = await io.promptRotate(service)
      if (!confirmed) {
        return { ok: false, outcome: 'rotation declined — no changes made' }
      }
      const rotated = await bootstrapRequest(url, setupKey, true, io.fetchImpl)
      if (rotated.success && rotated.data?.token) {
        appendEnvEntries(io, service, url, rotated.data.token)
        return { ok: true, outcome: 'token rotated and appended to .env — previous primary token is now invalid; restart your MCP client' }
      }
      return { ok: false, outcome: `rotation failed: ${rotated.error?.code ?? 'UNKNOWN'}` }
    }
    default:
      return { ok: false, outcome: `no automated repair for ${finding.kind}` }
  }
}
