import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

interface ServiceMetadata {
  key: string
  title: string
  globalName: string
  proxyServiceName: string
  tokenEnvName: string
}

const registry = JSON.parse(readFileSync('config/service-registry.json', 'utf8')) as { healthVersion: string; services: ServiceMetadata[] }

function objectBlock(source: string, name: string) {
  const start = source.indexOf(`const ${name} = {`)
  assert.notEqual(start, -1, `missing ${name}`)
  const end = source.indexOf('\n  }', start)
  assert.notEqual(end, -1, `missing ${name} terminator`)
  return source.slice(start, end)
}

function policyKeys(source: string) {
  const block = objectBlock(source, 'ACTION_POLICIES')
  return [...block.matchAll(/^\s{4}([A-Za-z][A-Za-z0-9_]*):\s*\{/gm)].map((match) => match[1])
}

function batchKeys(source: string) {
  const block = objectBlock(source, 'BATCH_ACTIONS')
  return [...block.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\s*:\s*true\b/g)].map((match) => match[1])
}

describe('Apps Script proxy contracts', () => {
  it('keeps setup manifests valid', () => {
    execFileSync('node', ['scripts/validate-manifests.mjs'], { stdio: 'pipe' })
  })

  it('keeps action policies and batch allowlists aligned', () => {
    for (const service of registry.services) {
      const source = readFileSync(`packages/${service.key}/apps-script/${service.title}Service.gs`, 'utf8')
      const policies = new Set(policyKeys(source))
      const batchActions = batchKeys(source)

      assert.ok(source.includes('enforceActionPolicy(action, params || {}, ACTION_POLICIES)'), `${service.key} handle must enforce action policy`)
      assert.ok(source.includes('validateBatchOperation_(op, i, BATCH_ACTIONS)'), `${service.key} batch must validate operations against BATCH_ACTIONS`)
      assert.ok(source.includes('handle(op.action') || source.includes('handleFn(op.action'), `${service.key} batch must dispatch through handle so policies are reused`)
      assert.ok(!batchActions.includes('batch'), `${service.key} batch must not allow recursive batch calls`)

      for (const action of batchActions) {
        assert.ok(policies.has(action), `${service.key} batch action ${action} must have an ACTION_POLICIES entry`)
      }
    }
  })

  it('keeps generated proxy shell identity tied to service metadata', () => {
    for (const service of registry.services) {
      const code = readFileSync(`packages/${service.key}/apps-script/Code.gs`, 'utf8')
      assert.ok(code.includes(`const TOKEN_ENV_NAME = '${service.tokenEnvName}'`), `${service.key} token env must come from registry`)
      assert.ok(code.includes(`service: '${service.proxyServiceName}'`), `${service.key} health identity must come from registry`)
      assert.ok(code.includes(`${service.globalName}.requestWeight`), `${service.key} rate weight must call registered service module`)
      assert.ok(code.includes(`${service.globalName}.handle`), `${service.key} dispatch must call registered service module`)
    }
  })

  it('keeps confirmation and safety gates wired for risky operations', () => {
    const policy = readFileSync('packages/drive/apps-script/Policy.gs', 'utf8')
    for (const token of ['POLICY_CONFIRMATION_CLASSES_', 'CONFIRMATION_REQUIRED', 'BATCH_ACTION_NOT_ALLOWED', 'validateBatchOperation_', 'batchResponse_']) {
      assert.ok(policy.includes(token), `shared policy file must include ${token}`)
    }

    const safetyChecks = [
      ['packages/drive/apps-script/DriveService.gs', "fileSetSharing: { class: 'share'"],
      ['packages/gmail/apps-script/GmailService.gs', "send: { class: 'send'"],
      ['packages/calendar/apps-script/CalendarService.gs', "deleteEvent: { class: 'destructive'"],
      ['packages/sheets/apps-script/SheetsService.gs', "rangeClear: { class: 'destructive'"],
      ['packages/slides/apps-script/SlidesService.gs', "slideDelete: { class: 'destructive'"],
      ['packages/docs/apps-script/DocsService.gs', "setText: { class: 'destructive'"],
      ['packages/tasks/apps-script/TasksService.gs', "tasksClear: { class: 'destructive'"],
    ]

    for (const [path, token] of safetyChecks) {
      assert.ok(readFileSync(path, 'utf8').includes(token), `${path} must classify risky action: ${token}`)
    }
  })
})
