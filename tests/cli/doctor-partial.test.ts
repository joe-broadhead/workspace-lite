import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ProxyResponse } from '@workspace-lite/shared/response'
import { EXIT } from '../../packages/cli/src/index.js'
import { runCli } from '../../packages/cli/src/program.js'
import type { FetchLike } from '../../packages/cli/src/doctor.js'

async function runDoctor(args: string[], env: Record<string, string>, extraDeps: Record<string, unknown> = {}) {
  const chunks: string[] = []
  const orig = process.stdout.write.bind(process.stdout)
  process.stdout.write = ((chunk: string | Uint8Array) => {
    chunks.push(String(chunk))
    return true
  }) as typeof process.stdout.write
  try {
    const code = await runCli(['node', 'wslite', 'doctor', ...args], { tty: false, env, exit: () => {}, ...extraDeps })
    return { code, output: chunks.join('') }
  } finally {
    process.stdout.write = orig
  }
}

const TASKS_ONLY = {
  GOOGLE_WORKSPACE_TASKS_PROXY_URL: 'https://example.invalid/tasks',
  GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN: 'secret',
}

describe('doctor partial installs (JOE-144)', () => {
  it('succeeds when only a subset of services is installed', async () => {
    const { code, output } = await runDoctor(['--json'], TASKS_ONLY)
    assert.equal(code, EXIT.SUCCESS)
    const parsed = JSON.parse(output)
    assert.equal(parsed.ok, true)
    const tasks = parsed.services.find((s: { service: string }) => s.service === 'tasks')
    assert.equal(tasks.installed, true)
    const drive = parsed.services.find((s: { service: string }) => s.service === 'drive')
    assert.equal(drive.installed, false)
  })

  it('marks not-installed services distinctly in text output', async () => {
    const { code, output } = await runDoctor([], TASKS_ONLY)
    assert.equal(code, EXIT.SUCCESS)
    assert.match(output, /tasks: url=set primary=set/)
    assert.match(output, /drive: not installed \(no env vars set/)
  })

  it('fails when an intended service is only partially configured', async () => {
    const { code } = await runDoctor(['--json'], { GOOGLE_WORKSPACE_TASKS_PROXY_URL: 'https://example.invalid/tasks' })
    assert.equal(code, EXIT.FAILURE)
  })

  it('a class token alone marks a service as intended and incomplete', async () => {
    const { code, output } = await runDoctor(['--json'], { GOOGLE_WORKSPACE_TASKS_PROXY_READ_TOKEN: 'secret' })
    assert.equal(code, EXIT.FAILURE)
    const parsed = JSON.parse(output)
    const tasks = parsed.services.find((s: { service: string }) => s.service === 'tasks')
    assert.equal(tasks.installed, true)
    assert.equal(tasks.proxyUrl, 'missing')
  })

  it('fails when nothing is installed at all', async () => {
    const { code } = await runDoctor(['--json'], {})
    assert.equal(code, EXIT.FAILURE)
  })

  it('doctor --live probes only installed services', async () => {
    const probed: string[] = []
    const healthFetch: FetchLike = async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { status: 'healthy', version: '1', service: 'google-workspace-proxy-tasks' } }),
    })
    const factory = (service: string) => ({
      async callProxy(): Promise<ProxyResponse> {
        probed.push(service)
        return { success: true, data: {} }
      },
    })
    const { code, output } = await runDoctor(['--live', '--json'], TASKS_ONLY, { clientFactory: factory, fetchImpl: healthFetch })
    assert.equal(code, EXIT.SUCCESS)
    assert.deepEqual(probed, ['tasks'])
    const parsed = JSON.parse(output)
    const drive = parsed.services.find((s: { service: string }) => s.service === 'drive')
    assert.equal(drive.live, undefined)
  })

  it('doctor --deployments checks only installed services', async () => {
    const checked: string[] = []
    const execImpl = async (_cmd: string, _args: string[], cwd: string) => {
      checked.push(cwd)
      return { code: 0, stdout: 'Found 1 deployment.\n- AKfycbTESTTESTTEST @4\n', stderr: '' }
    }
    const env = {
      GOOGLE_WORKSPACE_TASKS_PROXY_URL: 'https://script.google.com/macros/s/AKfycbTESTTESTTEST/exec',
      GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN: 'secret',
    }
    const { code } = await runDoctor(['--deployments', '--json'], env, { execImpl })
    assert.equal(code, EXIT.SUCCESS)
    assert.equal(checked.length, 1)
    assert.match(checked[0], /packages\/tasks\/apps-script$/)
  })
})
