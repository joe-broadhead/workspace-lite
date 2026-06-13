# Google Apps Script MCP

MCP servers that expose Google Workspace services through Apps Script web app proxies. No OAuth dance per API call — Apps Script runs as you, using your Google identity automatically.

## Architecture

```
┌──────────┐   STDIO   ┌──────────────┐   HTTPS POST   ┌───────────────────┐
│ opencode │◄─────────►│  MCP Server   │──────────────►│ Apps Script Web App│──► DriveApp/GmailApp/...
│  (agent) │   JSON-RPC │  (local tsx)  │   JSON+token  │  script.google.com │
└──────────┘            └──────────────┘               └───────────────────┘
```

- **MCP Server**: TypeScript process using `@modelcontextprotocol/sdk`, communicates via STDIO
- **Apps Script Web App**: Deployed with `clasp`, runs as `USER_DEPLOYING` with shared bearer token auth
- **Security**: HTTPS transport, 48-char random token, input validation, content truncation

## Packages

| Package | Status | Tools | Description |
|---------|--------|-------|-------------|
| `packages/drive` | ✅ Live | 14 | Full Drive CRUD: list, search, read, create, update, copy, move, share, trash |
| `packages/gmail` | ✅ Live | 30 | Search, read, send, reply, forward, drafts, labels, trash |
| `packages/calendar` | ✅ Live | 9 | List events, search, create, update, delete, free/busy |
| `packages/sheets` | ✅ Live | 19 | Full Sheets: create, read/write/append, format, charts, sort, freeze, merge, notes, batch |
| `packages/slides` | ✅ Live | 14 | Full Slides: create, add/delete/duplicate/move slides, text, images, shapes, tables, notes, replace text, batch |

## Quick Start

### Prerequisites
- Node.js 20+
- Google account with Drive access
- `clasp` installed globally (`npm install -g @google/clasp`)

### 1. Install dependencies
```bash
npm install
```

### 2. Build
```bash
npm run build
```

### 3. Deploy the Apps Script proxy
```bash
# Login to Google
clasp login

# Deploy Drive proxy
cd packages/drive/apps-script
clasp push
```

### 4. Deploy as web app
1. Open the script in the Apps Script editor: `clasp open-script`
2. **Deploy** → **New deployment** → Type: **Web app**
3. Execute as: **Me**, Access: **Anyone**
4. Copy the deployment URL

### 5. Get the auth token
```bash
curl -sL "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?bootstrap=1" | jq -r '.data.token'
```

### 6. Set environment variables
```bash
export GOOGLE_WORKSPACE_DRIVE_PROXY_URL="https://script.google.com/macros/s/.../exec"
export GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN="your-token-here"
```

### 7. Add to OpenCode config
```jsonc
"google-drive": {
  "type": "local",
  "command": ["npx", "tsx", "/path/to/packages/drive/src/index.ts"],
  "environment": {
    "GOOGLE_WORKSPACE_DRIVE_PROXY_URL": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_URL}",
    "GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN}"
  }
}
```

## Development

```bash
npm run build          # Build all packages
npm run typecheck      # Type-check all packages
npm run dev:drive      # Run Drive MCP in dev mode
```

## OpenCode Skills

An agent skill is included to help LLMs use these tools effectively. The skill covers all 80+ tools with workflows for email triage, meeting prep, scheduling, spreadsheet creation, data analysis, and dashboards.

### Install

```bash
# Symlink into your OpenCode skills directory
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace

# Or copy
cp -r skills/google-workspace ~/.config/opencode/skills/
```

The skill will be auto-discovered on next OpenCode restart. Agents load it with `skill({ name: "google-workspace" })`. SKILL.md is the fast-start index; `references/` contains the full tool catalog, workflows, and safety rules.

## Adding a New Service

1. Create the package from the template:
```bash
cp -r template packages/new-service
# Update package.json name/description
# Create apps-script/ with appropriate OAuth scopes in appsscript.json
```

2. Implement `apps-script/Service.gs` following the `DriveService.gs` pattern
3. Create MCP tools in `src/tools/` following the drive pattern
4. Reuse `@google-apps-script-mcp/shared` for Zod schemas and response formatters

## Quotas

| Limit | Value |
|---|---|
| Apps Script execution | 6 min |
| URL Fetch calls/day | 20,000 |
| Drive API quota | 10,000 req/100s/user |

## License

MIT — see [LICENSE](LICENSE)
