import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
// @ts-expect-error importing untyped .mjs harness module
import { assertRecipientsSafe } from '../scripts/live-smoke/run.mjs'

const SERVICES = ['tasks', 'forms', 'calendar', 'slides', 'docs', 'sheets', 'gmail', 'drive']
const RECIPIENT_KEYS = ['to', 'cc', 'bcc', 'guests', 'email', 'forward']
const SELF = 'maintainer@example.com'

interface SmokeStep {
  tool: string
  params: (ctx: Record<string, unknown>) => Record<string, unknown>
  save?: { key: string; pick: string | ((body: unknown, ctx: Record<string, unknown>) => unknown) }
  gated?: boolean
  expect?: string
  skip?: (ctx: Record<string, unknown>) => string | null
  note?: string
  retryUntilFound?: number
}

interface SmokeSuite {
  service: string
  steps: SmokeStep[]
  cleanup?: SmokeStep[]
  verify?: { tool: string; params: (ctx: Record<string, unknown>) => Record<string, unknown>; leftovers: (body: unknown, ctx: Record<string, unknown>) => number }[]
}

async function loadSuites(): Promise<SmokeSuite[]> {
  const suites: SmokeSuite[] = []
  for (const service of SERVICES) {
    const mod = await import(`../scripts/live-smoke/suites/${service}.mjs`)
    suites.push(mod.suite)
  }
  return suites
}

// A context with every key suites reference, so params builders can run offline.
const fakeCtx: Record<string, unknown> = new Proxy({ prefix: 'wslite-smoke-test', selfEmail: SELF }, {
  get: (target, prop: string) => (prop in target ? target[prop as keyof typeof target] : `fake-${prop}`),
})

describe('live smoke suites (offline structure checks)', () => {
  it('every suite loads, every step builds params offline, and cleanup exists where artifacts are created', async () => {
    const suites = await loadSuites()
    assert.equal(suites.length, SERVICES.length)
    for (const suite of suites) {
      for (const step of [...suite.steps, ...(suite.cleanup ?? [])]) {
        assert.ok(step.tool.includes('_'), `${suite.service}: tool name ${step.tool}`)
        const params = step.params(fakeCtx)
        assert.equal(typeof params, 'object')
      }
      const creates = suite.steps.some((s) => /_create_|_send$/.test(s.tool))
      if (creates) {
        assert.ok((suite.cleanup ?? []).length > 0 || suite.service === 'tasks',
          `${suite.service}: creates artifacts but has no cleanup steps`)
        assert.ok((suite.verify ?? []).length > 0, `${suite.service}: creates artifacts but has no verify checks`)
      }
    }
  })

  it('every artifact-creating param set uses the run prefix in its name-like fields', async () => {
    const suites = await loadSuites()
    for (const suite of suites) {
      for (const step of suite.steps) {
        if (!/_create_(tasklist|form|calendar|presentation|document|spreadsheet|folder|file)$/.test(step.tool)) continue
        const params = step.params(fakeCtx)
        const named = ['title', 'name', 'summary'].map((k) => params[k]).filter((v) => typeof v === 'string') as string[]
        assert.ok(named.some((v) => v.includes('wslite-smoke-test')),
          `${suite.service}/${step.tool}: created artifact name must carry the run prefix`)
      }
    }
  })

  it('recipient-like params always resolve to the self email', async () => {
    const suites = await loadSuites()
    for (const suite of suites) {
      for (const step of [...suite.steps, ...(suite.cleanup ?? [])]) {
        const params = step.params(fakeCtx)
        for (const key of RECIPIENT_KEYS) {
          const value = params[key]
          if (typeof value !== 'string' || !value.includes('@')) continue
          assert.equal(value, SELF, `${suite.service}/${step.tool}: ${key} must be the self email`)
        }
      }
    }
  })

  it('recipient guard rejects non-self recipients and accepts self', () => {
    assert.throws(() => assertRecipientsSafe({ to: 'someone-else@example.com' }, SELF))
    assert.throws(() => assertRecipientsSafe({ to: `${SELF},other@example.com` }, SELF))
    assertRecipientsSafe({ to: SELF, subject: 'x' }, SELF)
    assertRecipientsSafe({ query: 'from:anyone@example.com' }, SELF) // non-recipient keys are not send targets
  })
})
