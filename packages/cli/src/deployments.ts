import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Deployment staleness checks for wslite doctor --deployments (JOE-142).
 *
 * Compares the deployment ID embedded in each service's .env proxy URL
 * against `clasp deployments` for that service's Apps Script project.
 * Pushed source is NOT live until a versioned redeploy completes, so a
 * URL pointing at an older version (or at @HEAD) is a real operational
 * hazard this check makes visible.
 *
 * Redaction: deployment IDs are fingerprinted (first 10 chars) in output;
 * script IDs and full URLs are never printed. Nothing here mutates state —
 * no redeploys, no .env changes.
 */

export interface DeploymentRow {
  id: string
  /** 'HEAD' or a numeric version. */
  version: 'HEAD' | number
  description: string
}

export type DeploymentStatus =
  | 'current'
  | 'stale'
  | 'head'
  | 'not-found'
  | 'version-unavailable'
  | 'missing-url'
  | 'malformed-url'
  | 'clasp-unavailable'
  | 'unparseable-output'

export interface DeploymentCheck {
  status: DeploymentStatus
  /** Fingerprint of the .env deployment ID (never the full ID). */
  envDeploymentId?: string
  envVersion?: 'HEAD' | number
  latestVersion?: number
  description?: string
  detail?: string
  advice?: string
}

const DEPLOY_HINT = 'redeploy via skills/workspace-lite-installer/scripts/deploy-single.sh (or deploy-all.sh), then verify'

export function extractDeploymentId(proxyUrl: string): string | null {
  const match = /\/macros\/s\/(AKfy[a-zA-Z0-9_-]+)/.exec(proxyUrl)
  return match ? match[1] : null
}

export function fingerprintId(id: string): string {
  return id.length <= 10 ? id : `${id.slice(0, 10)}…`
}

export function parseClaspDeployments(output: string): DeploymentRow[] | null {
  const rows: DeploymentRow[] = []
  for (const line of output.split('\n')) {
    const match = /^-\s+(\S+)\s+@(HEAD|\d+)\s*(?:-\s*(.*))?$/.exec(line.trim())
    if (!match) continue
    rows.push({
      id: match[1],
      version: match[2] === 'HEAD' ? 'HEAD' : Number(match[2]),
      description: (match[3] ?? '').trim(),
    })
  }
  if (rows.length === 0 && !/Found \d+ deployments?\./.test(output)) return null
  return rows
}

export function analyzeDeployment(proxyUrl: string | undefined, claspOutput: string): DeploymentCheck {
  if (!proxyUrl) {
    return { status: 'missing-url', advice: 'set the service proxy URL in .env (scripts/setup.sh prints it)' }
  }
  const envId = extractDeploymentId(proxyUrl)
  if (!envId) {
    return { status: 'malformed-url', advice: 'the proxy URL does not look like an Apps Script /exec deployment URL' }
  }
  const rows = parseClaspDeployments(claspOutput)
  if (rows === null) {
    return { status: 'unparseable-output', envDeploymentId: fingerprintId(envId), detail: 'clasp output not recognized', advice: 'run clasp deployments manually in the service apps-script directory' }
  }
  const row = rows.find((r) => r.id === envId)
  if (!row) {
    return { status: 'not-found', envDeploymentId: fingerprintId(envId), advice: `the .env URL points at a deployment clasp does not list — ${DEPLOY_HINT}` }
  }
  const numericVersions = rows.map((r) => r.version).filter((v): v is number => typeof v === 'number')
  const latestVersion = numericVersions.length ? Math.max(...numericVersions) : undefined
  if (row.version === 'HEAD') {
    return { status: 'head', envDeploymentId: fingerprintId(envId), envVersion: 'HEAD', latestVersion, advice: `MCP traffic must use a versioned /exec deployment, not @HEAD — ${DEPLOY_HINT}` }
  }
  if (latestVersion === undefined) {
    return { status: 'version-unavailable', envDeploymentId: fingerprintId(envId), description: row.description }
  }
  if (row.version < latestVersion) {
    return {
      status: 'stale',
      envDeploymentId: fingerprintId(envId),
      envVersion: row.version,
      latestVersion,
      description: row.description,
      advice: `.env points at @${row.version} but @${latestVersion} exists — pushed source is not live until the URL's deployment is updated; ${DEPLOY_HINT}`,
    }
  }
  return { status: 'current', envDeploymentId: fingerprintId(envId), envVersion: row.version, latestVersion, description: row.description }
}

export type ExecLike = (command: string, args: string[], cwd: string) => Promise<{ code: number | null; stdout: string; stderr: string }>

const defaultExec: ExecLike = (command, args, cwd) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { cwd, timeout: 60_000 })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (error) => resolve({ code: null, stdout, stderr: error.message }))
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })

function repoRoot(): string {
  // packages/cli/{dist,src}/deployments.* → repo root is three levels up.
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
}

export async function checkDeployment(service: string, proxyUrl: string | undefined, execImpl: ExecLike = defaultExec): Promise<DeploymentCheck> {
  if (!proxyUrl) return analyzeDeployment(proxyUrl, '')
  const appsScriptDir = join(repoRoot(), 'packages', service, 'apps-script')
  if (!existsSync(join(appsScriptDir, '.clasp.json'))) {
    return {
      status: 'clasp-unavailable',
      envDeploymentId: extractDeploymentId(proxyUrl) ? fingerprintId(extractDeploymentId(proxyUrl)!) : undefined,
      detail: 'no .clasp.json for this service (deployment checks need a repo checkout with clasp configured)',
      advice: 'run from a configured workspace-lite checkout, or skip --deployments',
    }
  }
  const result = await execImpl('clasp', ['deployments'], appsScriptDir)
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).split('\n')[0]?.slice(0, 120) || 'clasp failed'
    return {
      status: 'clasp-unavailable',
      detail,
      advice: 'ensure clasp is installed and logged in (clasp login); deployment checks are optional',
    }
  }
  return analyzeDeployment(proxyUrl, result.stdout)
}
