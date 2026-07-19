import { Command, CommanderError, Option } from 'commander'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import {
  effectiveActions,
  keyToFlagName,
  mcpNameToCliPath,
  staticRiskClass,
  type ToolSpec,
} from '@workspace-lite/shared/catalog'
import { findToolByName, findToolsByAction, loadCatalogTools, toolsByService } from './catalog-load.js'
import { executeRaw, executeTool, type ExecuteOpts } from './execute.js'
import { EXIT } from './exit-codes.js'
import { probeService, type FetchLike, type LiveProbeResult } from './doctor.js'
import { checkDeployment, defaultExec, repoRoot, type DeploymentCheck, type ExecLike } from './deployments.js'
import { applyRepair, diagnoseRepairs, type FsLike, type RepairIO } from './repair.js'
import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import { interactivePrompt } from './prompt.js'
import { renderResult } from './render.js'

export interface GlobalOpts {
  json?: boolean
  yes?: boolean
  quiet?: boolean
  verbose?: boolean
  idempotencyKey?: string
  paramsJson?: string
}

export interface ProgramDeps {
  clientFactory?: ExecuteOpts['clientFactory']
  prompt?: ExecuteOpts['prompt']
  tty?: boolean
  env?: NodeJS.ProcessEnv
  /** Injected for doctor --live tests — defaults to global fetch. */
  fetchImpl?: FetchLike
  /** Injected for doctor --deployments tests — defaults to spawning clasp. */
  execImpl?: ExecLike
  /** Injected for repair tests — defaults to real file access. */
  fsImpl?: FsLike
  /** Capture exit instead of process.exit (tests). */
  exit?: (code: number) => void
}

class CliExit extends Error {
  readonly code: number
  constructor(code: number) {
    super(`exit:${code}`)
    this.code = code
    this.name = 'CliExit'
  }
}

function isTty(deps: ProgramDeps): boolean {
  if (deps.tty !== undefined) return deps.tty
  return Boolean(process.stdin.isTTY && process.stderr.isTTY)
}

function baseExecuteOpts(globals: GlobalOpts, deps: ProgramDeps): ExecuteOpts {
  return {
    yes: Boolean(globals.yes),
    json: Boolean(globals.json),
    tty: isTty(deps),
    verbose: Boolean(globals.verbose),
    clientFactory: deps.clientFactory,
    prompt: deps.prompt,
  }
}

function collectRawArgs(cmd: Command, globals: GlobalOpts): Record<string, unknown> {
  const opts = cmd.opts() as Record<string, unknown>
  const raw: Record<string, unknown> = { ...opts }
  if (globals.paramsJson !== undefined) raw.paramsJson = globals.paramsJson
  if (globals.idempotencyKey !== undefined) raw.idempotencyKey = globals.idempotencyKey
  delete raw.json
  delete raw.yes
  delete raw.quiet
  delete raw.verbose
  return raw
}

function schemaKeys(tool: ToolSpec): string[] {
  return Object.keys(tool.schema).filter((k) => k !== 'confirm')
}

function addToolFlags(cmd: Command, tool: ToolSpec): void {
  if (tool.isBatchTool || tool.cli?.paramsJsonOnly) {
    cmd.option('--params-json <json|@file>', 'JSON object of tool parameters')
    cmd.option('--operations-file <path>', 'JSON array of batch operations')
    return
  }
  for (const key of schemaKeys(tool)) {
    if (tool.cli?.advancedKeys?.includes(key)) continue
    const flag = keyToFlagName(key, tool.cli?.aliases)
    const schema = tool.schema[key]
    const desc = (schema as { description?: string }).description ?? key
    cmd.option(`--${flag} <value>`, desc)
  }
  if (tool.cli?.fileInputs) {
    for (const [, fileFlag] of Object.entries(tool.cli.fileInputs)) {
      cmd.option(`--${fileFlag} <path>`, `Read file input`)
    }
  }
  cmd.option('--params-json <json|@file>', 'JSON object merged as base params (flags override)')
}

async function runTool(tool: ToolSpec, raw: Record<string, unknown>, globals: GlobalOpts, deps: ProgramDeps): Promise<number> {
  const result = await executeTool(tool, raw, baseExecuteOpts(globals, deps))
  renderResult(result, { json: Boolean(globals.json), quiet: Boolean(globals.quiet) }, tool)
  return result.exitCode
}

function finish(code: number): never {
  throw new CliExit(code)
}

export function buildProgram(deps: ProgramDeps = {}): Command {
  const tools = loadCatalogTools()
  const byService = toolsByService(tools)
  const env = deps.env ?? process.env

  const program = new Command()
  program
    .name('wslite')
    .description('CLI for Google Workspace tools via workspace-lite proxy')
    .option('--json', 'Machine-readable JSON on stdout')
    .option('-y, --yes', 'Auto-confirm gated actions (injects confirm:true)')
    .option('-q, --quiet', 'Suppress non-error human chrome')
    .option('-v, --verbose', 'Log service/action/risk to stderr')
    .option('--idempotency-key <key>', 'Idempotency key for create/send/share tools')
    .option('--params-json <json|@file>', 'Global params-json merge base')
    .exitOverride()
    .showHelpAfterError(false)
    .configureHelp({ sortSubcommands: true })

  program
    .command('doctor')
    .description('Check proxy env presence for catalog services (no secrets printed)')
    .option('--live', 'Also probe each configured service live: health GET + one authenticated read')
    .option('--deployments', 'Compare .env deployment IDs against clasp deployments (needs a configured checkout)')
    .action(async (cmdOpts: { live?: boolean; deployments?: boolean }) => {
      const globals = program.opts() as GlobalOpts
      const services = [...byService.keys()].sort()
      const rows: Array<Record<string, unknown>> = []
      for (const service of services) {
        const prefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
        const url = Boolean(env[`${prefix}_PROXY_URL`])
        const primary = Boolean(env[`${prefix}_PROXY_TOKEN`])
        const classTokenEnvNames = ['READ', 'WRITE', 'SEND', 'SHARE', 'DESTRUCTIVE', 'ADMIN']
          .map((c) => `${prefix}_PROXY_${c}_TOKEN`)
        const classes = classTokenEnvNames
          .filter((name) => Boolean(env[name]))
          .map((name) => name.replace(`${prefix}_PROXY_`, '').replace(/_TOKEN$/, ''))
        rows.push({
          service,
          // Partial installs (setup.sh --profile/--services) are first-class:
          // a service with no env vars at all is "not installed" and never
          // counts against doctor's exit code. Any var present means the
          // service was intended, so incomplete config is a real failure.
          installed: url || primary || classes.length > 0,
          proxyUrl: url ? 'set' : 'missing',
          primaryToken: primary ? 'set' : 'missing',
          primaryEnvName: `${prefix}_PROXY_TOKEN`,
          classTokensSet: classes,
          // env names only — never values
          classTokenEnvNamesPresent: classTokenEnvNames.filter((name) => Boolean(env[name])),
        })
      }
      const installedRows = rows.filter((r) => r.installed)
      if (cmdOpts.live) {
        const factory = deps.clientFactory ?? ((s: string) => createProxyClient(s))
        for (const row of installedRows) {
          const service = row.service as string
          const proxyUrl = env[`GOOGLE_WORKSPACE_${service.toUpperCase()}_PROXY_URL`]
          if (!proxyUrl || row.primaryToken !== 'set') {
            Object.assign(row, { live: { ready: false, health: 'skipped', auth: 'skipped', advice: 'set the env vars above first' } })
            continue
          }
          const probe = await probeService(service, proxyUrl, factory, deps.fetchImpl)
          Object.assign(row, { live: probe })
        }
      }
      if (cmdOpts.deployments) {
        for (const row of installedRows) {
          const service = row.service as string
          const proxyUrl = env[`GOOGLE_WORKSPACE_${service.toUpperCase()}_PROXY_URL`]
          row.deployment = await checkDeployment(service, proxyUrl, deps.execImpl)
        }
      }
      const allConfigured = installedRows.length > 0 &&
        installedRows.every((r) => r.proxyUrl === 'set' && r.primaryToken === 'set')
      const allReady = !cmdOpts.live || installedRows.every((r) => (r.live as { ready?: boolean } | undefined)?.ready)
      const allCurrent = !cmdOpts.deployments || installedRows.every((r) => {
        const status = (r.deployment as DeploymentCheck | undefined)?.status
        return status === 'current' || status === 'clasp-unavailable' || status === 'version-unavailable'
      })
      if (globals.json) {
        process.stdout.write(JSON.stringify({ ok: allConfigured && allReady && allCurrent, live: Boolean(cmdOpts.live), deployments: Boolean(cmdOpts.deployments), services: rows }, null, 2) + '\n')
      } else {
        for (const row of rows) {
          if (!row.installed) {
            process.stdout.write(`${row.service}: not installed (no env vars set — ok for partial installs)\n`)
            continue
          }
          let line = `${row.service}: url=${row.proxyUrl} primary=${row.primaryToken} classTokens=[${(row.classTokensSet as string[]).join(',') || 'none'}]`
          const live = row.live as LiveProbeResult | undefined
          if (live) {
            line += ` | health=${live.health} auth=${live.auth} ready=${live.ready ? 'yes' : 'NO'}`
            if (live.authNote || live.healthNote) line += ` (${[live.healthNote, live.authNote].filter(Boolean).join('; ')})`
            if (live.advice) line += `\n  ↳ ${live.advice}`
          }
          const deployment = row.deployment as DeploymentCheck | undefined
          if (deployment) {
            line += ` | deployment=${deployment.status}`
            if (deployment.envVersion !== undefined) line += ` @${deployment.envVersion}`
            if (deployment.latestVersion !== undefined && deployment.status === 'stale') line += ` (latest @${deployment.latestVersion})`
            if (deployment.detail) line += ` (${deployment.detail})`
            if (deployment.advice) line += `\n  ↳ ${deployment.advice}`
          }
          process.stdout.write(line + '\n')
        }
      }
      finish(allConfigured && allReady && allCurrent ? EXIT.SUCCESS : EXIT.FAILURE)
    })

  program
    .command('repair')
    .description('Diagnose common install drift; apply safe repairs with confirmation or print manual steps')
    .option('--dry-run', 'Show findings and proposals without applying anything')
    .option('--service <service>', 'Limit repair to one service')
    .action(async (cmdOpts: { dryRun?: boolean; service?: string }) => {
      const globals = program.opts() as GlobalOpts
      const catalogServices: string[] = [...byService.keys()].sort()
      const installed = (service: string) => {
        const prefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
        return Boolean(
          env[`${prefix}_PROXY_URL`] || env[`${prefix}_PROXY_TOKEN`] ||
          ['READ', 'WRITE', 'SEND', 'SHARE', 'DESTRUCTIVE', 'ADMIN'].some((c) => env[`${prefix}_PROXY_${c}_TOKEN`]),
        )
      }
      let services: string[]
      if (cmdOpts.service) {
        if (!catalogServices.includes(cmdOpts.service)) {
          process.stderr.write(`Unknown service "${cmdOpts.service}". Valid services: ${catalogServices.join(', ')}\n`)
          finish(EXIT.USAGE)
        }
        services = [cmdOpts.service]
      } else {
        services = catalogServices.filter(installed)
      }
      const tty = isTty(deps)
      const promptFn = deps.prompt ?? interactivePrompt
      const canPrompt = tty || deps.prompt !== undefined
      const io: RepairIO = {
        root: repoRoot(),
        env,
        fs: deps.fsImpl ?? {
          exists: (p) => existsSync(p),
          readFile: (p) => readFileSync(p, 'utf8'),
          writeFile: (p, c) => writeFileSync(p, c),
        },
        fetchImpl: deps.fetchImpl ?? (fetch as unknown as FetchLike),
        execImpl: deps.execImpl ?? defaultExec,
        // Rotation is interactive-only: without a prompt channel it is
        // refused inside applyRepair — never automatic, even with --yes.
        promptRotate: canPrompt
          ? (service) => promptFn(`Rotate the primary token for ${service}? This invalidates the previous primary token.`)
          : undefined,
      }
      const findings = await diagnoseRepairs(services, io)
      const results: Array<Record<string, unknown>> = []
      let allResolved = true
      for (const finding of findings) {
        const label = finding.service ? `${finding.service}: ` : '.env: '
        if (!globals.json) {
          process.stdout.write(`${label}${finding.summary}\n  ↳ ${finding.action === 'confirm' ? 'proposed' : 'manual'}: ${finding.proposal}\n`)
        }
        if (cmdOpts.dryRun || finding.action !== 'confirm') {
          results.push({ ...finding, data: undefined, applied: false })
          allResolved = false
          continue
        }
        let approved = Boolean(globals.yes)
        if (!approved && canPrompt) {
          approved = await promptFn(`Apply this repair? ${label}${finding.proposal}`)
        }
        if (!approved) {
          results.push({ ...finding, data: undefined, applied: false, outcome: 'skipped (not confirmed)' })
          if (!globals.json) process.stdout.write('  ↳ skipped (not confirmed)\n')
          allResolved = false
          continue
        }
        const applied = await applyRepair(finding, io)
        results.push({ ...finding, data: undefined, applied: applied.ok, outcome: applied.outcome })
        if (!applied.ok) allResolved = false
        if (!globals.json) process.stdout.write(`  ↳ ${applied.ok ? '✓' : '✗'} ${applied.outcome}\n`)
      }
      if (globals.json) {
        process.stdout.write(JSON.stringify({ ok: findings.length === 0 || allResolved, dryRun: Boolean(cmdOpts.dryRun), findings: results }, null, 2) + '\n')
      } else if (findings.length === 0) {
        process.stdout.write(`No repairs needed${services.length ? ` for: ${services.join(', ')}` : ''}.\n`)
      }
      finish(findings.length === 0 || allResolved ? EXIT.SUCCESS : EXIT.FAILURE)
    })

  program
    .command('tools')
    .description('List catalog tools')
    .option('--service <service>', 'Filter by service')
    .option('--risk <class>', 'Filter by static risk class (read|write|send|share|destructive)')
    .action((opts: { service?: string; risk?: string }) => {
      const globals = program.opts() as GlobalOpts
      let list = tools
      if (opts.service) list = list.filter((t) => t.service === opts.service)
      if (opts.risk) {
        list = list.filter((t) => staticRiskClass(t.service, t.action) === opts.risk)
      }
      const rows = list.map((t) => {
        const { path } = mcpNameToCliPath(t.name)
        return {
          name: t.name,
          service: t.service,
          action: t.action,
          actions: effectiveActions(t),
          risk: staticRiskClass(t.service, t.action),
          cli: `wslite ${t.service} ${path[0]}`,
          description: t.description,
        }
      })
      if (globals.json) {
        process.stdout.write(JSON.stringify({ tools: rows }, null, 2) + '\n')
      } else {
        for (const row of rows) {
          process.stdout.write(`${row.cli.padEnd(36)} ${row.risk.padEnd(12)} ${row.name}\n`)
        }
      }
      finish(EXIT.SUCCESS)
    })

  program
    .command('run')
    .description('Run a tool by MCP name')
    .argument('<mcpToolName>', 'e.g. tasks_list_tasklists')
    .allowUnknownOption(true)
    .allowExcessArguments(true)
    .action(async (mcpToolName: string) => {
      const globals = program.opts() as GlobalOpts
      const tool = findToolByName(tools, mcpToolName)
      if (!tool) {
        process.stderr.write(`Unknown tool: ${mcpToolName}\n`)
        finish(EXIT.USAGE)
      }
      const raw = mergeArgvFlags(tool, process.argv, globals)
      const code = await runTool(tool, raw, globals, deps)
      finish(code)
    })

  program
    .command('call')
    .description('Call a proxy action by service + action (catalog-resolved)')
    .argument('<service>', 'Service key')
    .argument('<action>', 'Proxy action name')
    .option('--tool <mcpName>', 'Disambiguate when multiple tools match')
    .option('--params-json <json|@file>', 'Parameters JSON')
    .option('--operations-file <path>', 'Batch operations file')
    // Accepted but hidden from default help (K21)
    .addOption(new Option('--raw').hideHelp())
    .action(async (service: string, action: string, opts: { tool?: string; paramsJson?: string; operationsFile?: string; raw?: boolean }) => {
      const globals = program.opts() as GlobalOpts
      const rawFlag = Boolean(opts.raw) || process.argv.includes('--raw')
      let matches = findToolsByAction(tools, service, action)
      if (opts.tool) matches = matches.filter((t) => t.name === opts.tool)

      if (matches.length === 0) {
        if (rawFlag) {
          if (env.WSLITE_ALLOW_RAW !== '1') {
            process.stderr.write('Raw mode requires WSLITE_ALLOW_RAW=1\n')
            finish(EXIT.USAGE)
          }
          const rawParams: Record<string, unknown> = {}
          if (opts.paramsJson || globals.paramsJson) {
            const src = opts.paramsJson ?? globals.paramsJson!
            const text = src.startsWith('@') ? readFileSync(src.slice(1), 'utf8') : src
            Object.assign(rawParams, JSON.parse(text))
          }
          if (opts.operationsFile) {
            rawParams.operations = JSON.parse(readFileSync(opts.operationsFile, 'utf8'))
          }
          if (globals.idempotencyKey) rawParams.idempotencyKey = globals.idempotencyKey
          const result = await executeRaw(service, action, rawParams, baseExecuteOpts(globals, deps))
          renderResult(result, { json: Boolean(globals.json), quiet: Boolean(globals.quiet) })
          finish(result.exitCode)
        }
        process.stderr.write(`Unknown action: ${service}.${action} (no catalog tool maps to this action)\n`)
        finish(EXIT.USAGE)
      }

      if (matches.length > 1 && !opts.tool) {
        process.stderr.write(
          `Ambiguous action ${service}.${action}; matching tools: ${matches.map((m) => m.name).join(', ')}. Pass --tool <mcpName>.\n`,
        )
        finish(EXIT.USAGE)
      }

      const tool = matches[0]
      const raw: Record<string, unknown> = {}
      if (opts.paramsJson) raw.paramsJson = opts.paramsJson
      else if (globals.paramsJson) raw.paramsJson = globals.paramsJson
      if (opts.operationsFile) raw.operationsFile = opts.operationsFile
      if (globals.idempotencyKey) raw.idempotencyKey = globals.idempotencyKey
      const code = await runTool(tool, raw, globals, deps)
      finish(code)
    })

  for (const [service, serviceTools] of byService) {
    const svc = program.command(service).description(`${service} tools`).exitOverride()
    for (const tool of serviceTools) {
      const { path } = mcpNameToCliPath(tool.name)
      const sub = svc.command(path[0]).description(tool.description).exitOverride()
      addToolFlags(sub, tool)
      sub.action(async (_opts: Record<string, unknown>, cmd: Command) => {
        const globals = program.opts() as GlobalOpts
        const raw = collectRawArgs(cmd, globals)
        const local = cmd.opts() as Record<string, unknown>
        if (local.paramsJson) raw.paramsJson = local.paramsJson
        if (local.operationsFile) raw.operationsFile = local.operationsFile
        const code = await runTool(tool, raw, globals, deps)
        finish(code)
      })
    }
  }

  return program
}

function mergeArgvFlags(tool: ToolSpec, argv: string[], globals: GlobalOpts): Record<string, unknown> {
  const idx = argv.findIndex((a) => a === tool.name || a.endsWith(tool.name))
  const slice = idx >= 0 ? argv.slice(idx + 1) : argv.slice(2)
  const raw: Record<string, unknown> = {}
  if (globals.paramsJson) raw.paramsJson = globals.paramsJson
  if (globals.idempotencyKey) raw.idempotencyKey = globals.idempotencyKey

  for (let i = 0; i < slice.length; i++) {
    const token = slice[i]
    if (!token.startsWith('--')) continue
    if (token === '--raw') continue
    const eq = token.indexOf('=')
    let key: string
    let value: string | boolean
    if (eq !== -1) {
      key = token.slice(2, eq)
      value = token.slice(eq + 1)
    } else {
      key = token.slice(2)
      const next = slice[i + 1]
      if (next && !next.startsWith('--')) {
        value = next
        i++
      } else {
        value = true
      }
    }
    const camel = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    raw[camel] = value
    raw[key] = value
  }
  return raw
}

export async function runCli(argv: string[], deps: ProgramDeps = {}): Promise<number> {
  const prog = buildProgram(deps)
  try {
    await prog.parseAsync(argv, { from: 'node' })
    return EXIT.SUCCESS
  } catch (error) {
    if (error instanceof CliExit) {
      deps.exit?.(error.code)
      return error.code
    }
    if (error instanceof CommanderError) {
      // help displayed or usage error
      if (error.code === 'commander.helpDisplayed' || error.code === 'commander.help') {
        return EXIT.SUCCESS
      }
      if (!deps.exit) {
        process.stderr.write((error.message || String(error)) + '\n')
      }
      deps.exit?.(EXIT.USAGE)
      return EXIT.USAGE
    }
    const message = error instanceof Error ? error.message : String(error)
    if (message.startsWith('exit:')) {
      const code = Number(message.slice(5))
      deps.exit?.(code)
      return code
    }
    if (!deps.exit) process.stderr.write(message + '\n')
    deps.exit?.(EXIT.FAILURE)
    return EXIT.FAILURE
  }
}
