import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  analyzeDeployment,
  checkDeployment,
  extractDeploymentId,
  fingerprintId,
  parseClaspDeployments,
  type ExecLike,
} from '../../packages/cli/src/deployments.js'

const ID_V15 = 'AKfycbx4EfJ5pNdhcQW6PDmEe5AxsbR-S96jczI8z4ZAYgyOlHuXdOWNcA0lQQvwuM5nLgU'
const ID_V3 = 'AKfycbyKNo1i4NHp238z5tI_lBNvKlwqYBwuir5YKBObOpaJKNpQqOlM8TiCAh0WBHDceEZF'
const ID_HEAD = 'AKfycbw9geuAPvdOutPdEgn90M9ZlZyghcZGqQZGz0OGwuk'
const URL_V15 = `https://script.google.com/macros/s/${ID_V15}/exec`

// Verbatim clasp v3 output shape observed live.
const CLASP_OUTPUT = `Found 3 deployments.
- ${ID_HEAD} @HEAD
- ${ID_V15} @15 - Fix false-success tasklistsDelete (JOE-815)
- ${ID_V3} @3 - Enable destructive token class 2025-06-14
`

describe('doctor --deployments', () => {
  it('extracts deployment IDs from /exec URLs and rejects other URLs', () => {
    assert.equal(extractDeploymentId(URL_V15), ID_V15)
    assert.equal(extractDeploymentId('https://example.com/not-apps-script'), null)
  })

  it('fingerprints IDs instead of printing them fully', () => {
    const fp = fingerprintId(ID_V15)
    assert.equal(fp.length, 11)
    assert.ok(fp.endsWith('…'))
    assert.ok(!fp.includes(ID_V15.slice(12)))
  })

  it('parses HEAD rows, versioned rows, and descriptions', () => {
    const rows = parseClaspDeployments(CLASP_OUTPUT)!
    assert.equal(rows.length, 3)
    assert.deepEqual(rows[0], { id: ID_HEAD, version: 'HEAD', description: '' })
    assert.deepEqual(rows[1], { id: ID_V15, version: 15, description: 'Fix false-success tasklistsDelete (JOE-815)' })
    assert.equal(rows[2].version, 3)
  })

  it('returns null for malformed output but tolerates an empty valid listing', () => {
    assert.equal(parseClaspDeployments('User has not enabled the Apps Script API'), null)
    assert.deepEqual(parseClaspDeployments('Found 0 deployments.\n'), [])
  })

  it('reports current when .env points at the highest numeric version', () => {
    const check = analyzeDeployment(URL_V15, CLASP_OUTPUT)
    assert.equal(check.status, 'current')
    assert.equal(check.envVersion, 15)
    assert.equal(check.latestVersion, 15)
  })

  it('reports stale with both versions when a newer deployment exists', () => {
    const url = `https://script.google.com/macros/s/${ID_V3}/exec`
    const check = analyzeDeployment(url, CLASP_OUTPUT)
    assert.equal(check.status, 'stale')
    assert.equal(check.envVersion, 3)
    assert.equal(check.latestVersion, 15)
    assert.match(check.advice ?? '', /deploy-single\.sh/)
    assert.match(check.advice ?? '', /not live until/)
  })

  it('flags @HEAD URLs as unsuitable for MCP traffic', () => {
    const url = `https://script.google.com/macros/s/${ID_HEAD}/exec`
    const check = analyzeDeployment(url, CLASP_OUTPUT)
    assert.equal(check.status, 'head')
    assert.match(check.advice ?? '', /not @HEAD/)
  })

  it('reports not-found, missing-url, malformed-url, and unparseable-output', () => {
    const unknown = `https://script.google.com/macros/s/AKfycbUNKNOWNUNKNOWNUNKNOWNUNKNOWN/exec`
    assert.equal(analyzeDeployment(unknown, CLASP_OUTPUT).status, 'not-found')
    assert.equal(analyzeDeployment(undefined, CLASP_OUTPUT).status, 'missing-url')
    assert.equal(analyzeDeployment('https://example.com/x', CLASP_OUTPUT).status, 'malformed-url')
    assert.equal(analyzeDeployment(URL_V15, 'garbage').status, 'unparseable-output')
  })

  it('never leaks a full deployment ID through any analysis result', () => {
    const urls = [URL_V15, `https://script.google.com/macros/s/${ID_HEAD}/exec`, `https://script.google.com/macros/s/${ID_V3}/exec`]
    for (const url of urls) {
      const serialized = JSON.stringify(analyzeDeployment(url, CLASP_OUTPUT))
      for (const id of [ID_V15, ID_V3, ID_HEAD]) assert.ok(!serialized.includes(id), `full ID leaked for ${url}`)
    }
  })

  it('checkDeployment surfaces clasp failures gracefully via the injected exec', async () => {
    const failing: ExecLike = async () => ({ code: 1, stdout: '', stderr: 'User has not been authenticated: run clasp login' })
    const check = await checkDeployment('tasks', URL_V15, failing)
    assert.equal(check.status, 'clasp-unavailable')
    assert.match(check.detail ?? '', /authenticated/)
    assert.match(check.advice ?? '', /clasp login/)
  })

  it('checkDeployment analyzes real-shaped output via the injected exec', async () => {
    const ok: ExecLike = async (command, args, cwd) => {
      assert.equal(command, 'clasp')
      assert.deepEqual(args, ['deployments'])
      assert.match(cwd, /packages\/tasks\/apps-script$/)
      return { code: 0, stdout: CLASP_OUTPUT, stderr: '' }
    }
    const check = await checkDeployment('tasks', URL_V15, ok)
    assert.equal(check.status, 'current')
  })
})
