import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  analyzeEnvFile,
  applyRepair,
  claspConfigContent,
  diagnoseRepairs,
  findProjectIdByTitle,
  type FsLike,
  type RepairIO,
} from '../../packages/cli/src/repair.js'
import type { FetchLike } from '../../packages/cli/src/doctor.js'
import type { ExecLike } from '../../packages/cli/src/deployments.js'

const ROOT = '/repo'
const SCRIPT_ID = '1a2b3c4d5e6f7g8h9i0jSCRIPTIDSCRIPTIDSCRIPTID'
const DEPLOY_ID = 'AKfycbSYNTHETICv15SYNTHETICv15SYNTHETICv15SYNTHETICv15SYNTHETICv15test'
const OLD_DEPLOY_ID = 'AKfycbSYNTHETICv03SYNTHETICv03SYNTHETICv03SYNTHETICv03SYNTHETICv03test'
const EXEC_URL = `https://script.google.com/macros/s/${DEPLOY_ID}/exec`
const SECRET = 'test-setup-key-value-test-setup-key-value'
const TOKEN = 'recovered-token-recovered-token-recovered-token-recovered-token-1234'

function fakeFs(files: Record<string, string>): FsLike & { store: Map<string, string> } {
  const store = new Map(Object.entries(files))
  return {
    store,
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

function tasksCheckout(extra: Record<string, string> = {}): Record<string, string> {
  return {
    [`${ROOT}/packages/tasks/apps-script`]: '<dir>',
    ...extra,
  }
}

const healthyFetch: FetchLike = async (_url, init) => {
  if (init.method === 'GET') {
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: { status: 'healthy', version: '1', service: 'google-workspace-proxy-tasks' } }) }
  }
  return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: { token: TOKEN } }) }
}

function io(overrides: Partial<RepairIO> & { fs: FsLike }): RepairIO {
  return { root: ROOT, env: {}, ...overrides }
}

describe('repair diagnosis (JOE-145)', () => {
  it('flags CRLF .env and normalizes idempotently', () => {
    const { findings, normalized } = analyzeEnvFile('export GOOGLE_WORKSPACE_TASKS_PROXY_URL="x"\r\nexport GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN="y"\r\n')
    assert.equal(findings.length, 1)
    assert.equal(findings[0].kind, 'env-crlf')
    assert.equal(findings[0].action, 'confirm')
    assert.ok(!normalized.includes('\r'))
    const second = analyzeEnvFile(normalized)
    assert.deepEqual(second.findings, [])
    assert.equal(second.normalized, normalized)
  })

  it('flags malformed GOOGLE_WORKSPACE lines by number without echoing content', () => {
    const { findings } = analyzeEnvFile('# comment\nGOOGLE_WORKSPACE_TASKS_PROXY_TOKEN = spaced-secret-value\nGOOGLE_WORKSPACE_DRIVE_PROXY_URL="unterminated\n')
    assert.equal(findings.length, 1)
    assert.equal(findings[0].kind, 'env-malformed')
    assert.equal(findings[0].action, 'manual')
    assert.match(findings[0].summary, /lines 2, 3/)
    assert.ok(!JSON.stringify(findings).includes('spaced-secret-value'))
  })

  it('accepts export-style, plain dotenv, and quoted variants', () => {
    const { findings } = analyzeEnvFile([
      'export GOOGLE_WORKSPACE_TASKS_PROXY_READ_TOKEN="abc"',
      'GOOGLE_WORKSPACE_DRIVE_PROXY_URL=https://script.google.com/macros/s/x/exec',
      "GOOGLE_WORKSPACE_GMAIL_PROXY_TOKEN='abc'",
      'export OTHER_VAR=whatever',
      '',
    ].join('\n'))
    assert.deepEqual(findings, [])
  })

  it('recovers .clasp.json from a canonical project title with confirmation', async () => {
    const fs = fakeFs(tasksCheckout())
    const exec: ExecLike = async (cmd, args) => {
      assert.equal(cmd, 'clasp')
      assert.deepEqual(args, ['list', '--json'])
      return { code: 0, stdout: JSON.stringify([{ name: 'Google Workspace Proxy - Tasks', id: SCRIPT_ID }]), stderr: '' }
    }
    const findings = await diagnoseRepairs(['tasks'], io({ fs, execImpl: exec }))
    assert.equal(findings.length, 1)
    assert.equal(findings[0].kind, 'clasp-config-missing')
    assert.equal(findings[0].action, 'confirm')
    // Full script ID only in data, never in printable fields.
    assert.ok(!`${findings[0].summary}${findings[0].proposal}`.includes(SCRIPT_ID))
    assert.equal(findings[0].data?.scriptId, SCRIPT_ID)

    const applied = await applyRepair(findings[0], io({ fs }))
    assert.equal(applied.ok, true)
    const written = fs.store.get(`${ROOT}/packages/tasks/apps-script/.clasp.json`)
    assert.equal(written, claspConfigContent(SCRIPT_ID))
    assert.ok(written!.includes(SCRIPT_ID))
  })

  it('falls back to manual setup guidance when no project matches by title', async () => {
    const fs = fakeFs(tasksCheckout())
    const exec: ExecLike = async () => ({ code: 0, stdout: '[]', stderr: '' })
    const findings = await diagnoseRepairs(['tasks'], io({ fs, execImpl: exec }))
    assert.equal(findings[0].kind, 'clasp-config-missing')
    assert.equal(findings[0].action, 'manual')
    assert.match(findings[0].proposal, /setup\.sh --services tasks/)
  })

  it('findProjectIdByTitle tolerates garbage and scriptId-shaped rows', () => {
    assert.equal(findProjectIdByTitle('not json', 'tasks'), null)
    assert.equal(findProjectIdByTitle('{}', 'tasks'), null)
    assert.equal(findProjectIdByTitle(JSON.stringify([{ name: 'Google Workspace Proxy - Tasks', scriptId: SCRIPT_ID }]), 'tasks'), SCRIPT_ID)
  })

  it('flags failing health with redeploy guidance and mismatch with env guidance', async () => {
    const down: FetchLike = async () => ({ ok: false, status: 500, text: async () => '' })
    const fs = fakeFs({})
    const env = { GOOGLE_WORKSPACE_TASKS_PROXY_URL: EXEC_URL, GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN: 't' }
    const findings = await diagnoseRepairs(['tasks'], io({ fs, env, fetchImpl: down }))
    assert.equal(findings.length, 1)
    assert.equal(findings[0].kind, 'health-failing')
    assert.match(findings[0].proposal, /deploy-single\.sh/)

    const wrong: FetchLike = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: { status: 'healthy', version: '1', service: 'google-workspace-proxy-gmail' } }) })
    const mismatch = await diagnoseRepairs(['tasks'], io({ fs, env, fetchImpl: wrong }))
    assert.equal(mismatch[0].kind, 'health-failing')
    assert.match(mismatch[0].proposal, /GOOGLE_WORKSPACE_TASKS_PROXY_URL/)
  })

  it('flags a missing token as recoverable only when BootstrapSecret.gs exists', async () => {
    const env = { GOOGLE_WORKSPACE_TASKS_PROXY_URL: EXEC_URL }
    const withSecret = fakeFs(tasksCheckout({
      [`${ROOT}/packages/tasks/apps-script/.clasp.json`]: '{}',
      [`${ROOT}/packages/tasks/apps-script/BootstrapSecret.gs`]: `const BOOTSTRAP_SETUP_SECRET = '${SECRET}'`,
    }))
    const exec: ExecLike = async () => ({ code: 0, stdout: `Found 1 deployments.\n- ${DEPLOY_ID} @2\n`, stderr: '' })
    const recoverable = await diagnoseRepairs(['tasks'], io({ fs: withSecret, env, execImpl: exec }))
    assert.deepEqual(recoverable.map((f) => f.kind), ['token-missing'])
    assert.equal(recoverable[0].action, 'confirm')

    const withoutSecret = fakeFs(tasksCheckout({ [`${ROOT}/packages/tasks/apps-script/.clasp.json`]: '{}' }))
    const manual = await diagnoseRepairs(['tasks'], io({ fs: withoutSecret, env, execImpl: exec }))
    assert.deepEqual(manual.map((f) => f.kind), ['bootstrap-secret-missing'])
    assert.equal(manual[0].action, 'manual')
    assert.match(manual[0].proposal, /setup\.sh --services tasks/)
  })

  it('flags stale, head, and not-found deployments with manual redeploy guidance', async () => {
    const fs = fakeFs(tasksCheckout({ [`${ROOT}/packages/tasks/apps-script/.clasp.json`]: '{}' }))
    const env = { GOOGLE_WORKSPACE_TASKS_PROXY_URL: `https://script.google.com/macros/s/${OLD_DEPLOY_ID}/exec`, GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN: 't' }
    const stale: ExecLike = async () => ({ code: 0, stdout: `Found 2 deployments.\n- ${OLD_DEPLOY_ID} @2\n- ${DEPLOY_ID} @5\n`, stderr: '' })
    const findings = await diagnoseRepairs(['tasks'], io({ fs, env, execImpl: stale }))
    assert.deepEqual(findings.map((f) => f.kind), ['deployment-stale'])
    assert.match(findings[0].summary, /@2.*@5/)
    assert.match(findings[0].proposal, /deploy-single\.sh/)
    assert.ok(!JSON.stringify(findings).includes(OLD_DEPLOY_ID))

    const missing: ExecLike = async () => ({ code: 0, stdout: `Found 1 deployments.\n- ${DEPLOY_ID} @5\n`, stderr: '' })
    const notFound = await diagnoseRepairs(['tasks'], io({ fs, env, execImpl: missing }))
    assert.deepEqual(notFound.map((f) => f.kind), ['deployment-not-found'])
  })

  it('reports a healthy, complete install as repair-free', async () => {
    const fs = fakeFs(tasksCheckout({
      [`${ROOT}/.env`]: `export GOOGLE_WORKSPACE_TASKS_PROXY_URL="${EXEC_URL}"\nexport GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN="t"\n`,
      [`${ROOT}/packages/tasks/apps-script/.clasp.json`]: '{}',
      [`${ROOT}/packages/tasks/apps-script/BootstrapSecret.gs`]: `const BOOTSTRAP_SETUP_SECRET = '${SECRET}'`,
    }))
    const env = { GOOGLE_WORKSPACE_TASKS_PROXY_URL: EXEC_URL, GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN: 't' }
    const exec: ExecLike = async () => ({ code: 0, stdout: `Found 1 deployments.\n- ${DEPLOY_ID} @2\n`, stderr: '' })
    const findings = await diagnoseRepairs(['tasks'], io({ fs, env, execImpl: exec, fetchImpl: healthyFetch }))
    assert.deepEqual(findings, [])
  })
})

describe('repair token recovery (JOE-145)', () => {
  function tokenFinding() {
    return {
      kind: 'token-missing' as const,
      service: 'tasks',
      summary: 's',
      action: 'confirm' as const,
      proposal: 'p',
      data: { url: EXEC_URL },
    }
  }
  const secretFs = () => fakeFs(tasksCheckout({
    [`${ROOT}/packages/tasks/apps-script/BootstrapSecret.gs`]: `const BOOTSTRAP_SETUP_SECRET = '${SECRET}'`,
  }))

  it('bootstraps without rotation when bootstrap is unconsumed', async () => {
    const fs = secretFs()
    const posts: string[] = []
    const fetchImpl: FetchLike = async (_url, init) => {
      posts.push(init.body ?? '')
      return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: { token: TOKEN } }) }
    }
    const result = await applyRepair(tokenFinding(), io({ fs, fetchImpl }))
    assert.equal(result.ok, true)
    assert.match(result.outcome, /without rotation|unconsumed/)
    assert.equal(posts.length, 1)
    assert.match(posts[0], /"rotate":false/)
    const envFile = fs.store.get(`${ROOT}/.env`)!
    assert.match(envFile, new RegExp(`TASKS_PROXY_TOKEN="${TOKEN}"`))
    assert.ok(!result.outcome.includes(TOKEN))
  })

  it('rotates only after the interactive prompt confirms', async () => {
    const fs = secretFs()
    const posts: string[] = []
    const fetchImpl: FetchLike = async (_url, init) => {
      posts.push(init.body ?? '')
      if (init.body?.includes('"rotate":true')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: { token: TOKEN } }) }
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'done' } }) }
    }
    let prompted = false
    const result = await applyRepair(tokenFinding(), io({ fs, fetchImpl, promptRotate: async () => { prompted = true; return true } }))
    assert.equal(result.ok, true)
    assert.equal(prompted, true)
    assert.match(result.outcome, /rotated/)
    assert.equal(posts.length, 2)
  })

  it('never rotates without a prompt channel or when declined', async () => {
    const forbidden: FetchLike = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'done' } }) })

    const noChannel = await applyRepair(tokenFinding(), io({ fs: secretFs(), fetchImpl: forbidden }))
    assert.equal(noChannel.ok, false)
    assert.match(noChannel.outcome, /interactive/)

    const declined = await applyRepair(tokenFinding(), io({ fs: secretFs(), fetchImpl: forbidden, promptRotate: async () => false }))
    assert.equal(declined.ok, false)
    assert.match(declined.outcome, /declined/)
  })

  it('surfaces non-FORBIDDEN bootstrap errors without writing anything', async () => {
    const fs = secretFs()
    const error: FetchLike = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'x' } }) })
    const result = await applyRepair(tokenFinding(), io({ fs, fetchImpl: error }))
    assert.equal(result.ok, false)
    assert.match(result.outcome, /UNAUTHORIZED/)
    assert.equal(fs.store.get(`${ROOT}/.env`), undefined)
  })
})
