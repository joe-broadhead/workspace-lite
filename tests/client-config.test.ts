import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CLIENTS,
  envVarNames,
  generateClientConfig,
  mcpServersConfig,
  opencodeConfig,
} from '../scripts/client-config.mjs'
import { ALL_SERVICES } from '../scripts/setup-services.mjs'

const ROOT = '/repo'

describe('client config generator (JOE-146)', () => {
  it('locks the OpenCode entry shape (snapshot)', () => {
    const config = opencodeConfig(['drive'], ROOT)
    assert.deepEqual(config, {
      mcp: {
        'google-drive': {
          type: 'local',
          command: ['npx', 'tsx', '/repo/packages/drive/src/index.ts'],
          environment: {
            GOOGLE_WORKSPACE_DRIVE_PROXY_URL: '{env:GOOGLE_WORKSPACE_DRIVE_PROXY_URL}',
            GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN: '{env:GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN}',
            GOOGLE_WORKSPACE_DRIVE_PROXY_READ_TOKEN: '{env:GOOGLE_WORKSPACE_DRIVE_PROXY_READ_TOKEN}',
            GOOGLE_WORKSPACE_DRIVE_PROXY_WRITE_TOKEN: '{env:GOOGLE_WORKSPACE_DRIVE_PROXY_WRITE_TOKEN}',
            GOOGLE_WORKSPACE_DRIVE_PROXY_SEND_TOKEN: '{env:GOOGLE_WORKSPACE_DRIVE_PROXY_SEND_TOKEN}',
            GOOGLE_WORKSPACE_DRIVE_PROXY_SHARE_TOKEN: '{env:GOOGLE_WORKSPACE_DRIVE_PROXY_SHARE_TOKEN}',
            GOOGLE_WORKSPACE_DRIVE_PROXY_DESTRUCTIVE_TOKEN: '{env:GOOGLE_WORKSPACE_DRIVE_PROXY_DESTRUCTIVE_TOKEN}',
            GOOGLE_WORKSPACE_DRIVE_PROXY_ADMIN_TOKEN: '{env:GOOGLE_WORKSPACE_DRIVE_PROXY_ADMIN_TOKEN}',
          },
        },
      },
    })
  })

  it('locks the mcpServers entry shape (snapshot)', () => {
    const config = mcpServersConfig(['drive'], ROOT)
    assert.deepEqual(config, {
      mcpServers: {
        'google-drive': {
          command: 'bash',
          args: ['-c', "set -a; . '/repo/.env' 2>/dev/null; set +a; exec node '/repo/packages/drive/dist/index.js'"],
        },
      },
    })
  })

  it('generates full, core, and explicit service lists in canonical order', () => {
    const full = generateClientConfig({ profile: 'full', root: ROOT }) as ReturnType<typeof opencodeConfig>
    assert.deepEqual(Object.keys(full.mcp), ALL_SERVICES.map((s) => `google-${s}`))

    const core = generateClientConfig({ profile: 'core', root: ROOT }) as ReturnType<typeof opencodeConfig>
    assert.deepEqual(Object.keys(core.mcp), ['google-drive', 'google-gmail', 'google-calendar'])

    const explicit = generateClientConfig({ client: 'cursor', services: 'gmail,drive', root: ROOT }) as ReturnType<typeof mcpServersConfig>
    assert.deepEqual(Object.keys(explicit.mcpServers), ['google-drive', 'google-gmail'])
  })

  it('serializes to valid JSON with env references and no secret-shaped values', () => {
    const serialized = JSON.stringify(generateClientConfig({ profile: 'core', root: ROOT }), null, 2)
    const parsed = JSON.parse(serialized) as { mcp: Record<string, { environment: Record<string, string> }> }
    for (const [service, entry] of Object.entries(parsed.mcp)) {
      const svc = service.replace('google-', '')
      assert.deepEqual(Object.keys(entry.environment), envVarNames(svc))
      for (const [name, value] of Object.entries(entry.environment)) {
        assert.equal(value, `{env:${name}}`)
      }
    }
  })

  it('claude-code, claude-desktop, and cursor share the mcpServers shape', () => {
    for (const client of ['claude-code', 'claude-desktop', 'cursor']) {
      const config = generateClientConfig({ client, services: 'tasks', root: ROOT }) as ReturnType<typeof mcpServersConfig>
      assert.deepEqual(Object.keys(config), ['mcpServers'])
      const entry = config.mcpServers['google-tasks']
      assert.equal(entry.command, 'bash')
      assert.match(entry.args[1], /\.env/)
      assert.match(entry.args[1], /packages\/tasks\/dist\/index\.js/)
    }
  })

  it('windows mode uses tsx.cmd directly with backslash paths', () => {
    const config = opencodeConfig(['tasks'], 'C:\\repo', { windows: true })
    const command = config.mcp['google-tasks'].command
    assert.equal(command[0], 'C:\\repo\\node_modules\\.bin\\tsx.cmd')
    assert.equal(command[1], 'C:\\repo\\packages\\tasks\\src\\index.ts')
  })

  it('rejects unknown clients, profiles, and services with clear messages', () => {
    assert.throws(() => generateClientConfig({ client: 'zed', root: ROOT }), new RegExp(`Unknown client "zed".*${CLIENTS.join(', ')}`))
    assert.throws(() => generateClientConfig({ profile: 'nope', root: ROOT }), /Unknown profile/)
    assert.throws(() => generateClientConfig({ services: 'bogus', root: ROOT }), /Unknown service/)
  })
})
