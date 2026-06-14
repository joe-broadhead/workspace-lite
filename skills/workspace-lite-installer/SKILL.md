---
name: workspace-lite-installer
version: 0.0.0
description: "workspace-lite installer/operator: Use when helping a user install, configure, push, deploy, redeploy, or troubleshoot the Workspace Lite Google Workspace MCP servers, Apps Script web apps, clasp, tokens, or OpenCode config."
metadata:
  requires:
    bins:
      - node
      - npm
      - clasp
---

# Workspace Lite Installer

Use this skill to help a user install, configure, update, or troubleshoot the `workspace-lite` Google Workspace MCP servers.

## Boundaries

- You can run local setup commands, install npm dependencies, build packages, run validation, inspect `.clasp.json`, run `clasp push`, create Apps Script versions, and refresh existing deployments with `clasp deploy -i`.
- The user must complete Google account browser auth, review OAuth scopes, and confirm web app deployment settings in the Apps Script GUI.
- Never print, commit, or paste `.env`, `.clasprc.json`, `.clasp.json`, `BootstrapSecret.gs`, bearer tokens, setup keys, deployment URLs from private installs, or script IDs into public output.
- Ask before rotating tokens, deleting Apps Script properties, creating replacement deployments, or changing OpenCode config.

## Services

There are 8 packages and 8 Apps Script web apps:

| Service | Package | MCP name | Env prefix |
|---|---|---|---|
| Drive | `packages/drive` | `google-drive` | `GOOGLE_WORKSPACE_DRIVE` |
| Gmail | `packages/gmail` | `google-gmail` | `GOOGLE_WORKSPACE_GMAIL` |
| Calendar | `packages/calendar` | `google-calendar` | `GOOGLE_WORKSPACE_CALENDAR` |
| Sheets | `packages/sheets` | `google-sheets` | `GOOGLE_WORKSPACE_SHEETS` |
| Slides | `packages/slides` | `google-slides` | `GOOGLE_WORKSPACE_SLIDES` |
| Docs | `packages/docs` | `google-docs` | `GOOGLE_WORKSPACE_DOCS` |
| Tasks | `packages/tasks` | `google-tasks` | `GOOGLE_WORKSPACE_TASKS` |
| Forms | `packages/forms` | `google-forms` | `GOOGLE_WORKSPACE_FORMS` |

## First-Time Install

1. Confirm prerequisites:
   ```bash
   node --version
   npm --version
   clasp --version
   ```
2. If `clasp` is missing, install it:
   ```bash
   npm install -g @google/clasp
   ```
3. Run a dry run first when possible:
   ```bash
   ./scripts/setup.sh --dry-run
   ```
4. Run setup:
   ```bash
   ./scripts/setup.sh
   ```
5. If `clasp login` opens a browser, tell the user to complete Google auth. You cannot approve this for them.
6. When setup prints Apps Script editor URLs, tell the user to open each URL and create the initial web app deployment in the GUI:
   - **Deploy -> New deployment**
   - **Select type -> Web app**
   - **Execute as -> Me**
   - **Who has access -> Anyone**
   - Review and authorize the requested OAuth scopes
   - Copy the `/exec` web app URL back into the setup prompt
7. If the user completes the GUI deployments but does not paste URLs, retrieve them with `clasp deployments` from each service directory. Use the versioned deployment row (`@1`, `@2`, etc.), not the `@HEAD` row, and construct `https://script.google.com/macros/s/<deployment-id>/exec`.
8. After setup writes `.env`, tell the user to source it or persist it from their shell startup file, then restart OpenCode.

## Retrieve Web App URLs After GUI Deployment

Use this when the user has completed **Deploy -> New deployment -> Web app** in the Apps Script GUI and approved scopes, but the agent needs to recover the `/exec` URLs for bootstrap.

```bash
node --input-type=module -e 'import { execFileSync } from "node:child_process"; import path from "node:path"; const root = process.cwd(); const services = ["drive", "gmail", "calendar", "sheets", "slides", "docs", "tasks", "forms"]; for (const service of services) { const cwd = path.join(root, "packages", service, "apps-script"); const output = execFileSync("clasp", ["deployments"], { cwd, encoding: "utf8" }); const versioned = output.split("\n").find((line) => /^-\s+\S+\s+@\d+/.test(line)); if (!versioned) throw new Error(`${service}: no versioned web app deployment found`); const id = versioned.match(/^-\s+(\S+)\s+@\d+/)?.[1]; console.log(`${service}: https://script.google.com/macros/s/${id}/exec`); }'
```

To feed those URLs back through the setup script without printing tokens, generate them in service order and pass them on stdin:

```bash
node --input-type=module -e 'import { execFileSync, spawnSync } from "node:child_process"; import path from "node:path"; const root = process.cwd(); const services = ["drive", "gmail", "calendar", "sheets", "slides", "docs", "tasks", "forms"]; const urls = []; for (const service of services) { const cwd = path.join(root, "packages", service, "apps-script"); const output = execFileSync("clasp", ["deployments"], { cwd, encoding: "utf8" }); const versioned = output.split("\n").find((line) => /^-\s+\S+\s+@\d+/.test(line)); if (!versioned) throw new Error(`${service}: no versioned web app deployment found`); const id = versioned.match(/^-\s+(\S+)\s+@\d+/)?.[1]; urls.push(`https://script.google.com/macros/s/${id}/exec`); } const result = spawnSync("./scripts/setup.sh", { cwd: root, input: `${urls.join("\n")}\n`, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] }); process.exit(result.status ?? 1);'
```

Rules:

- Do not use `@HEAD` as the web app URL. Use the versioned deployment ID row.
- Keep service order as `drive`, `gmail`, `calendar`, `sheets`, `slides`, `docs`, `tasks`, `forms` when feeding URLs to setup.
- If a service has no versioned deployment row, the user has not completed the GUI web app deployment for that service yet.
- Do not print the generated `.env` or token values.

## Agent-Assisted Deploy Updates

Use this when code has changed after the user already created and authorized the initial web app deployment.

1. For each changed service, push code:
   ```bash
   cd packages/<service>/apps-script
   clasp push --force
   ```
2. Create an immutable Apps Script version:
   ```bash
   clasp version "Refresh web app deployment YYYY-MM-DD"
   ```
3. Find the existing versioned web app deployment ID:
   ```bash
   clasp deployments
   ```
4. Refresh the existing deployment so the `/exec` URL stays stable:
   ```bash
   clasp deploy -i "<deployment-id>" -V "<version>" -d "Refresh web app deployment YYYY-MM-DD"
   ```
5. Tell the user to open the Apps Script editor if Google reports new scopes or authorization is required. The user must review/approve scopes in the GUI.

Do not create a replacement deployment unless the user explicitly wants a new URL. Prefer refreshing the existing deployment ID.

## Initial GUI Step Is Still Required

`clasp deploy` is useful for refreshing an existing deployment, but it is not a full replacement for the initial Apps Script GUI deployment flow. The user needs the GUI to verify:

- Deployment type is **Web app**.
- Execute-as is **Me** / `USER_DEPLOYING`.
- Access is **Anyone**.
- OAuth scopes match the service and are acceptable to the user.

If a deployment returns a Google access-denied HTML page, ask the user to re-open the Apps Script editor and verify those settings.

## OpenCode Config

The setup script prints config entries for the top-level `mcp` block in `opencode.jsonc`. After editing OpenCode config or installing skills, remind the user to restart OpenCode.

## Persist Environment Variables

Prefer sourcing the generated `.env` from the user's shell startup file instead of copying token values into shell config. This keeps secrets in one ignored install file and prevents stale inline token exports from overriding a fresh install.

For zsh:

```bash
grep -q 'workspace-lite/.env' ~/.zshrc || cat >> ~/.zshrc <<'EOF'

# workspace-lite Google Workspace MCP env
[ -f /path/to/workspace-lite/.env ] && source /path/to/workspace-lite/.env
EOF
```

Replace `/path/to/workspace-lite` with the repo path. If older `export GOOGLE_WORKSPACE_*` lines already exist in `~/.zshrc`, remove or comment them out so they do not override the sourced `.env` values.

For the current shell, run:

```bash
source /path/to/workspace-lite/.env
```

Then restart OpenCode so MCP processes inherit the new environment.

Install both repo skills when helping an OpenCode user:

```bash
mkdir -p ~/.config/opencode/skills
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
ln -sf "$(pwd)/skills/workspace-lite-installer" ~/.config/opencode/skills/workspace-lite-installer
```

## Validation

Use the smallest relevant checks:

```bash
npm run build
npm run typecheck
```

For MCP schema startup issues, list tools through the MCP client or start one server directly after sourcing `.env`:

```bash
npx tsx packages/drive/src/index.ts
```

For web app health, use the `/exec` URL without a token:

```bash
curl -sL "https://script.google.com/macros/s/<deployment-id>/exec"
```

Expected response is a JSON health envelope with `success:true`.
