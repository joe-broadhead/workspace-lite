import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { spawnSync } from 'node:child_process'
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const FIXTURES = join(REPO, 'tests', 'fixtures', 'fake-clasp')
const EXEC_URL = 'https://script.google.com/macros/s/AKfycbzCURRENTCURRENTCURRENTCURRENTCURRENT/exec'
const MARKER_MANIFEST = '{\n  "oauthScopes": ["custom-marker-scope"],\n  "webapp": { "access": "ANYONE_ANONYMOUS" }\n}\n'

const sandboxes: string[] = []
after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true })
})

function makeSandbox(): { root: string; claspLog: string; curlLog: string } {
  const root = mkdtempSync(join(tmpdir(), 'wslite-setup-test-'))
  sandboxes.push(root)
  mkdirSync(join(root, 'scripts'), { recursive: true })
  for (const script of ['setup.sh', 'setup-services.mjs', 'client-config.mjs']) {
    cpSync(join(REPO, 'scripts', script), join(root, 'scripts', script))
  }
  mkdirSync(join(root, 'packages', 'drive', 'apps-script'), { recursive: true })
  writeFileSync(join(root, 'packages', 'drive', 'apps-script', 'appsscript.json'), MARKER_MANIFEST)
  return { root, claspLog: join(root, 'clasp.log'), curlLog: join(root, 'curl.log') }
}

function runSetup(
  sandbox: { root: string; claspLog: string; curlLog: string },
  args: string[],
  stdin: string,
  scenario: Record<string, string> = {},
) {
  for (const bin of ['clasp', 'npm', 'curl']) chmodSync(join(FIXTURES, bin), 0o755)
  const result = spawnSync('bash', [join(sandbox.root, 'scripts', 'setup.sh'), ...args], {
    cwd: sandbox.root,
    input: stdin,
    encoding: 'utf8',
    timeout: 60_000,
    env: {
      ...process.env,
      PATH: `${FIXTURES}:${process.env.PATH ?? ''}`,
      FAKE_CLASP_FIXTURES: FIXTURES,
      FAKE_CLASP_LOG: sandbox.claspLog,
      FAKE_CURL_LOG: sandbox.curlLog,
      ...scenario,
    },
  })
  return { ...result, out: `${result.stdout}${result.stderr}` }
}

function logLines(path: string): string[] {
  try {
    return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

describe('setup.sh with fake clasp (JOE-147)', () => {
  it('reuses an existing project found by canonical title instead of creating', () => {
    const sandbox = makeSandbox()
    const { status, out } = runSetup(sandbox, ['--services', 'drive'], '\n', { FAKE_CLASP_LIST: 'has-drive' })
    assert.equal(status, 0, out)
    assert.match(out, /reusing existing Apps Script project 'Google Workspace Proxy - Drive'/)
    const claspJson = readFileSync(join(sandbox.root, 'packages', 'drive', 'apps-script', '.clasp.json'), 'utf8')
    assert.match(claspJson, /EXISTING-DRIVE-SCRIPT-ID/)
    const commands = logLines(sandbox.claspLog).map((line) => line.split(' ')[0])
    assert.ok(!commands.includes('create'), `create was called: ${commands.join(',')}`)
    assert.ok(commands.includes('push'))
  })

  it('preserves the custom manifest across clasp v3 project creation', () => {
    const sandbox = makeSandbox()
    const { status, out } = runSetup(sandbox, ['--services', 'drive'], '\n', { FAKE_CLASP_LIST: 'empty' })
    assert.equal(status, 0, out)
    const commands = logLines(sandbox.claspLog).map((line) => line.split(' ')[0])
    assert.ok(commands.includes('create'))
    // Fake clasp create clobbers appsscript.json; setup.sh must restore it.
    const manifest = readFileSync(join(sandbox.root, 'packages', 'drive', 'apps-script', 'appsscript.json'), 'utf8')
    assert.equal(manifest, MARKER_MANIFEST)
    assert.match(readFileSync(join(sandbox.root, 'packages', 'drive', 'apps-script', '.clasp.json'), 'utf8'), /NEWLY-CREATED-SCRIPT-ID/)
  })

  it('generates partial .env entries for the bootstrapped service only', () => {
    const sandbox = makeSandbox()
    const { status, out } = runSetup(sandbox, ['--services', 'drive'], `${EXEC_URL}\n`, { FAKE_CLASP_LIST: 'has-drive' })
    assert.equal(status, 0, out)
    assert.match(out, /drive: token bootstrapped/)
    assert.match(out, /Setup complete for: drive/)
    const env = readFileSync(join(sandbox.root, '.env'), 'utf8')
    assert.match(env, new RegExp(`^export GOOGLE_WORKSPACE_DRIVE_PROXY_URL="${EXEC_URL.replace(/[/.]/g, '\\$&')}"$`, 'm'))
    assert.match(env, /^export GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN="fixture-token-[A-Za-z0-9_-]+"$/m)
    assert.ok(!env.includes('GMAIL'), 'unselected services must not appear in .env')
    // Config output covers only the selected service.
    assert.match(out, /"google-drive"/)
    assert.ok(!out.includes('"google-gmail"'))
  })

  it('skips bootstrap when the service token already exists in .env', () => {
    const sandbox = makeSandbox()
    writeFileSync(join(sandbox.root, '.env'), 'export GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN="already-present-token"\n')
    const { status, out } = runSetup(sandbox, ['--services', 'drive'], `${EXEC_URL}\n`, { FAKE_CLASP_LIST: 'has-drive' })
    assert.equal(status, 0, out)
    assert.match(out, /drive: token already exists in \.env\. Skipping bootstrap\./)
    assert.equal(logLines(sandbox.curlLog).length, 0, 'no bootstrap request should be made')
    assert.equal(readFileSync(join(sandbox.root, '.env'), 'utf8'), 'export GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN="already-present-token"\n')
  })

  it('refuses to rotate a consumed bootstrap when non-interactive', () => {
    const sandbox = makeSandbox()
    const { status, out } = runSetup(sandbox, ['--services', 'drive'], `${EXEC_URL}\n`, {
      FAKE_CLASP_LIST: 'has-drive',
      FAKE_CURL_FIRST: 'bootstrap-forbidden.json',
    })
    assert.equal(status, 0, out)
    assert.match(out, /bootstrap was already completed but no token exists/)
    assert.match(out, /non-interactive setup cannot rotate safely/)
    const requests = logLines(sandbox.curlLog)
    assert.equal(requests.length, 1, 'exactly one bootstrap attempt, no rotation')
    assert.ok(!requests[0].includes('"rotate":true'))
    let envContent = ''
    try {
      envContent = readFileSync(join(sandbox.root, '.env'), 'utf8')
    } catch {
      // .env never created — equally acceptable
    }
    assert.ok(!envContent.includes('DRIVE_PROXY_TOKEN'), 'no token may be written without rotation')
  })
})
