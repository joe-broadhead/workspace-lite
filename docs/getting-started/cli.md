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
wslite doctor
wslite tools [--service <svc>] [--risk <class>]
wslite run <mcpToolName> …
wslite call <service> <action> [--params-json …] [--tool <mcpName>]
wslite tasks list-tasklists
wslite drive get-file --file-id …
```

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
