import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EXIT } from '../../packages/cli/src/index.js'
import { runCli } from '../../packages/cli/src/program.js'
import { repoRoot } from '../../packages/cli/src/deployments.js'
import {
  PRIMARY_DEFAULT_CLASSES,
  SERVICE_ALLOWLIST_PROPERTIES,
  auditAllowlists,
  auditManifestScopes,
  auditTokens,
  runSecurityAudit,
} from '../../packages/cli/src/security-audit.js'
import type { FsLike } from '../../packages/cli/src/repair.js'

const ROOT = '/repo'
const SECRET_PRIMARY = 'fake-primary-token-value-abcdef1234567890'
const SECRET_SEND = 'fake-send-token-value-abcdef1234567890'

function fakeFs(files: Record<string, string>): FsLike {
  const store = new Map(Object.entries(files))
  return {
    exists: (p) => store.has(p),
    readFile: (p) => {
      const value = store.get(p)
      if (value === undefined) throw new Error(`ENOENT: ${p}`)
      return value
    },
    writeFile: (p, c) => {
      store.set(p, c)
    },
  }
}

describe('security audit (JOE-153)', () => {
  it('warns when only the broad primary token is configured', () => {
    const findings = auditTokens('tasks', { GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN: SECRET_PRIMARY })
    assert.equal(findings.length, 1)
    assert.equal(findings[0].severity, 'warn')
    assert.ok(findings[0].summary.includes(PRIMARY_DEFAULT_CLASSES))
    assert.match(findings[0].advice ?? '', /GOOGLE_WORKSPACE_TASKS_PROXY_READ_TOKEN/)
  })

  it('reports class-scoped setups as ok and flags admin tokens', () => {
    const scoped = auditTokens('drive', {
      GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN: SECRET_PRIMARY,
      GOOGLE_WORKSPACE_DRIVE_PROXY_READ_TOKEN: 'r',
      GOOGLE_WORKSPACE_DRIVE_PROXY_WRITE_TOKEN: 'w',
    })
    assert.equal(scoped[0].severity, 'ok')
    assert.match(scoped[0].summary, /read, write \(plus primary\)/)

    const admin = auditTokens('drive', { GOOGLE_WORKSPACE_DRIVE_PROXY_ADMIN_TOKEN: 'a' })
    assert.ok(admin.some((f) => f.severity === 'warn' && f.summary.includes('admin-class')))
  })

  it('summarizes manifest scopes from local appsscript.json', () => {
    const fs = fakeFs({
      [`${ROOT}/packages/gmail/apps-script/appsscript.json`]: JSON.stringify({
        oauthScopes: [
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/script.send_mail',
        ],
      }),
    })
    const finding = auditManifestScopes('gmail', ROOT, fs)
    assert.equal(finding.severity, 'info')
    assert.match(finding.summary, /2 OAuth scopes: gmail\.modify, script\.send_mail/)

    const missing = auditManifestScopes('gmail', ROOT, fakeFs({}))
    assert.equal(missing.severity, 'info')
    assert.match(missing.summary, /no local appsscript\.json/)

    const broken = auditManifestScopes('gmail', ROOT, fakeFs({ [`${ROOT}/packages/gmail/apps-script/appsscript.json`]: 'not json' }))
    assert.equal(broken.severity, 'warn')
  })

  it('flags send-capable gmail without inspectable recipient allowlists', () => {
    const findings = auditAllowlists('gmail', true)
    const warning = findings.find((f) => f.severity === 'warn')
    assert.ok(warning)
    assert.match(warning!.advice ?? '', /ALLOWED_EMAIL_RECIPIENTS/)

    const readOnly = auditAllowlists('gmail', false)
    assert.ok(!readOnly.some((f) => f.severity === 'warn'))
  })

  it('names only real script properties per service', () => {
    for (const [service, properties] of Object.entries(SERVICE_ALLOWLIST_PROPERTIES)) {
      for (const property of properties) {
        assert.match(property, /^ALLOW(ED)?_[A-Z_]+$/, `${service}: ${property}`)
      }
    }
    assert.deepEqual(SERVICE_ALLOWLIST_PROPERTIES.tasks, [])
  })

  it('includes sharing and image posture only for the relevant installed services', () => {
    const env = {
      GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN: SECRET_PRIMARY,
      GOOGLE_WORKSPACE_SLIDES_PROXY_TOKEN: 't',
    }
    const { services, findings } = runSecurityAudit(['calendar', 'docs', 'drive', 'forms', 'gmail', 'sheets', 'slides', 'tasks'], env, ROOT, fakeFs({}))
    assert.deepEqual(services, ['drive', 'slides'])
    assert.ok(findings.some((f) => f.area === 'sharing' && f.severity === 'ok'))
    const image = findings.find((f) => f.area === 'images')
    assert.ok(image)
    assert.match(image!.summary, /slides/)
    assert.ok(!image!.summary.includes('docs and'))

    const noDrive = runSecurityAudit(['tasks'], { GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN: 't' }, ROOT, fakeFs({}))
    assert.ok(!noDrive.findings.some((f) => f.area === 'sharing' || f.area === 'images'))
  })

  it('command output never contains token values and exits 0', async () => {
    const chunks: string[] = []
    const orig = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: string | Uint8Array) => {
      chunks.push(String(chunk))
      return true
    }) as typeof process.stdout.write
    try {
      const code = await runCli(['node', 'wslite', 'security', 'audit', '--offline'], {
        tty: false,
        exit: () => {},
        env: {
          GOOGLE_WORKSPACE_GMAIL_PROXY_URL: 'https://script.google.com/macros/s/AKfycbFAKEFAKEFAKE/exec',
          GOOGLE_WORKSPACE_GMAIL_PROXY_TOKEN: SECRET_PRIMARY,
          GOOGLE_WORKSPACE_GMAIL_PROXY_SEND_TOKEN: SECRET_SEND,
        },
        fsImpl: fakeFs({
          [`${repoRoot()}/packages/gmail/apps-script/appsscript.json`]: JSON.stringify({ oauthScopes: ['https://www.googleapis.com/auth/gmail.modify'] }),
        }),
      })
      const output = chunks.join('')
      assert.equal(code, EXIT.SUCCESS)
      assert.ok(!output.includes(SECRET_PRIMARY), 'primary token value leaked')
      assert.ok(!output.includes(SECRET_SEND), 'send token value leaked')
      assert.ok(!output.includes('AKfycbFAKEFAKEFAKE'), 'deployment URL leaked')
      assert.match(output, /gmail/)
      assert.match(output, /warning/)
    } finally {
      process.stdout.write = orig
    }
  })
})
