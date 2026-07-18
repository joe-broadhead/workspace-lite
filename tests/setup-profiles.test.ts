import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ALL_SERVICES, PROFILES, resolveServices } from '../scripts/setup-services.mjs'

describe('setup service selection (JOE-144)', () => {
  it('defaults to all 8 services when no profile or list is given', () => {
    assert.deepEqual(resolveServices({}), ALL_SERVICES)
    assert.deepEqual(resolveServices(), ALL_SERVICES)
    assert.equal(ALL_SERVICES.length, 8)
  })

  it('defines the documented profiles over known services only', () => {
    assert.deepEqual(Object.keys(PROFILES).sort(), ['authoring', 'core', 'forms', 'full', 'planning'])
    for (const [name, services] of Object.entries(PROFILES)) {
      assert.ok(services.length > 0, `profile ${name} is empty`)
      for (const svc of services) assert.ok(ALL_SERVICES.includes(svc), `profile ${name} has unknown service ${svc}`)
    }
    assert.deepEqual(PROFILES.full, ALL_SERVICES)
  })

  it('expands profiles case-insensitively into canonical order', () => {
    assert.deepEqual(resolveServices({ profile: 'core' }), ['drive', 'gmail', 'calendar'])
    assert.deepEqual(resolveServices({ profile: ' Authoring ' }), ['drive', 'sheets', 'slides', 'docs'])
    // The forms profile is declared forms,sheets,drive but resolves in canonical order.
    assert.deepEqual(resolveServices({ profile: 'forms' }), ['drive', 'sheets', 'forms'])
    assert.deepEqual(resolveServices({ profile: 'planning' }), ['calendar', 'docs', 'tasks'])
  })

  it('parses explicit CSV lists with trimming, case folding, and dedupe', () => {
    assert.deepEqual(resolveServices({ services: 'gmail,drive' }), ['drive', 'gmail'])
    assert.deepEqual(resolveServices({ services: ' Drive , GMAIL , drive ' }), ['drive', 'gmail'])
    assert.deepEqual(resolveServices({ services: 'tasks' }), ['tasks'])
  })

  it('rejects unknown profiles with the valid names listed', () => {
    assert.throws(() => resolveServices({ profile: 'communication' }), /Unknown profile "communication".*full, core, authoring, planning, forms/)
  })

  it('rejects unknown services with the valid names listed', () => {
    assert.throws(() => resolveServices({ services: 'drive,gmial' }), /Unknown service: gmial.*drive, gmail, calendar/)
    assert.throws(() => resolveServices({ services: 'foo,bar,drive' }), /Unknown services: foo, bar/)
  })

  it('rejects empty lists and combined profile+services', () => {
    assert.throws(() => resolveServices({ services: '' }), /at least one service/)
    assert.throws(() => resolveServices({ services: ' , ,' }), /at least one service/)
    assert.throws(() => resolveServices({ profile: 'core', services: 'drive' }), /not both/)
  })
})
