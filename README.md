```
                      __                                 ___ __     
 _      ______  _____/ /___________  ____ _________     / (_) /____ 
| | /| / / __ \/ ___/ //_/ ___/ __ \/ __ `/ ___/ _ \   / / / __/ _ \
| |/ |/ / /_/ / /  / ,< (__  ) /_/ / /_/ / /__/  __/  / / / /_/  __/
|__/|__/\____/_/  /_/|_/____/ .___/\__,_/\___/\___/  /_/_/\__/\___/ 
                           /_/                                        

    MCP servers for Google Workspace.
    Apps Script runs as you. Zero OAuth per call.
```

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

## Packages

| Package | Tools | Batch | Key capabilities |
|---------|-------|-------|------------------|
| `drive` | 44 | ✅ | Full Drive CRUD: list, search, read, create, update, copy, move, share, trash, permissions, parent management, folder paths, export, comments/replies, revisions, shared drives, changes |
| `gmail` | 39 | ✅ | Search, read, send (draft-first), reply, forward, drafts, labels, threads, trash, attachments, batch modify, filters, vacation responder |
| `calendar` | 22 | ✅ | List events, search, create/update/delete, free/busy, multi-calendar, settings, secondary calendars, Meet links, event move, colors, respond |
| `sheets` | 27 | ✅ | Create/read/write/append, formulas, formatting, charts, sort, freeze, merge, notes, data validation, conditional formatting, row ops |
| `slides` | 19 | ✅ | Create, add/delete/duplicate/move slides, text, images, shapes, tables, auto-position, notes, backgrounds, lines |
| `docs` | 17 | ✅ | Create/read, paragraphs, headings, lists, tables, images, page breaks, text formatting, headers/footers, JSON export |
| `tasks` | 13 | ✅ | Task lists and tasks: list/get/create/update/delete, move tasks, clear completed |
| `forms` | 16 | ✅ | Create/manage forms, add/update/move/delete items, response destinations, response reads/deletes |
| **Total** | **197** | all 8 | |

## Quick Start (one-time setup)

### Prerequisites

- **Node.js 20+**
- **Google account** with Workspace access
- **clasp** installed globally: `npm install -g @google/clasp`
- **jq** (for token parsing): `brew install jq`

### 1. Clone and build

```bash
git clone https://github.com/joe-broadhead/workspace-lite.git
cd workspace-lite
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
2. Create 8 Apps Script projects (one per service)
3. Push code to all projects
4. Guide you through web app deployment (GUI step, 8×)
5. Collect deployment URLs and bootstrap tokens
6. Output ready-to-paste OpenCode config

### 3. Deploy web apps (GUI — required)

For each service, the setup script will prompt you to:
```bash
cd packages/<service>/apps-script && clasp open
```
In the Apps Script editor that opens:
- **Deploy → New deployment → Type: Web app**
- **Execute as: Me (USER_DEPLOYING)**
- **Access: Anyone (anonymous)**

Paste each deployment URL back into the script. It auto-bootstraps tokens and generates your config.

### 4. Install the agent skill

```bash
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
```

### 5. Restart OpenCode

Source the generated `.env` file (or copy exports to `.zshrc`), add the printed config to `opencode.jsonc`, restart.

## Architecture

Each MCP server is a standalone STDIO process that calls its own Apps Script web app proxy. The web apps run as `USER_DEPLOYING` — your identity, your permissions.

```
packages/drive/src/index.ts  →  Drive Proxy  →  DriveApp
packages/gmail/src/index.ts  →  Gmail Proxy  →  GmailApp
packages/calendar/src/index.ts → Calendar Proxy → CalendarApp
packages/sheets/src/index.ts → Sheets Proxy → SpreadsheetApp
packages/slides/src/index.ts → Slides Proxy → SlidesApp
packages/docs/src/index.ts   →  Docs Proxy   →  DocumentApp
packages/tasks/src/index.ts  → Tasks Proxy   →  Tasks API
packages/forms/src/index.ts  → Forms Proxy   →  FormApp
```

All Apps Script proxies share identical auth, rate limiting, and response patterns.

## Agent Skill

The included `google-workspace` skill provides LLMs with tool catalogs, numbered workflows, and safety rules.

```bash
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
```

See `skills/google-workspace/SKILL.md` for the fast-start index and `references/` for deep dives.

## Documentation

Full docs at [workspace-lite docs](https://joe-broadhead.github.io/workspace-lite/):

- [Installation](https://joe-broadhead.github.io/workspace-lite/getting-started/installation/)
- [Quickstart](https://joe-broadhead.github.io/workspace-lite/getting-started/quickstart/)
- [Service guides](https://joe-broadhead.github.io/workspace-lite/services/drive/)
- [Architecture](https://joe-broadhead.github.io/workspace-lite/architecture/overview/)
- [Agent workflows](https://joe-broadhead.github.io/workspace-lite/skill/workflows/)

```bash
mkdocs build --strict  # Build docs locally
mkdocs serve            # Preview at http://localhost:8000
```

## Development

```bash
npm run build        # Build all packages
npm run typecheck    # Type-check all packages
npm run lint         # Strict unused/type gate
npm test             # Run repository tests
npm run audit        # Fail on moderate+ npm advisories
npm run validate:architecture  # Check service registry, action registry, and generated proxy shell
npm run generate:proxy-shell   # Regenerate service Code.gs files from service metadata
```

### Adding a new service

Copy from any existing package:
```bash
cp -r packages/sheets packages/new-service
# Update package.json, appsscript.json, tsconfig.json
# Create Service.gs following the SheetsService.gs pattern
# Add schemas to shared/src/schemas.ts
# Create tools in src/tools/
```

## Quotas

| Limit | Value |
|-------|-------|
| Apps Script execution | 6 min per request |
| URL Fetch calls/day | 20,000 |
| Rate limiting | 100 req/min per proxy |

## License

MIT — see [LICENSE](LICENSE)
