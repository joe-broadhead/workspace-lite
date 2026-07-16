import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ACTION_TOKEN_CLASSES,
  batchRiskClass,
  isConfirmClass,
  resolveRiskClass,
  staticRiskClass,
  type TokenClass,
} from '../shared/src/catalog/risk.js'

describe('risk resolution', () => {
  it('staticRiskClass returns mapped class or read for omitted actions', () => {
    assert.equal(staticRiskClass('tasks', 'tasksCreate'), 'write')
    assert.equal(staticRiskClass('tasks', 'tasksDelete'), 'destructive')
    assert.equal(staticRiskClass('tasks', 'tasklistsList'), 'read')
    assert.equal(staticRiskClass('drive', 'fileSetSharing'), 'share')
    assert.equal(staticRiskClass('gmail', 'send'), 'send')
    assert.equal(staticRiskClass('unknown-service', 'anything'), 'read')
  })

  it('isConfirmClass matches Policy.gs confirmation classes only', () => {
    assert.equal(isConfirmClass('send'), true)
    assert.equal(isConfirmClass('share'), true)
    assert.equal(isConfirmClass('destructive'), true)
    assert.equal(isConfirmClass('write'), false)
    assert.equal(isConfirmClass('read'), false)
    assert.equal(isConfirmClass('admin'), false)
  })

  it('gmail filtersCreate promotes to send when forward is non-empty', () => {
    assert.equal(resolveRiskClass('gmail', 'filtersCreate', {}), 'write')
    assert.equal(resolveRiskClass('gmail', 'filtersCreate', { forward: '  ' }), 'write')
    assert.equal(resolveRiskClass('gmail', 'filtersCreate', { forward: 'user@example.com' }), 'send')
  })

  it('gmail vacationUpdate promotes to send when auto-reply fields are set', () => {
    assert.equal(resolveRiskClass('gmail', 'vacationUpdate', {}), 'write')
    assert.equal(resolveRiskClass('gmail', 'vacationUpdate', { enableAutoReply: true }), 'send')
    assert.equal(resolveRiskClass('gmail', 'vacationUpdate', { enableAutoReply: 'true' }), 'send')
    assert.equal(resolveRiskClass('gmail', 'vacationUpdate', { responseSubject: 'OOO' }), 'send')
    assert.equal(resolveRiskClass('gmail', 'vacationUpdate', { responseBodyPlainText: 'away' }), 'send')
  })

  it('calendar create/update/moveEvent promote to send when sendUpdates is all or externalOnly', () => {
    assert.equal(resolveRiskClass('calendar', 'createEvent', {}), 'write')
    assert.equal(resolveRiskClass('calendar', 'createEvent', { sendUpdates: 'none' }), 'write')
    assert.equal(resolveRiskClass('calendar', 'createEvent', { sendUpdates: 'all' }), 'send')
    assert.equal(resolveRiskClass('calendar', 'updateEvent', { sendUpdates: 'externalOnly' }), 'send')
    assert.equal(resolveRiskClass('calendar', 'moveEvent', { sendUpdates: 'all' }), 'send')
  })

  it('batchRiskClass promotes to admin when multiple high-risk classes mix', () => {
    const mixed = batchRiskClass('gmail', {
      operations: [
        { action: 'send', params: {} },
        { action: 'deleteMessage', params: {} },
      ],
    })
    assert.equal(mixed, 'admin')

    const sendOnly = batchRiskClass('gmail', {
      operations: [
        { action: 'send', params: {} },
        { action: 'markRead', params: {} },
      ],
    })
    assert.equal(sendOnly, 'send')

    const destructiveOnly = batchRiskClass('tasks', {
      operations: [
        { action: 'tasksDelete', params: {} },
        { action: 'tasksClear', params: {} },
      ],
    })
    assert.equal(destructiveOnly, 'destructive')

    const writeOnly = batchRiskClass('tasks', {
      operations: [
        { action: 'tasksCreate', params: { title: 'a' } },
        { action: 'tasksUpdate', params: {} },
      ],
    })
    assert.equal(writeOnly, 'write')

    assert.equal(batchRiskClass('tasks', { operations: [] }), 'read')
    assert.equal(batchRiskClass('tasks', {}), 'read')
  })

  it('resolveRiskClass routes batch action through batchRiskClass', () => {
    const risk = resolveRiskClass('drive', 'batch', {
      operations: [
        { action: 'fileSetSharing', params: {} },
        { action: 'fileDelete', params: {} },
      ],
    })
    assert.equal(risk, 'admin')
  })

  it('batch walks nested op params for dynamic risk (gmail filter forward)', () => {
    const risk = resolveRiskClass('gmail', 'batch', {
      operations: [
        { action: 'filtersCreate', params: { forward: 'a@b.com' } },
        { action: 'markRead', params: {} },
      ],
    })
    assert.equal(risk, 'send')
  })

  it('ACTION_TOKEN_CLASSES never includes draft as a routing class', () => {
    for (const [service, actions] of Object.entries(ACTION_TOKEN_CLASSES)) {
      for (const [action, tokenClass] of Object.entries(actions)) {
        const allowed: TokenClass[] = ['read', 'write', 'send', 'share', 'destructive', 'admin']
        assert.ok(
          allowed.includes(tokenClass),
          `${service}.${action} has unexpected TokenClass ${tokenClass}`,
        )
        assert.notEqual(tokenClass as string, 'draft')
      }
    }
  })
})
