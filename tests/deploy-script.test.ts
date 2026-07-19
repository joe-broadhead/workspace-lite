import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const FIXTURES = join(REPO, 'tests', 'fixtures', 'fake-clasp')
const DEPLOY_SINGLE = join(REPO, 'skills', 'workspace-lite-installer', 'scripts', 'deploy-single.sh')
// Matches deployments-multi-version.txt's @7 row.
const CURRENT_ID = 'AKfycbzCURRENTCURRENTCURRENTCURRENTCURRENT'

const sandboxes: string[] = []
after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true })
})

function makeRepoSandbox(envContent: string): string {
  const root = mkdtempSync(join(tmpdir(), 'wslite-deploy-test-'))
  sandboxes.push(root)
  mkdirSync(join(root, 'packages', 'drive', 'apps-script'), { recursive: true })
  writeFileSync(join(root, '.env'), envContent)
  return root
}

function runDeploy(root: string, scenario: Record<string, string> = {}) {
  chmodSync(join(FIXTURES, 'clasp'), 0o755)
  const result = spawnSync('bash', [DEPLOY_SINGLE, root, 'drive', 'test deploy'], {
    encoding: 'utf8',
    timeout: 60_000,
    env: {
      ...process.env,
      PATH: `${FIXTURES}:${process.env.PATH ?? ''}`,
      FAKE_CLASP_FIXTURES: FIXTURES,
      FAKE_CLASP_LOG: join(root, 'clasp.log'),
      ...scenario,
    },
  })
  return { ...result, out: `${result.stdout}${result.stderr}` }
}

const GOOD_ENV = `export GOOGLE_WORKSPACE_DRIVE_PROXY_URL="https://script.google.com/macros/s/${CURRENT_ID}/exec"\n`

describe('deploy-single.sh with fake clasp (JOE-147)', () => {
  it('pushes, versions, redeploys, and verifies on the happy path', () => {
    const { status, out } = runDeploy(makeRepoSandbox(GOOD_ENV))
    assert.equal(status, 0, out)
    assert.match(out, /Version: 7/)
    assert.match(out, /Redeploying version 7 to AKfycbzCURRENT/)
    assert.match(out, /Verified: @7/)
  })

  it('fails clearly when clasp version output is unrecognizable', () => {
    const { status, out } = runDeploy(makeRepoSandbox(GOOD_ENV), { FAKE_CLASP_VERSION: 'unexpected-output' })
    assert.equal(status, 1)
    assert.match(out, /Failed to create version for drive/)
  })

  it('fails when clasp version itself errors (not authenticated)', () => {
    const { status } = runDeploy(makeRepoSandbox(GOOD_ENV), { FAKE_CLASP_VERSION: 'auth-error' })
    assert.equal(status, 1)
  })

  it('fails when clasp redeploy errors', () => {
    const { status, out } = runDeploy(makeRepoSandbox(GOOD_ENV), { FAKE_CLASP_REDEPLOY: 'fail' })
    assert.equal(status, 1)
    assert.match(out, /ERROR: clasp redeploy failed for drive/)
  })

  it('warns instead of dying when the env deployment ID vanishes from clasp deployments', () => {
    const { status, out } = runDeploy(makeRepoSandbox(GOOD_ENV), { FAKE_CLASP_DEPLOYMENTS: 'head-only' })
    assert.equal(status, 0, out)
    assert.match(out, /WARNING: Deployment may have changed ID/)
  })

  it('tolerates CRLF .env files via load_env sanitization', () => {
    const crlfEnv = GOOD_ENV.replace('\n', '\r\n')
    const { status, out } = runDeploy(makeRepoSandbox(crlfEnv))
    assert.equal(status, 0, out)
    assert.match(out, /Verified: @7/)
  })

  it('rejects a missing service directory and a missing .env', () => {
    const root = makeRepoSandbox(GOOD_ENV)
    const missingService = spawnSync('bash', [DEPLOY_SINGLE, root, 'gmail', 'x'], { encoding: 'utf8', env: process.env })
    assert.equal(missingService.status, 1)
    assert.match(`${missingService.stdout}`, /packages\/gmail\/apps-script not found/)

    const bare = mkdtempSync(join(tmpdir(), 'wslite-deploy-test-'))
    sandboxes.push(bare)
    mkdirSync(join(bare, 'packages', 'drive', 'apps-script'), { recursive: true })
    const noEnv = spawnSync('bash', [DEPLOY_SINGLE, bare, 'drive', 'x'], { encoding: 'utf8', env: process.env })
    assert.equal(noEnv.status, 1)
    assert.match(`${noEnv.stdout}`, /\.env not found/)
  })
})

describe('shell script syntax (JOE-147)', () => {
  it('all installer shell scripts parse under bash -n', () => {
    const scripts = [
      join(REPO, 'scripts', 'setup.sh'),
      join(REPO, 'skills', 'workspace-lite-installer', 'scripts', 'deploy-single.sh'),
      join(REPO, 'skills', 'workspace-lite-installer', 'scripts', 'deploy-all.sh'),
      join(REPO, 'skills', 'workspace-lite-installer', 'scripts', 'verify-deployments.sh'),
    ]
    for (const script of scripts) {
      execFileSync('bash', ['-n', script])
    }
  })
})
