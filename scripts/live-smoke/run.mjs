#!/usr/bin/env node
/**
 * Private live smoke harness (JOE-160).
 *
 * Drives the wslite CLI against the maintainer's own Apps Script deployments.
 * Opt-in only: requires a configured .env and must never run in public CI.
 *
 * Usage:
 *   node scripts/live-smoke/run.mjs [--services tasks,forms,...] [--self-email you@example.com]
 *                                   [--prefix wslite-smoke] [--out .smoke] [--pace 5000] [--keep]
 *
 * Safety model (non-negotiable, enforced here):
 * - Every created artifact name carries the run prefix; mutations only target captured IDs.
 * - Send-class Gmail steps run only when --self-email is provided, and every recipient-like
 *   param is verified to equal that address before the call is made.
 * - Evidence output is sanitized: tool names, pass/fail, error codes, correlationIds — never
 *   payload contents, subjects, bodies, or file names beyond the run prefix.
 * - Cleanup always runs (even after failures) and is verified: zero *active* prefixed
 *   artifacts, including container listings (calendars, tasklists, drafts, filters).
 *   Drive deletes are trash-only by design; trashed leftovers are acceptable.
 */
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CLI = join(root, 'packages', 'cli', 'dist', 'index.js')

const RECIPIENT_KEYS = new Set(['to', 'cc', 'bcc', 'guests', 'email', 'forward'])
const SERVICE_ORDER = ['tasks', 'forms', 'calendar', 'slides', 'docs', 'sheets', 'gmail', 'drive']

function parseArgs(argv) {
  const args = { services: SERVICE_ORDER, prefix: `wslite-smoke-${Date.now().toString(36)}`, out: '.smoke', pace: 5000, keep: false, selfEmail: '' }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--services') args.services = argv[++i].split(',').map((s) => s.trim()).filter(Boolean)
    else if (a === '--prefix') args.prefix = argv[++i]
    else if (a === '--out') args.out = argv[++i]
    else if (a === '--pace') args.pace = Number(argv[++i])
    else if (a === '--keep') args.keep = true
    else if (a === '--self-email') args.selfEmail = argv[++i]
    else throw new Error(`Unknown argument: ${a}`)
  }
  const unknown = args.services.filter((s) => !SERVICE_ORDER.includes(s))
  if (unknown.length) throw new Error(`Unknown services: ${unknown.join(', ')}`)
  return args
}

function runCliOnce(tool, params, gated) {
  return new Promise((resolve) => {
    const argv = [CLI, 'run', tool, '--params-json', JSON.stringify(params), '--json']
    if (gated) argv.push('--yes')
    const child = spawn('node', argv, { cwd: root })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('close', (code) => {
      try {
        resolve({ code, body: JSON.parse(out) })
      } catch {
        resolve({ code, body: { ok: false, error: { code: 'HARNESS_PARSE', message: err.slice(0, 200) } } })
      }
    })
  })
}

export function assertRecipientsSafe(params, selfEmail) {
  for (const [key, value] of Object.entries(params)) {
    if (!RECIPIENT_KEYS.has(key) || typeof value !== 'string' || !value.includes('@')) continue
    const recipients = value.split(',').map((r) => r.trim()).filter(Boolean)
    for (const recipient of recipients) {
      if (recipient !== selfEmail) {
        throw new Error(`Refusing ${key}=${recipient}: send/share recipients must equal --self-email`)
      }
    }
  }
}

async function runCli(tool, params, { gated = false, pace, selfEmail }) {
  assertRecipientsSafe(params, selfEmail)
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { code, body } = await runCliOnce(tool, params, gated)
    if (body?.error?.code === 'RATE_LIMITED') {
      await delay(70_000)
      continue
    }
    await delay(pace)
    return { code, body }
  }
  return { code: 1, body: { ok: false, error: { code: 'RATE_LIMITED', message: 'still rate limited after retries' } } }
}

function pickPath(value, pick, ctx) {
  if (typeof pick === 'function') return pick(value, ctx)
  return pick.split('.').reduce((acc, key) => (acc == null ? acc : acc[/^\d+$/.test(key) ? Number(key) : key]), value)
}

async function runSteps(steps, ctx, record, options) {
  for (const step of steps) {
    const skip = step.skip?.(ctx)
    if (skip) {
      record(step.tool, 'SKIP', skip)
      continue
    }
    let result
    let attemptsLeft = (step.retryUntilFound ?? 0) + 1
    do {
      result = await runCli(step.tool, step.params(ctx), { gated: step.gated, ...options })
      attemptsLeft--
      if (step.retryUntilFound && result.body.ok && step.save && pickPath(result.body, step.save.pick, ctx) == null && attemptsLeft > 0) {
        await delay(8_000)
        continue
      }
      break
    } while (attemptsLeft > 0)

    const { body } = result
    const expected = step.expect ?? 'ok'
    const failureNote = body.error ? `${body.error.code}${body.error.correlationId ? ` corr=${body.error.correlationId}` : ''}` : ''
    if (expected === 'ok') {
      if (body.ok) {
        if (step.save) {
          const value = pickPath(body, step.save.pick, ctx)
          if (value == null) {
            record(step.tool, 'FAIL', `expected value at ${step.save.pick} missing`)
            continue
          }
          ctx[step.save.key] = value
        }
        record(step.tool, 'PASS', step.note ?? '')
      } else {
        record(step.tool, 'FAIL', failureNote)
      }
    } else if (body.error?.code === expected) {
      record(step.tool, 'PASS', `expected ${expected}`)
    } else {
      record(step.tool, 'FAIL', `expected ${expected}, got ${body.ok ? 'ok' : failureNote}`)
    }
  }
}

export async function main() {
  const args = parseArgs(process.argv)
  const outDir = join(root, args.out, new Date().toISOString().replace(/[:.]/g, '-'))
  mkdirSync(outDir, { recursive: true })
  const matrixPath = join(outDir, 'matrix.tsv')
  writeFileSync(matrixPath, 'service\ttool\tresult\tnote\n')

  const summary = { prefix: args.prefix, services: {}, cleanup: {}, started: new Date().toISOString() }
  const options = { pace: args.pace, selfEmail: args.selfEmail }

  for (const service of SERVICE_ORDER.filter((s) => args.services.includes(s))) {
    const { suite } = await import(`./suites/${service}.mjs`)
    const ctx = { prefix: args.prefix, selfEmail: args.selfEmail }
    const counts = { PASS: 0, FAIL: 0, SKIP: 0 }
    const record = (tool, result, note) => {
      counts[result]++
      appendFileSync(matrixPath, `${service}\t${tool}\t${result}\t${note}\n`)
      console.log(`[${service}] ${tool}: ${result}${note ? ` (${note})` : ''}`)
    }
    try {
      await runSteps(suite.steps, ctx, record, options)
    } finally {
      if (!args.keep) await runSteps(suite.cleanup ?? [], ctx, record, options)
    }
    const verifyFailures = []
    for (const check of suite.verify ?? []) {
      if (args.keep) break
      const { body } = await runCli(check.tool, check.params(ctx), { gated: false, ...options })
      const leftovers = body.ok ? check.leftovers(body, ctx) : -1
      if (leftovers !== 0) verifyFailures.push(`${check.tool}: ${leftovers < 0 ? 'check failed' : `${leftovers} active leftovers`}`)
    }
    summary.services[service] = counts
    summary.cleanup[service] = args.keep ? 'skipped (--keep)' : verifyFailures.length ? verifyFailures : 'clean'
  }

  summary.finished = new Date().toISOString()
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(summary, null, 2))
  console.log(`\nEvidence: ${outDir}`)
  const failed = Object.values(summary.services).some((c) => c.FAIL > 0)
    || Object.values(summary.cleanup).some((v) => Array.isArray(v))
  console.log(failed ? 'SMOKE: FAIL' : 'SMOKE: PASS')
  process.exitCode = failed ? 1 : 0
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error('Fatal:', error.message)
    process.exitCode = 1
  })
}
