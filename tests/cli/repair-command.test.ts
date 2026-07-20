import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EXIT } from '../../packages/cli/src/index.js'
import { runCli } from '../../packages/cli/src/program.js'
import { repoRoot } from '../../packages/cli/src/deployments.js'
import type { FsLike } from '../../packages/cli/src/repair.js'
import type { FetchLike } from '../../packages/cli/src/doctor.js'

const ROOT = repoRoot()
const DEPLOY_ID = 'AKfycbSYNTHETICv15SYNTHETICv15SYNTHETICv15SYNTHETICv15SYNTHETICv15test'
const EXEC_URL = `https://script.google.com/macros/s/${DEPLOY_ID}/exec`

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

const healthy: FetchLike = async () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({ success: true, data: { status: 'healthy', version: '1', service: 'google-workspace-proxy-tasks' } }),
})

async function runRepair(args: string[], deps: Record<string, unknown>) {
  const chunks: string[] = []
  const orig = process.stdout.write.bind(process.stdout)
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(String(chunk))
    return true
  }) as typeof process.stdout.write
  try {
    const code = await runCli(['node', 'wslite', 'repair', ...args], { tty: false, exit: () => {}, ...deps })
    return { code, output: chunks.join('') }
  } finally {
    process.stdout.write = orig
  }
}

const TASKS_ENV = { GOOGLE_WORKSPACE_TASKS_PROXY_URL: EXEC_URL, GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN: 't' }

describe('wslite repair command (JOE-145)', () => {
  it('--dry-run reports findings without applying and exits nonzero', async () => {
    const fs = fakeFs({ [`${ROOT}/.env`]: 'export GOOGLE_WORKSPACE_TASKS_PROXY_URL="x"\r\n' })
    const { code, output } = await runRepair(['--dry-run', '--json'], { env: TASKS_ENV, fsImpl: fs, fetchImpl: healthy, execImpl: async () => ({ code: 1, stdout: '', stderr: 'no clasp' }) })
    assert.equal(code, EXIT.FAILURE)
    const parsed = JSON.parse(output)
    assert.equal(parsed.dryRun, true)
    assert.equal(parsed.ok, false)
    const crlf = parsed.findings.find((f: { kind: string }) => f.kind === 'env-crlf')
    assert.equal(crlf.applied, false)
    // Dry run must not write.
    assert.match(fs.store.get(`${ROOT}/.env`)!, /\r/)
  })

  it('--yes applies confirmable repairs and exits zero when all resolve', async () => {
    const fs = fakeFs({ [`${ROOT}/.env`]: `export GOOGLE_WORKSPACE_TASKS_PROXY_URL="${EXEC_URL}"\r\nexport GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN="t"\r\n` })
    const { code, output } = await runRepair(['--yes', '--json'], { env: TASKS_ENV, fsImpl: fs, fetchImpl: healthy, execImpl: async () => ({ code: 1, stdout: '', stderr: 'no clasp' }) })
    assert.equal(code, EXIT.SUCCESS)
    const parsed = JSON.parse(output)
    assert.equal(parsed.ok, true)
    assert.equal(parsed.findings[0].applied, true)
    assert.ok(!fs.store.get(`${ROOT}/.env`)!.includes('\r'))
  })

  it('prompts per finding when interactive and skips declined repairs', async () => {
    const fs = fakeFs({ [`${ROOT}/.env`]: 'export GOOGLE_WORKSPACE_TASKS_PROXY_URL="x"\r\n' })
    const prompts: string[] = []
    const { code, output } = await runRepair(['--json'], {
      env: TASKS_ENV,
      fsImpl: fs,
      fetchImpl: healthy,
      execImpl: async () => ({ code: 1, stdout: '', stderr: 'no clasp' }),
      prompt: async (summary: string) => {
        prompts.push(summary)
        return false
      },
    })
    assert.equal(code, EXIT.FAILURE)
    assert.equal(prompts.length, 1)
    assert.match(prompts[0], /Apply this repair\?/)
    const parsed = JSON.parse(output)
    assert.match(parsed.findings[0].outcome, /skipped/)
    assert.match(fs.store.get(`${ROOT}/.env`)!, /\r/)
  })

  it('reports a clean install with no repairs needed', async () => {
    const fs = fakeFs({
      [`${ROOT}/.env`]: `export GOOGLE_WORKSPACE_TASKS_PROXY_URL="${EXEC_URL}"\nexport GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN="t"\n`,
      [`${ROOT}/packages/tasks/apps-script`]: '<dir>',
      [`${ROOT}/packages/tasks/apps-script/.clasp.json`]: '{}',
      [`${ROOT}/packages/tasks/apps-script/BootstrapSecret.gs`]: "const BOOTSTRAP_SETUP_SECRET = 'k'",
    })
    const exec = async () => ({ code: 0, stdout: `Found 1 deployments.\n- ${DEPLOY_ID} @2\n`, stderr: '' })
    const { code, output } = await runRepair([], { env: TASKS_ENV, fsImpl: fs, fetchImpl: healthy, execImpl: exec })
    assert.equal(code, EXIT.SUCCESS)
    assert.match(output, /No repairs needed/)
  })

  it('rejects unknown --service names with usage exit code', async () => {
    const { code } = await runRepair(['--service', 'nope'], { env: {}, fsImpl: fakeFs({}) })
    assert.equal(code, EXIT.USAGE)
  })

  it('never leaks repair data payloads or full IDs into JSON output', async () => {
    const scriptId = '1a2b3c4d5e6f7g8h9i0jSCRIPTIDSCRIPTIDSCRIPTID'
    const fs = fakeFs({ [`${ROOT}/packages/tasks/apps-script`]: '<dir>' })
    const exec = async (_cmd: string, args: string[]) =>
      args[0] === 'list'
        ? { code: 0, stdout: JSON.stringify([{ name: 'Google Workspace Proxy - Tasks', id: scriptId }]), stderr: '' }
        : { code: 1, stdout: '', stderr: 'no' }
    const { output } = await runRepair(['--dry-run', '--json'], { env: TASKS_ENV, fsImpl: fs, fetchImpl: healthy, execImpl: exec })
    assert.ok(!output.includes(scriptId), 'full script ID leaked')
    assert.ok(!output.includes(DEPLOY_ID), 'full deployment ID leaked')
  })
})
