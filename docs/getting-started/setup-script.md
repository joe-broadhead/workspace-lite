# Setup Script

`scripts/setup.sh` is the one-shot automation that takes you from a fresh clone to a working 7-service deployment.

---

## What It Does

| Phase | Actions |
|-------|---------|
| **Prerequisites check** | Verifies `clasp` and `node` are installed |
| **clasp login** | Opens browser for Google authentication (once) |
| **Build** | `npm install && npm run build` &mdash; compiles shared package and all 7 services |
| **Project creation** | `clasp create --type standalone` for each of the 7 services with correct OAuth scopes and project titles |
| **Code push** | Pushes `Auth.gs`, `Code.gs`, `Response.gs`, and service-specific `.gs` files to each project |
| **Deployment guide** | Prints instructions for the 7 manual web app deployments |
| **Token bootstrap** | Collects deployment URLs, calls `?bootstrap=1` on each, writes tokens to `.env` |
| **Config generator** | Prints ready-to-paste `opencode.jsonc` JSON for all 7 MCP servers |
| **Skill command** | Prints the `ln -sf` command to install the `google-workspace` skill |

---

## Service Configuration

Each service gets its own project with service-specific OAuth scopes:

| Service | Project title | OAuth scopes |
|---------|---------------|--------------|
| Drive | Google Workspace Proxy - Drive | `drive`, `script.external_request` |
| Gmail | Google Workspace Proxy - Gmail | `gmail.modify`, `script.send_mail`, `script.external_request` |
| Calendar | Google Workspace Proxy - Calendar | `calendar`, `script.external_request` |
| Sheets | Google Workspace Proxy - Sheets | `spreadsheets`, `script.external_request` |
| Slides | Google Workspace Proxy - Slides | `presentations`, `script.external_request` |
| Docs | Google Workspace Proxy - Docs | `documents`, `script.external_request` |
| Tasks | Google Workspace Proxy - Tasks | `tasks`, `script.external_request` |

All projects use `runtimeVersion: V8`, `executeAs: USER_DEPLOYING`, and `access: ANYONE_ANONYMOUS`.

---

## Generated Output

### `.env` file

The script writes a `.env` file at the project root with all 14 primary environment variables:

```bash
# Generated on Fri Jun 13 2026 14:30:00 CDT

export GOOGLE_WORKSPACE_DRIVE_PROXY_URL="https://script.google.com/macros/s/<drive-deployment-id>/exec"
export GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN="<drive-proxy-token>"
export GOOGLE_WORKSPACE_GMAIL_PROXY_URL="https://script.google.com/macros/s/<gmail-deployment-id>/exec"
export GOOGLE_WORKSPACE_GMAIL_PROXY_TOKEN="<gmail-proxy-token>"
export GOOGLE_WORKSPACE_CALENDAR_PROXY_URL="https://script.google.com/macros/s/<calendar-deployment-id>/exec"
export GOOGLE_WORKSPACE_CALENDAR_PROXY_TOKEN="<calendar-proxy-token>"
export GOOGLE_WORKSPACE_SHEETS_PROXY_URL="https://script.google.com/macros/s/<sheets-deployment-id>/exec"
export GOOGLE_WORKSPACE_SHEETS_PROXY_TOKEN="<sheets-proxy-token>"
export GOOGLE_WORKSPACE_SLIDES_PROXY_URL="https://script.google.com/macros/s/<slides-deployment-id>/exec"
export GOOGLE_WORKSPACE_SLIDES_PROXY_TOKEN="<slides-proxy-token>"
export GOOGLE_WORKSPACE_DOCS_PROXY_URL="https://script.google.com/macros/s/<docs-deployment-id>/exec"
export GOOGLE_WORKSPACE_DOCS_PROXY_TOKEN="<docs-proxy-token>"
export GOOGLE_WORKSPACE_TASKS_PROXY_URL="https://script.google.com/macros/s/<tasks-deployment-id>/exec"
export GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN="<tasks-proxy-token>"
```

### OpenCode Config

The script prints a `mcpServers` block for `opencode.jsonc`:

```jsonc
"google-drive": {
  "type": "local",
  "command": ["npx", "tsx", "/path/to/packages/drive/src/index.ts"],
  "environment": {
    "GOOGLE_WORKSPACE_DRIVE_PROXY_URL": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_URL}",
    "GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN}"
  }
},
"google-gmail": { /* ... */ },
"google-calendar": { /* ... */ },
"google-sheets": { /* ... */ },
"google-slides": { /* ... */ },
"google-docs": { /* ... */ }
"google-tasks": { /* ... */ }
```

---

## Rerunning for Individual Services

The script is idempotent &mdash; it skips services that already have a valid `.clasp.json` with a non-placeholder `scriptId`.

### Scenario: Add a service you skipped

```bash
./scripts/setup.sh
```

Press Enter for services already configured. Paste the new deployment URL when prompted for the missing service.

### Scenario: Re-bootstrap a token

If you lost a token, clear the script properties in the Apps Script editor:

1. Open the project: `cd packages/drive/apps-script && clasp open`
2. **Project Settings** :material-arrow-right: **Script Properties**
3. Delete both `PROXY_AUTH_TOKEN` and `PROXY_BOOTSTRAPPED`
4. Read the setup key from the untracked `BootstrapSecret.gs` file or regenerate it with `scripts/setup.sh`
5. Call the bootstrap endpoint again:

```bash
curl -sL "https://script.google.com/macros/s/<deployment-id>/exec?bootstrap=1&setupKey=<bootstrap-setup-key>" | jq -r '.data.token'
```

Update the token in `.env` and re-source.

### Scenario: Re-deploy after pushing code changes

`clasp push` does not change the deployment &mdash; the web app picks up the latest code automatically. If you need a new deployment URL (e.g., after changing app access), deploy again from the editor and re-bootstrap.

---

## Troubleshooting

### clasp login fails

| Symptom | Fix |
|---------|-----|
| Browser doesn&rsquo;t open | Run `clasp login --no-localhost` for a manual auth flow with a code paste |
| &ldquo;Insufficient permissions&rdquo; | Ensure the Google account has Apps Script enabled (free for all Google accounts) |
| clasp not found | `npm install -g @google/clasp` |

### Project creation fails

| Symptom | Fix |
|---------|-----|
| `Could not create project` | Verify `clasp login` succeeded. Try manually: `cd packages/drive/apps-script && clasp create --type standalone --title "Test"` |
| `.clasp.json` has `YOUR_SCRIPT_ID` | Delete the file and re-run `./scripts/setup.sh` |

### Deployment issues

| Symptom | Fix |
|---------|-----|
| &ldquo;Sorry, unable to open file at this time&rdquo; | Wait a few seconds after pushing; Apps Script needs time to process |
| Web app not responding | Verify deployment type is **Web app**, not API executable |
| 403 / 401 from proxy | Check that **Execute as: Me** is set and **Access: Anyone (anonymous)** is set |
| &ldquo;Script function not found: doGet&rdquo; | Push failed. Run `cd packages/<service>/apps-script && clasp push --force` |

### Token bootstrap fails

| Symptom | Fix |
|---------|-----|
| `"FORBIDDEN"`: Bootstrap already completed | The token was already generated. Clear script properties and re-bootstrap (see above) |
| `"UNAUTHORIZED"`: Invalid or missing bootstrap setup key | Include `setupKey=<bootstrap-setup-key>` from the untracked `BootstrapSecret.gs` file |
| `"BAD_REQUEST"`: Missing action field | You called the POST endpoint instead of GET. Use `?bootstrap=1&setupKey=<bootstrap-setup-key>` as query parameters |
| Token not returned | The URL may already be bootstrapped. Check `.env` for existing tokens |

### OpenCode doesn&rsquo;t see the tools

| Symptom | Fix |
|---------|-----|
| Tools not listed | Verify `.env` is sourced, OpenCode was restarted, and `opencode.jsonc` has the `mcpServers` block |
| `GOOGLE_WORKSPACE_*` not found | Run `source /path/to/.env` before starting OpenCode, or add exports to `.zshrc` |
| Port / STDIO error | The MCP server process failed to start. Check logs with `npx tsx packages/drive/src/index.ts` directly |

!!! tip "Run a server directly"
    To test an MCP server in isolation, source `.env` and run:
    ```bash
    npx tsx packages/drive/src/index.ts
    ```
    The server starts and listens on STDIO. Send a JSON-RPC `tools/list` request to verify tool registration.
