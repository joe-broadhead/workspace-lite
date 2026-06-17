# Setup Script

`scripts/setup.sh` is the one-shot automation that takes you from a fresh clone to a working 8-service deployment.

---

## What It Does

| Phase | Actions |
|-------|---------|
| **Prerequisites check** | Verifies `clasp` and `node` are installed |
| **clasp login** | Opens browser for Google authentication (once) |
| **Build** | `npm ci && npm run build` when `package-lock.json` is present; compiles shared package and all 8 services |
| **Project creation** | Reuses an existing project with the expected title, or runs `clasp create --type standalone` for each missing service |
| **Code push** | Pushes `Auth.gs`, `Code.gs`, `Response.gs`, and service-specific `.gs` files to each project |
| **Deployment guide** | Prints Apps Script editor URLs and instructions for the 8 manual web app deployments |
| **Token bootstrap** | Collects deployment URLs, posts each setup key as JSON, appends successful token entries to `.env` |
| **Config generator** | Prints ready-to-paste `opencode.jsonc` JSON for all 8 MCP servers under `mcp` |
| **Skill commands** | Prints `ln -sf` commands to install the `google-workspace` usage skill and `workspace-lite-installer` operator skill |

Run `./scripts/setup.sh --dry-run` to validate prerequisites, install dependencies, build, and preview project/config output without creating Apps Script projects, generating `BootstrapSecret.gs`, prompting for deployment URLs, or changing `.env`.

---

## Service Configuration

Each service gets its own project with service-specific OAuth scopes:

| Service | Project title | OAuth scopes |
|---------|---------------|--------------|
| Drive | Google Workspace Proxy - Drive | `drive`, `script.external_request` |
| Gmail | Google Workspace Proxy - Gmail | `gmail.modify`, `gmail.settings.basic`, `script.send_mail`, `script.external_request` |
| Calendar | Google Workspace Proxy - Calendar | `calendar`, `script.external_request` |
| Sheets | Google Workspace Proxy - Sheets | `spreadsheets`, `script.external_request` |
| Slides | Google Workspace Proxy - Slides | `presentations`, `script.external_request` |
| Docs | Google Workspace Proxy - Docs | `documents`, `script.external_request` |
| Tasks | Google Workspace Proxy - Tasks | `tasks`, `script.external_request` |
| Forms | Google Workspace Proxy - Forms | `forms`, `spreadsheets`, `script.external_request` |

All projects use `runtimeVersion: V8`, `executeAs: USER_DEPLOYING`, and `access: ANYONE_ANONYMOUS`.

---

## Generated Output

### `.env` file

When token bootstrap succeeds, the script appends export lines to `.env` at the project root. A complete bootstrap produces all 16 primary environment variables:

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
export GOOGLE_WORKSPACE_FORMS_PROXY_URL="https://script.google.com/macros/s/<forms-deployment-id>/exec"
export GOOGLE_WORKSPACE_FORMS_PROXY_TOKEN="<forms-proxy-token>"
```

If you skip all deployment URL prompts, or if every bootstrap attempt fails, `.env` is left unchanged. If a service token already exists in `.env`, setup skips that service instead of consuming bootstrap again.

### OpenCode Config

The script prints entries for the top-level `mcp` block in `opencode.jsonc`:

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
"google-docs": { /* ... */ },
"google-tasks": { /* ... */ },
"google-forms": { /* ... */ }
```

---

## Manual Deployment Step

The script intentionally pauses for Apps Script editor deployments. For each printed editor URL:

1. Open the URL.
2. Click **Deploy → New deployment**.
3. Click **Select type** or the gear icon and choose **Web app**.
4. Set **Execute as** to **Me**.
5. Set **Who has access** to **Anyone**.
6. Click **Deploy** and authorize scopes if prompted.
7. Copy the **Web app URL** ending in `/exec`.
8. Paste that URL back into the setup prompt.

Do not use `clasp deploy` as a replacement for the first GUI deployment. The CLI can refresh a known deployment later, but the install flow needs a web app deployment with visibly confirmed execute-as, access settings, and OAuth scopes.

If you are not ready to deploy all services, press Enter at the prompt for skipped services. The script leaves `.env` unchanged for skipped or failed bootstraps, and you can rerun `./scripts/setup.sh` later.

If an agent is helping with setup after you complete the GUI deployments, it can recover the `/exec` URLs with `clasp deployments`. The correct row is the versioned deployment (`@1`, `@2`, etc.), not `@HEAD`; the URL is `https://script.google.com/macros/s/<deployment-id>/exec`.

---

## Rerunning for Individual Services

The script is idempotent &mdash; it skips services that already have a valid `.clasp.json` with a non-placeholder `scriptId`, and it reuses existing Apps Script projects with the canonical service title before creating a new project. This keeps aborted setup retries from creating duplicate projects.

### Scenario: Add a service you skipped

```bash
bash ./scripts/setup.sh
```

Press Enter for services already configured. Paste the new deployment URL when prompted for the missing service.

### Scenario: Re-bootstrap or rotate a token

If you lost a token, rerun `./scripts/setup.sh`, paste the service `/exec` URL, and follow the prompt to rotate the primary token with the local setup key. Rotation invalidates the previous primary token and writes the new one to `.env`.

You can also rotate manually:

1. Read the setup key from the untracked `BootstrapSecret.gs` file or regenerate it with `scripts/setup.sh`.
2. Call the rotation endpoint:

```bash
TOKEN_RESPONSE="$(curl -sL -X POST -H 'Content-Type: application/json' -d '{"setupKey":"<bootstrap-setup-key>","rotate":true}' "https://script.google.com/macros/s/<deployment-id>/exec")"
TOKEN_RESPONSE="$TOKEN_RESPONSE" node -e 'const fs = require("fs"); const r = JSON.parse(process.env.TOKEN_RESPONSE); if (!r.success) throw new Error(r.error?.message || "Bootstrap failed"); fs.appendFileSync(".env", `export GOOGLE_WORKSPACE_<SERVICE>_PROXY_TOKEN=${JSON.stringify(r.data.token)}\n`)'
```

Update the matching proxy URL in `.env` if it changed, then re-source.

### Scenario: Re-deploy after pushing code changes

`clasp push` updates the Apps Script project source, but a versioned web app deployment keeps serving its pinned version until you refresh it. After the user has created the initial GUI web app deployment, an agent or maintainer can refresh the same deployment URL from the CLI:

```bash
cd packages/<service>/apps-script
clasp push --force
VERSION_OUTPUT="$(clasp version "Refresh web app deployment $(date +%F)")"
VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | sed -n 's/.*version \([0-9][0-9]*\).*/\1/p')"
clasp deployments
clasp redeploy "<existing-versioned-deployment-id>" -V "$VERSION" -d "Refresh web app deployment $(date +%F)"
```

If the code change adds or changes Google OAuth scopes, the user must open the Apps Script editor, review the new scope prompt, authorize it, and then refresh/redeploy. Use a new deployment URL only when intentionally changing web app access or replacing a broken deployment.

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
| Google access denied HTML page | Redeploy from the Apps Script editor with **Deploy → New deployment → Web app**. Do not use `clasp deploy` for initial setup. |
| &ldquo;Script function not found: doGet&rdquo; | Push failed. Run `cd packages/<service>/apps-script && clasp push --force` |

### Token bootstrap fails

| Symptom | Fix |
|---------|-----|
| `"FORBIDDEN"`: Bootstrap already completed | The token was already generated. Rerun setup and accept the rotation prompt if the token is missing from `.env` |
| `"UNAUTHORIZED"`: Invalid or missing bootstrap setup key | POST JSON with `{"setupKey":"<bootstrap-setup-key>"}` from the untracked `BootstrapSecret.gs` file |
| `"BAD_REQUEST"`: Missing action field | The request was parsed as a normal proxy call. For bootstrap, POST a JSON body containing only `setupKey` |
| Token not returned | The URL may already be bootstrapped. Check `.env` for existing tokens |

### OpenCode doesn&rsquo;t see the tools

| Symptom | Fix |
|---------|-----|
| Tools not listed | Verify `.env` is sourced, OpenCode was restarted, and `opencode.jsonc` has the top-level `mcp` block |
| `GOOGLE_WORKSPACE_*` not found | Run `source /path/to/.env` before starting OpenCode, or add exports to `.zshrc` |
| Port / STDIO error | The MCP server process failed to start. Check logs with `npx tsx packages/drive/src/index.ts` directly |

!!! tip "Run a server directly"
    To test an MCP server in isolation, source `.env` and run:
    ```bash
    npx tsx packages/drive/src/index.ts
    ```
    The server starts and listens on STDIO. Send a JSON-RPC `tools/list` request to verify tool registration.
