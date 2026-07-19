# MCP Client Config

`scripts/client-config.mjs` generates MCP client configuration for exactly the services you installed — full suite, a profile, or an explicit list. Generation is pure and offline: it never reads `.env`, needs no Google credentials, and never contains token values.

```bash
node scripts/client-config.mjs                                  # OpenCode, all 8 services
node scripts/client-config.mjs --profile core                   # OpenCode, drive+gmail+calendar
node scripts/client-config.mjs --client claude-code --services drive,gmail
```

JSON is written to stdout (pipe or redirect it directly, e.g. `> .mcp.json`); insertion instructions go to stderr. Unknown client, profile, or service names fail with the valid options listed. `setup.sh` uses this generator for its config output, scoped to the services you selected.

## Clients

| `--client` | Output shape | Secrets handling |
|---|---|---|
| `opencode` (default) | `{"mcp": {...}}` for `opencode.jsonc` | `{env:VAR}` references — export your `.env` before starting OpenCode |
| `claude-code` | `{"mcpServers": {...}}` | bash wrapper sources the repo `.env` at launch |
| `claude-desktop` | `{"mcpServers": {...}}` | same wrapper |
| `cursor` | `{"mcpServers": {...}}` | same wrapper |

Every entry uses the canonical server name `google-<service>`. OpenCode entries include all eight env vars per service (URL, primary token, and the six class-scoped tokens) as `{env:...}` references.

## Inserting the config

**OpenCode** — merge the `mcp` object into your `opencode.jsonc` (e.g. `~/.config/opencode/opencode.jsonc`), then restart OpenCode.

**Claude Code** — save the output as `.mcp.json` in the project where you run Claude Code:

```bash
node scripts/client-config.mjs --client claude-code --profile core > /path/to/project/.mcp.json
```

or register servers individually with `claude mcp add-json google-drive '<entry-json>'`.

**Claude Desktop** — merge the `mcpServers` object into `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`), then restart the app.

**Cursor** — merge the `mcpServers` object into `~/.cursor/mcp.json` (or a project's `.cursor/mcp.json`).

## Requirements for mcpServers-style clients

The `mcpServers` entries launch `bash -c "set -a; . '<repo>/.env'; set +a; exec node '<repo>/packages/<svc>/dist/index.js'"`, so they need:

- a built repo (`npm run build`) — they run `dist/`, not `tsx`;
- the repo `.env` populated by setup;
- `bash` on PATH (Git Bash on Windows).

This keeps tokens out of client config files entirely: the values live only in `.env` and are read at server launch.

## Windows

For OpenCode on Windows (Git Bash/MSYS2), pass `--windows` and a Windows-style `--root` so the command array points at `tsx.cmd` with backslash paths — `setup.sh` does this automatically.

## Related

- [Installation](installation.md) — the full setup flow that produces `.env`
- [Diagnostics](../operations/diagnostics.md) — verify an install before wiring up clients
