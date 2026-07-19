# CLI (`wslite`)

The monorepo package `@workspace-lite/cli` exposes bin **`wslite`** (optional alias `workspace-lite`). It is a second frontend over the same catalog, Zod schemas, risk resolution, and `createProxyClient` path as the MCP servers — not a parallel Google auth stack.

Monorepo-local only for now (not published to public npm).

## Build and run

```bash
npm install
npm run build
node packages/cli/dist/index.js --help
# or, after workspace install links bins:
# npx wslite --help
```

## Environment

Same as MCP: for each service, set `GOOGLE_WORKSPACE_<SERVICE>_PROXY_URL` and `GOOGLE_WORKSPACE_<SERVICE>_PROXY_TOKEN` (plus optional class-scoped tokens). Optional dotenv load of repo `.env` is supported by operator shells; the CLI itself reads `process.env`.

## Commands

```text
wslite doctor [--live] [--deployments]
wslite repair [--dry-run] [--service <svc>]
wslite tools [--service <svc>] [--risk <class>]
wslite run <mcpToolName> …
wslite call <service> <action> [--params-json …] [--tool <mcpName>]
wslite tasks list-tasklists
wslite drive get-file --file-id …
```

## Doctor

`wslite doctor` checks env presence per service (URL + tokens; names only, never values). Partial installs (`setup.sh --profile`/`--services`) are first-class: a service with no env vars at all is reported as *not installed* and never fails doctor; a service with *some* vars set was clearly intended, so incomplete config is a real failure. Add `--live` to also probe each configured service against its deployed proxy:

- **health** — unauthenticated GET on the proxy URL; verifies the deployment answers, returns valid JSON, and identifies as the *right* service (a URL wired to another service's proxy is reported as `service-mismatch`).
- **auth** — one cheap authenticated read through the normal client path. Services without zero-argument reads are verified via a parameter-validation response, which the proxy only returns after accepting the token.

Each failing service gets an actionable hint (redeploy, fix URL wiring, rotate token, or wait out a rate limit) with a correlationId for Apps Script log lookup where available.

Add `--deployments` (requires a configured repo checkout with `clasp` logged in) to compare the deployment ID in each `.env` URL against `clasp deployments`:

- **current** — the URL points at the highest versioned deployment.
- **stale** — a newer versioned deployment exists. Remember: **pushed source is not live** until the deployment the URL points at is updated (`deploy-single.sh` / `deploy-all.sh` handle this).
- **head** — the URL points at `@HEAD`; MCP traffic must use versioned `/exec` deployments.
- **not-found / malformed-url** — the `.env` URL doesn't match any listed deployment.
- **clasp-unavailable** — clasp missing, not logged in, or no `.clasp.json`; the check degrades gracefully and does not fail doctor.

Deployment IDs are fingerprinted in output (first 10 characters), never printed in full. Exit code is 0 only when every service is configured and, with `--live`/`--deployments`, ready and current. Use `--json` for machine-readable output.

See [Diagnostics](../operations/diagnostics.md) for when to run which check, full status interpretation tables, and redaction-safe support guidance.

## Repair

`wslite repair` turns doctor-style diagnoses of common install drift into guided fixes. It detects: CRLF or malformed `.env` entries, missing `.clasp.json` (recoverable when clasp lists the canonical project by title), missing tokens (recoverable via the bootstrap endpoint when `BootstrapSecret.gs` exists locally), failing health probes, and stale/`@HEAD`/unknown deployments.

- Safe file writes (`.env` LF normalization, `.clasp.json` recovery, token append) run only after per-finding confirmation (`--yes` accepts them non-interactively).
- **Token rotation is never automatic**: if bootstrap was already consumed, rotation additionally requires an interactive prompt — `--yes` alone will not rotate, and non-interactive runs get manual instructions instead.
- Everything else (redeploys, missing bootstrap secrets, malformed `.env` lines that may contain secrets) gets exact manual commands rather than automation.
- `--dry-run` prints findings and proposals without changing anything; `--service <svc>` limits scope; output follows doctor's redaction rules (fingerprinted IDs, no secrets or URLs).

Exit code is 0 only when nothing needs repair or every finding was repaired. See [Diagnostics](../operations/diagnostics.md) for when to use repair vs rerunning setup.

Global flags: `--json`, `--yes`/`-y`, `--quiet`/`-q`, `--verbose`/`-v`, `--idempotency-key`, `--params-json`.

### Confirmation

- Schema key `confirm` is **not** a CLI flag.
- Interactive prompt or `--yes` injects `confirm: true` for send/share/destructive actions.
- Batch: confirmation walks each op and injects `params.confirm` on gated nested ops (outer batch confirm is not enough).
- Interactive batch prompts show **summary only** (index, action, risk) — never full params/PII.

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Hard failure |
| 2 | Confirmation required/refused |
| 3 | Partial batch success |
| 4 | Usage / parse error |

### Raw call (debug only)

`wslite call` refuses uncatalogued actions by default. Advanced operators may pass `--raw` **only** when `WSLITE_ALLOW_RAW=1`. Raw mode still runs confirm resolution; it is omitted from default help.

## Related

- Design: `docs/project/cli-mcp-parity-design.md`
- Package README: `packages/cli/README.md`
