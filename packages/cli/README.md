# @workspace-lite/cli (`wslite`)

Monorepo-local CLI for Google Workspace tools via the same Apps Script proxy path as MCP.

**Not published to public npm** (K16). Install via workspace package.

## Usage

```bash
# after monorepo build
npx wslite doctor
npx wslite tools
npx wslite tasks list-tasklists --json
npx wslite run tasks_create_task --tasklist-id ID --title "Hi" --json
npx wslite call tasks tasksList --params-json '{"tasklistId":"..."}' --json
```

Global flags: `--json`, `--yes`/`-y`, `--quiet`/`-q`, `--verbose`/`-v`, `--idempotency-key`, `--params-json`.

Confirmation for send/share/destructive uses interactive prompt or `--yes` (never a `--confirm` flag). Batch injects `confirm` into each gated op's params.

## Env

Same as MCP: `GOOGLE_WORKSPACE_<SERVICE>_PROXY_URL` and `…_PROXY_TOKEN` (plus optional class-scoped tokens).

Raw uncatalogued calls require `WSLITE_ALLOW_RAW=1` and `--raw` (not shown in default help).
