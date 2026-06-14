# Installation

Complete setup of all 8 Google Workspace MCP servers, including the required manual Apps Script web app deployments.

## Prerequisites

| Requirement | Version / Command | Notes |
|-------------|-------------------|-------|
| Node.js | 20+ | `node --version` |
| clasp | latest | `npm install -g @google/clasp` |
| Google account | &mdash; | With access to the Workspace services you plan to use |

!!! tip "Verify prerequisites"
    ```bash
    node --version   # ≥ 20
    clasp --version  # any
    ```

---

## Step 1: Clone &amp; Build

```bash
git clone https://github.com/joe-broadhead/workspace-lite.git
cd workspace-lite
npm install
npm run build
```

`npm install` triggers a `postinstall` script that builds the shared package. `npm run build` compiles all 8 service packages.

---

## Step 2: Run the Setup Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The script automates:

| Step | What happens |
|------|--------------|
| 1. Authenticate | Opens a browser for `clasp login` (one-time) |
| 2. Create projects | Creates 8 Apps Script standalone projects with correct OAuth scopes |
| 3. Push code | Pushes `Auth.gs`, `Code.gs`, `Response.gs`, and service files to each project |
| 4. Deploy guide | Prints instructions for deploying each project as a web app |
| 5. Token bootstrap | Collects deployment URLs, bootstraps auth tokens, writes `.env` |
| 6. Config output | Prints ready-to-paste OpenCode `mcpServers` JSON |
| 7. Skill setup | Prints the symlink command for the `google-workspace` skill |

---

## Step 3: Deploy Web Apps (GUI)

The setup script pauses here and prints an Apps Script editor URL for each of the 8 services, like `https://script.google.com/d/<script-id>/edit`.

In each Apps Script editor:

| Field | Value |
|-------|-------|
| Deploy type | **Web app** |
| Execute as | **Me** (`USER_DEPLOYING`) |
| Who has access | **Anyone (anonymous)** |

Copy each deployment URL (looks like `https://script.google.com/macros/s/.../exec`) and paste it back into the script prompt.

!!! warning "GUI step cannot be automated"
    Google does not provide an API for creating web app deployments. You must click through the Apps Script editor 8 times.

---

## Step 4: Install the Agent Skill

```bash
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
```

This makes the `google-workspace` skill available to OpenCode. The skill provides LLMs with tool catalogs, numbered workflows, and safety rules.

---

## Step 5: Configure OpenCode

The setup script prints a JSON block. Add it to your `opencode.jsonc` under `mcpServers`:

```jsonc
{
  "mcpServers": {
    "google-drive": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/workspace-lite/packages/drive/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_DRIVE_PROXY_URL": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_URL}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN}"
      }
    }
    // ... repeat for google-gmail, google-calendar, google-sheets, google-slides, google-docs, google-tasks, google-forms
  }
}
```

Source the generated `.env` file (or copy exports to `.zshrc`):

```bash
source .env
```

Restart OpenCode. When all 8 services are configured, all 218 tools are available.

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

1. Create each Apps Script project with `clasp create --type standalone`
2. Push code with `clasp push`
3. Deploy as web app manually (GUI) and copy the deployment URL
4. Read the setup key from the generated, untracked `BootstrapSecret.gs` file and write the bootstrapped token directly to your environment file:

```bash
TOKEN_RESPONSE="$(curl -sL "https://script.google.com/macros/s/<deployment-id>/exec?bootstrap=1&setupKey=<bootstrap-setup-key>")"
TOKEN_RESPONSE="$TOKEN_RESPONSE" node -e 'const fs = require("fs"); const r = JSON.parse(process.env.TOKEN_RESPONSE); if (!r.success) throw new Error(r.error?.message || "Bootstrap failed"); fs.appendFileSync(".env", `export GOOGLE_WORKSPACE_<SERVICE>_PROXY_TOKEN=${JSON.stringify(r.data.token)}\n`)'
```

5. Set the matching `GOOGLE_WORKSPACE_<SERVICE>_PROXY_URL` in `.zshrc` or `.env`

### OpenCode Config (Manual)

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
| **Bootstrap** | `GET ?bootstrap=1` triggers one-time token generation. The token is generated from `Utilities.getUuid()` plus a second UUID with dashes removed, stored in `PropertiesService.getScriptProperties()` under `PROXY_AUTH_TOKEN`, returned once, and then `PROXY_BOOTSTRAPPED=true` is set. |
| **Storage** | Token lives in Apps Script properties &mdash; durable across deployments, survives code pushes. |
| **Rotation** | Re-run bootstrap? The endpoint returns `FORBIDDEN` once bootstrapped. To rotate, manually clear script properties: **Project Settings &rarr; Script Properties** in the Apps Script editor, then re-bootstrap. |
| **Usage** | Every `POST` request includes `token` in the JSON body. `Auth.gs` validates against the stored token. |

!!! warning "Bootstrap is one-shot"
    The bootstrap endpoint (`?bootstrap=1`) only works once per deployment. Save the token immediately. If lost, you must clear script properties and re-bootstrap.
