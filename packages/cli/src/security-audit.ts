import { join } from 'node:path'
import type { FsLike } from './repair.js'

/**
 * wslite security audit (JOE-153).
 *
 * Offline-only posture report built from the local env shape and repo files.
 * It never reads Workspace content, never calls the proxies, and never
 * prints secret values — env var names, script property NAMES, severities,
 * and remediation hints only. Script Property VALUES live server-side in
 * Apps Script and are deliberately not inspectable from here; findings
 * about them are expectations with pointers, not measurements.
 */

export type AuditSeverity = 'ok' | 'info' | 'warn'

export interface AuditFinding {
  severity: AuditSeverity
  area: 'tokens' | 'scopes' | 'allowlists' | 'sharing' | 'images'
  service?: string
  summary: string
  advice?: string
}

const CLASS_TOKENS = ['READ', 'WRITE', 'SEND', 'SHARE', 'DESTRUCTIVE', 'ADMIN'] as const

/** Classes the primary token carries when PROXY_AUTH_TOKEN_CLASSES is unset (shared/apps-script/Auth.gs). */
export const PRIMARY_DEFAULT_CLASSES = 'read,draft,write,destructive,share,send'

/** Script property names enforced per service (grounded in packages/<svc>/apps-script sources). */
export const SERVICE_ALLOWLIST_PROPERTIES: Record<string, string[]> = {
  drive: ['ALLOWED_DRIVE_FILE_IDS', 'ALLOWED_DRIVE_FOLDER_IDS', 'ALLOWED_DRIVE_SHARED_DRIVE_IDS'],
  gmail: ['ALLOWED_EMAIL_RECIPIENTS', 'ALLOWED_EMAIL_DOMAINS'],
  calendar: ['ALLOWED_CALENDAR_IDS'],
  docs: ['ALLOWED_DOCUMENT_IDS', 'ALLOWED_IMAGE_HOSTS', 'ALLOWED_DOCS_IMAGE_HOSTS'],
  sheets: ['ALLOWED_SPREADSHEET_IDS'],
  slides: ['ALLOWED_PRESENTATION_IDS', 'ALLOWED_IMAGE_HOSTS', 'ALLOWED_SLIDES_IMAGE_HOSTS'],
  tasks: [],
  forms: [],
}

export function installedServices(services: string[], env: NodeJS.ProcessEnv): string[] {
  return services.filter((service) => {
    const prefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
    return Boolean(
      env[`${prefix}_PROXY_URL`] || env[`${prefix}_PROXY_TOKEN`] ||
      CLASS_TOKENS.some((c) => env[`${prefix}_PROXY_${c}_TOKEN`]),
    )
  })
}

export function auditTokens(service: string, env: NodeJS.ProcessEnv): AuditFinding[] {
  const prefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
  const primary = Boolean(env[`${prefix}_PROXY_TOKEN`])
  const classes = CLASS_TOKENS.filter((c) => Boolean(env[`${prefix}_PROXY_${c}_TOKEN`]))
  const findings: AuditFinding[] = []

  if (primary && classes.length === 0) {
    findings.push({
      severity: 'warn',
      area: 'tokens',
      service,
      summary: `only the primary token is configured — by default it carries every class except admin (${PRIMARY_DEFAULT_CLASSES})`,
      advice: `bootstrap class-scoped tokens and give agents ${prefix}_PROXY_READ_TOKEN (or the narrowest class they need); the primary's server-side grant can also be narrowed via the PROXY_AUTH_TOKEN_CLASSES script property`,
    })
  } else if (classes.length > 0) {
    findings.push({
      severity: 'ok',
      area: 'tokens',
      service,
      summary: `class-scoped tokens present: ${classes.map((c) => c.toLowerCase()).join(', ')}${primary ? ' (plus primary)' : ''}`,
    })
  }
  if (!primary && classes.length === 0) {
    findings.push({
      severity: 'info',
      area: 'tokens',
      service,
      summary: 'proxy URL set but no tokens configured locally',
      advice: 'run wslite repair (token recovery) or rerun setup for this service',
    })
  }
  if (classes.includes('ADMIN')) {
    findings.push({
      severity: 'warn',
      area: 'tokens',
      service,
      summary: 'an admin-class token is configured locally',
      advice: `admin enables token administration; keep ${prefix}_PROXY_ADMIN_TOKEN out of agent-facing environments and client config`,
    })
  }
  return findings
}

export function auditManifestScopes(service: string, root: string, fs: FsLike): AuditFinding {
  const manifestPath = join(root, 'packages', service, 'apps-script', 'appsscript.json')
  if (!fs.exists(manifestPath)) {
    return {
      severity: 'info',
      area: 'scopes',
      service,
      summary: 'no local appsscript.json to read scopes from (not a repo checkout?)',
      advice: 'inspect scopes in the Apps Script editor under Project Settings',
    }
  }
  try {
    const manifest = JSON.parse(fs.readFile(manifestPath)) as { oauthScopes?: string[] }
    const scopes = manifest.oauthScopes ?? []
    const short = scopes.map((s) => s.replace('https://www.googleapis.com/auth/', ''))
    return {
      severity: 'info',
      area: 'scopes',
      service,
      summary: `manifest requests ${scopes.length} OAuth scope${scopes.length === 1 ? '' : 's'}: ${short.join(', ')}`,
      advice: 'scopes are granted to your own Apps Script project only; a narrower manifest requires editing appsscript.json and re-authorizing',
    }
  } catch {
    return { severity: 'warn', area: 'scopes', service, summary: 'appsscript.json is unreadable or not valid JSON', advice: 'restore it from the repo (git checkout) before the next push' }
  }
}

export function auditAllowlists(service: string, sendCapable: boolean): AuditFinding[] {
  const findings: AuditFinding[] = []
  const properties = SERVICE_ALLOWLIST_PROPERTIES[service] ?? []
  if (properties.length > 0) {
    findings.push({
      severity: 'info',
      area: 'allowlists',
      service,
      summary: `supports script-property allowlists: ${properties.join(', ')} (values live server-side; not inspectable offline)`,
      advice: 'set them in the Apps Script editor under Project Settings → Script Properties; unset means unrestricted within the token class — see docs/operations/input-policies.md',
    })
  }
  if (service === 'gmail' && sendCapable) {
    findings.push({
      severity: 'warn',
      area: 'allowlists',
      service,
      summary: 'a send-capable token exists and recipient allowlists are server-side only — unset allowlists mean send to anyone',
      advice: 'set ALLOWED_EMAIL_RECIPIENTS and/or ALLOWED_EMAIL_DOMAINS script properties to bound where mail can go',
    })
  }
  return findings
}

export function auditSharingPosture(driveInstalled: boolean): AuditFinding[] {
  if (!driveInstalled) return []
  return [{
    severity: 'ok',
    area: 'sharing',
    service: 'drive',
    summary: 'public Drive sharing is disabled by default server-side (ALLOW_PUBLIC_DRIVE_SHARING / ALLOW_PUBLIC_SHARING unset)',
    advice: 'leave both script properties unset unless you explicitly need public links; audit again after any change',
  }]
}

export function auditImagePosture(services: string[]): AuditFinding[] {
  const affected = services.filter((s) => s === 'docs' || s === 'slides')
  if (affected.length === 0) return []
  return [{
    severity: 'info',
    area: 'images',
    summary: `image insertion in ${affected.join(' and ')} only fetches from hosts listed in ALLOWED_IMAGE_HOSTS (+ per-service ${affected.map((s) => `ALLOWED_${s.toUpperCase()}_IMAGE_HOSTS`).join(', ')}) — unset means image-by-URL is refused`,
    advice: 'keep the allowlist minimal; base domains admit their subdomains',
  }]
}

export function runSecurityAudit(catalogServices: string[], env: NodeJS.ProcessEnv, root: string, fs: FsLike): { services: string[]; findings: AuditFinding[] } {
  const services = installedServices(catalogServices, env)
  const findings: AuditFinding[] = []
  for (const service of services) {
    const prefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
    findings.push(...auditTokens(service, env))
    findings.push(auditManifestScopes(service, root, fs))
    const sendCapable = Boolean(env[`${prefix}_PROXY_TOKEN`] || env[`${prefix}_PROXY_SEND_TOKEN`])
    findings.push(...auditAllowlists(service, sendCapable))
  }
  findings.push(...auditSharingPosture(services.includes('drive')))
  findings.push(...auditImagePosture(services))
  return { services, findings }
}
