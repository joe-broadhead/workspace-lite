# Installation

Complete setup of all 8 Google Workspace MCP servers, including the required manual Apps Script web app deployments.

!!! tip "Agent-assisted install"
    This repo includes a `workspace-lite-installer` skill for OpenCode agents. Agents can run local setup commands, `clasp push`, and refresh existing deployments, but the user must review OAuth scopes and verify initial web app deployment settings in the Apps Script GUI.

## Prerequisites

| Requirement | Version / Command | Notes |
|-------------|-------------------|-------|
| Node.js | 20+ | `node --version` |
| clasp | latest | `npm install -g @google/clasp` |
| curl | any modern version | Included with macOS and Git Bash; used for token bootstrap |
| Google account | &mdash; | With access to the Workspace services you plan to use |

Windows users should run setup from Git Bash or MSYS2. Native PowerShell can run
the MCP servers, but the installer and deployment helper scripts expect a bash
environment.

!!! tip "Verify prerequisites"
    ```bash
    node --version   # ≥ 20
    clasp --version  # any
    curl --version
    ```

---

## Step 1: Clone

```bash
git clone https://github.com/joe-broadhead/workspace-lite.git
cd workspace-lite
```

The setup script installs dependencies with `npm ci` when `package-lock.json` is present, then builds all 8 service packages. To preview the flow without creating Apps Script projects, bootstrap secrets, or `.env` entries, run `bash ./scripts/setup.sh --dry-run`.

---

## Step 2: Run the Setup Script

```bash
chmod +x scripts/setup.sh
bash ./scripts/setup.sh
```

The script automates:

| Step | What happens |
|------|--------------|
| 1. Authenticate | Opens a browser for `clasp login` (one-time) |
| 2. Create projects | Creates or reuses 8 Apps Script standalone projects with correct OAuth scopes |
| 3. Push code | Pushes `Auth.gs`, `Code.gs`, `Response.gs`, and service files to each project |
| 4. Deploy guide | Prints Apps Script editor URLs and manual web app deployment instructions |
| 5. Token bootstrap | Collects deployment URLs, bootstraps auth tokens, appends successful entries to `.env` |
| 6. Config output | Prints ready-to-paste OpenCode `mcp` JSON |
| 7. Skill setup | Prints symlink commands for the `google-workspace` and `workspace-lite-installer` skills |

---

## Step 3: Deploy Web Apps In Apps Script

The setup script pauses here and prints an Apps Script editor URL for each of the 8 services, like `https://script.google.com/d/<script-id>/edit`.

Open each editor URL and create the deployment manually:

1. Click **Deploy → New deployment**.
2. Click **Select type** or the gear icon.
3. Choose **Web app**.
4. Set **Execute as** to **Me**.
5. Set **Who has access** to **Anyone**.
6. Click **Deploy**.
7. If Google asks for authorization, review permissions and allow the scopes for that service.
8. Copy the **Web app URL** ending in `/exec`.

Use these exact settings:

| Field | Value |
|-------|-------|
| Deploy type | **Web app** |
| Execute as | **Me** (`USER_DEPLOYING`) |
| Who has access | **Anyone (anonymous)** |

Copy each deployment URL (looks like `https://script.google.com/macros/s/.../exec`) and paste it back into the script prompt.

!!! warning "GUI step requires the user"
    Agents and scripts can push code, create Apps Script versions, and refresh an existing deployment with `clasp redeploy`. The initial deployment still needs the Apps Script editor so the user can verify **Web app**, **Execute as: Me**, **Who has access: Anyone**, and OAuth scopes before approving access.

---

## Step 4: Install the Agent Skills

```bash
mkdir -p ~/.config/opencode/skills
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
ln -sf "$(pwd)/skills/workspace-lite-installer" ~/.config/opencode/skills/workspace-lite-installer
```

This makes two repo skills available to OpenCode. `google-workspace` teaches agents how to use the 218 Workspace tools. `workspace-lite-installer` teaches agents how to install, push, redeploy, and troubleshoot the MCPs while preserving the user-only Google authorization steps.

---

## Step 5: Configure OpenCode

The setup script prints a JSON block. Add it to your `opencode.jsonc` under `mcp`:

```jsonc
{
  "mcp": {
    "google-drive": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/workspace-lite/packages/drive/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_DRIVE_PROXY_URL": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_URL}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN}"
      }
    },
    // ... repeat for google-gmail, google-calendar, google-sheets, google-slides, google-docs, google-tasks, google-forms
  }
}
```

Source the generated `.env` file (or copy exports to `.zshrc`):

```bash
source .env
```

On Windows, persist the generated `.env` values at User scope so native OpenCode
can inherit them after restart:

```powershell
powershell -ExecutionPolicy Bypass -File .\skills\workspace-lite-installer\scripts\persist-env.ps1 -EnvFile .\.env
```

Restart OpenCode. When all 8 services are configured, all 218 tools are available.

If you skipped deployment URLs or bootstrap failed, the script leaves `.env` unchanged for those services. Deploy the web apps in the Apps Script editor, rerun `bash ./scripts/setup.sh`, paste the `/exec` deployment URLs, then source `.env` and restart OpenCode.

---

## Manual Setup (Alternative)

If you prefer to configure each service step-by-step without the setup script.

### Environment Variables

For each service, two environment variables are required:

| Service | URL variable | Token variable |
|---------|--------------|----------------|
| Drive | `GOOGLE_WORKSPACE_DRIVE_PROXY_URL` | `GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN` |
| Gmail | `GOOGLE_WORKSPACE_GMAIL_PROXY_URL` | `GOOGLE_WORKSPACE_GMAIL_PROXY_TOKEN` |
| Calendar | `GOOGLE_WORKSPACE_CALENDAR_PROXY_URL` | `GOOGLE_WORKSPACE_CALENDAR_PROXY_TOKEN` |
| Sheets | `GOOGLE_WORKSPACE_SHEETS_PROXY_URL` | `GOOGLE_WORKSPACE_SHEETS_PROXY_TOKEN` |
| Slides | `GOOGLE_WORKSPACE_SLIDES_PROXY_URL` | `GOOGLE_WORKSPACE_SLIDES_PROXY_TOKEN` |
| Docs | `GOOGLE_WORKSPACE_DOCS_PROXY_URL` | `GOOGLE_WORKSPACE_DOCS_PROXY_TOKEN` |
| Tasks | `GOOGLE_WORKSPACE_TASKS_PROXY_URL` | `GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN` |
| Forms | `GOOGLE_WORKSPACE_FORMS_PROXY_URL` | `GOOGLE_WORKSPACE_FORMS_PROXY_TOKEN` |

### Deploying Manually

1. Create each Apps Script project with `clasp create --type standalone`, or reuse the matching project from `clasp list --json`
2. Push code with `clasp push`
3. Deploy as a web app in the Apps Script GUI and copy the deployment URL. The user must verify scopes and web app access settings here.
4. Read the setup key from the generated, untracked `BootstrapSecret.gs` file and write the bootstrapped token directly to your environment file:

```bash
TOKEN_RESPONSE="$(curl -sL -X POST -H 'Content-Type: application/json' -d '{"setupKey":"<bootstrap-setup-key>"}' "https://script.google.com/macros/s/<deployment-id>/exec")"
TOKEN_RESPONSE="$TOKEN_RESPONSE" node -e 'const fs = require("fs"); const r = JSON.parse(process.env.TOKEN_RESPONSE); if (!r.success) throw new Error(r.error?.message || "Bootstrap failed"); fs.appendFileSync(".env", `export GOOGLE_WORKSPACE_<SERVICE>_PROXY_TOKEN=${JSON.stringify(r.data.token)}\n`)'
```

5. Set the matching `GOOGLE_WORKSPACE_<SERVICE>_PROXY_URL` in `.zshrc` or `.env`

### OpenCode Config (Manual)

```jsonc
{
  "mcp": {
    "google-drive": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/drive/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_DRIVE_PROXY_URL": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_URL}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN}"
      }
    },
    "google-gmail": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/gmail/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_GMAIL_PROXY_URL": "{env:GOOGLE_WORKSPACE_GMAIL_PROXY_URL}",
        "GOOGLE_WORKSPACE_GMAIL_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_GMAIL_PROXY_TOKEN}"
      }
    },
    "google-calendar": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/calendar/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_CALENDAR_PROXY_URL": "{env:GOOGLE_WORKSPACE_CALENDAR_PROXY_URL}",
        "GOOGLE_WORKSPACE_CALENDAR_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_CALENDAR_PROXY_TOKEN}"
      }
    },
    "google-sheets": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/sheets/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_SHEETS_PROXY_URL": "{env:GOOGLE_WORKSPACE_SHEETS_PROXY_URL}",
        "GOOGLE_WORKSPACE_SHEETS_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_SHEETS_PROXY_TOKEN}"
      }
    },
    "google-slides": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/slides/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_SLIDES_PROXY_URL": "{env:GOOGLE_WORKSPACE_SLIDES_PROXY_URL}",
        "GOOGLE_WORKSPACE_SLIDES_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_SLIDES_PROXY_TOKEN}"
      }
    },
    "google-docs": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/docs/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_DOCS_PROXY_URL": "{env:GOOGLE_WORKSPACE_DOCS_PROXY_URL}",
        "GOOGLE_WORKSPACE_DOCS_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_DOCS_PROXY_TOKEN}"
      }
    },
    "google-tasks": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/tasks/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_TASKS_PROXY_URL": "{env:GOOGLE_WORKSPACE_TASKS_PROXY_URL}",
        "GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_TASKS_PROXY_TOKEN}"
      }
    },
    "google-forms": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/forms/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_FORMS_PROXY_URL": "{env:GOOGLE_WORKSPACE_FORMS_PROXY_URL}",
        "GOOGLE_WORKSPACE_FORMS_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_FORMS_PROXY_TOKEN}"
      }
    }
  }
}
```

---

## Token Lifecycle

| Phase | Description |
|-------|-------------|
| **Bootstrap** | JSON `POST` with `setupKey` triggers one-time token generation. The token is generated from `Utilities.getUuid()` plus a second UUID with dashes removed, stored in `PropertiesService.getScriptProperties()` under `PROXY_AUTH_TOKEN`, returned once, and then `PROXY_BOOTSTRAPPED=true` is set. |
| **Storage** | Token lives in Apps Script properties &mdash; durable across deployments, survives code pushes. |
| **Rotation** | JSON `POST` with `setupKey` and `rotate:true` validates the local setup key, replaces the primary token, marks bootstrap complete, and returns the new token once. |
| **Usage** | Every `POST` request includes `token` in the JSON body. `Auth.gs` validates against the stored token. |

!!! warning "Bootstrap is one-shot"
    The bootstrap endpoint only works once per deployment. Save the token immediately. If lost, rerun setup interactively and accept the rotation prompt.
