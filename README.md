# Google Apps Script MCP

MCP servers exposing all Google Workspace services through Apps Script web app proxies. No OAuth dance per API call — Apps Script runs as **you**, using your Google identity automatically.

```
┌──────────┐   STDIO   ┌──────────────┐   HTTPS POST   ┌───────────────────┐
│ opencode │◄─────────►│  MCP Server   │──────────────►│ Apps Script Web App│──► Workspace APIs
│  (agent) │   JSON-RPC │  (local tsx)  │   JSON+token  │  script.google.com │
└──────────┘            └──────────────┘               └───────────────────┘
```

- **MCP Server**: TypeScript process using `@modelcontextprotocol/sdk`, communicates via STDIO
- **Apps Script Web App**: Deployed with `clasp`, runs as `USER_DEPLOYING` with bearer token auth
- **Security**: HTTPS transport, 48-char random token, rate limiting, input validation

## Packages (118 tools)

| Package | Tools | Batch | Key capabilities |
|---------|-------|-------|------------------|
| `drive` | 23 | ✅ | Full Drive CRUD: list, search, read, create, update, copy, move, share, trash, permissions |
| `gmail` | 31 | ✅ | Search, read, send (draft-first), reply, forward, drafts, labels, threads, trash |
| `calendar` | 10 | ✅ | List events, search, create/update/delete, free/busy, multi-calendar |
| `sheets` | 21 | ✅ | Create/read/write/append, formulas, formatting, charts, sort, freeze, merge, notes |
| `slides` | 17 | ✅ | Create, add/delete/duplicate/move slides, text, images, shapes, tables, auto-position, notes |
| `docs` | 16 | ✅ | Create/read, paragraphs, headings, lists, tables, images, page breaks, text formatting, headers/footers |

## Quick Start (one-time setup)

### Prerequisites

- **Node.js 20+**
- **Google account** with Workspace access
- **clasp** installed globally: `npm install -g @google/clasp`
- **jq** (for token parsing): `brew install jq`

### 1. Clone and build

```bash
git clone https://github.com/joe-broadhead/google-apps-script-mcp.git
cd google-apps-script-mcp
npm install
npm run build
```

### 2. Run setup script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The script will:
1. Authenticate with clasp (opens browser once)
2. Create 6 Apps Script projects (one per service)
3. Push code to all projects
4. Guide you through web app deployment (GUI step, 6×)
5. Collect deployment URLs and bootstrap tokens
6. Output ready-to-paste OpenCode config

### 3. Deploy web apps (GUI — required, cannot be automated)

For each service, the setup script will prompt you to:
```bash
cd packages/<service>/apps-script && clasp open
```
In the Apps Script editor that opens:
- **Deploy → New deployment → Type: Web app**
- **Execute as: Me (USER_DEPLOYING)**
- **Access: Anyone**

Paste each deployment URL back into the script. It will automatically bootstrap the auth token and generate your config.

### 4. Install the agent skill

```bash
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
```

### 5. Restart OpenCode

Source the generated `.env` file (or copy exports to `.zshrc`), add the printed config to `opencode.jsonc`, restart.

## Manual Setup (if you prefer step-by-step)

### Environment variables

For each service, set two env vars:

```bash
export GOOGLE_WORKSPACE_DRIVE_PROXY_URL="https://script.google.com/macros/s/.../exec"
export GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN="your-token-here"
# ... repeat for GMAIL, CALENDAR, SHEETS, SLIDES, DOCS
```

### Bootstrap tokens

After deploying each web app, bootstrap once:

```bash
curl -sL "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?bootstrap=1" | jq -r '.data.token'
```

The token is generated once and stored in Apps Script properties. The bootstrap endpoint only works once per deployment.

### OpenCode config

Add all 6 servers to `opencode.jsonc` under `mcpServers`:

```jsonc
{
  "mcpServers": {
    "google-drive": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/drive/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_DRIVE_PROXY_URL": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_URL}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN}"
      }
    },
    "google-gmail": { "..." },
    "google-calendar": { "..." },
    "google-sheets": { "..." },
    "google-slides": { "..." },
    "google-docs": { "..." }
  }
}
```

## Architecture

Each MCP server is a standalone STDIO process that calls its own Apps Script web app proxy. The web apps run as `USER_DEPLOYING` — your identity, your permissions. No service accounts, no OAuth refresh tokens.

```
packages/drive/src/index.ts  →  Drive Proxy  →  DriveApp
packages/gmail/src/index.ts  →  Gmail Proxy  →  GmailApp
packages/calendar/src/index.ts → Calendar Proxy → CalendarApp
packages/sheets/src/index.ts → Sheets Proxy → SpreadsheetApp
packages/slides/src/index.ts → Slides Proxy → SlidesApp
packages/docs/src/index.ts   →  Docs Proxy   →  DocumentApp
```

All Apps Script proxies share identical auth, rate limiting, and response patterns.

## Agent Skill

The included `google-workspace` skill provides LLMs with tool catalogs, numbered workflows, and safety rules. See `skills/google-workspace/SKILL.md` for the fast-start index and `references/` for deep dives.

```bash
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
```

## Development

```bash
npm run build        # Build all packages
npm run typecheck    # Type-check all packages
npm run dev:drive    # Run a single MCP server in dev mode
```

### Adding a new service

Copy from any existing package:
```bash
cp -r packages/sheets packages/new-service
# Update package.json, appsscript.json, tsconfig.json
# Create NewService.gs following the SheetsService.gs pattern
# Add schemas to shared/src/schemas.ts
# Create tools in src/tools/
```

## Quotas

| Limit | Value |
|-------|-------|
| Apps Script execution | 6 min per request |
| URL Fetch calls/day | 20,000 |
| Drive API quota | 10,000 req/100s/user |
| Rate limiting | 100 req/min per proxy |

## License

MIT — see [LICENSE](LICENSE)
