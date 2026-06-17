# Operational Security

## Security Model Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Your Machine                           │
│  ┌──────────┐     ┌───────────────┐                        │
│  │  opencode │     │  MCP Server    │                       │
│  │ (agent)   │────►│  (tsx process) │                       │
│  └──────────┘     └───────┬───────┘                        │
│                           │ HTTPS POST                     │
│                           │ token in body                  │
│                    ┌──────▼───────────┐                     │
│                    │  .env file        │                    │
│                    │  PROXY_URL=...    │                    │
│                    │  PROXY_TOKEN=...  │                    │
│                    └──────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                           │
                    script.google.com
                           │
              ┌────────────▼────────────┐
              │  Apps Script Web App     │
              │  Runs as USER_DEPLOYING  │
              │  Token in Script Props   │
              │  Rate limit: 100/min     │
              └─────────────────────────┘
```

Three security boundaries:

1. **Local machine** — environment variables store tokens, MCP server runs as local process.
2. **HTTPS transport** — all traffic encrypted in transit to `script.google.com`.
3. **Google infrastructure** — Apps Script sandbox, Google identity, script properties.

## Token Management Best Practices

### Storage

Tokens must be stored in environment variables. The recommended approach:

```bash
# .env file (included in .gitignore)
GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN=<drive-proxy-token>
GOOGLE_WORKSPACE_GMAIL_PROXY_TOKEN=<gmail-proxy-token>
# ... one token per service

# Optional least-privilege tokens for higher-risk action classes
GOOGLE_WORKSPACE_GMAIL_PROXY_SEND_TOKEN=<gmail-send-token>
GOOGLE_WORKSPACE_DRIVE_PROXY_SHARE_TOKEN=<drive-share-token>
GOOGLE_WORKSPACE_DRIVE_PROXY_DESTRUCTIVE_TOKEN=<drive-destructive-token>
```

!!! danger "Never commit tokens"
    The `.env` file is listed in `.gitignore`. Never commit tokens to version control, include them in documentation, share them in chat, or log them. If a token appears in your git history, rotate it immediately.

### Shell Setup

Source the `.env` file in your shell profile:

```bash
# In ~/.zshrc or equivalent
export $(grep -v '^#' /path/to/workspace-lite/.env | xargs)
```

Or use the generated exports from the setup script.

### OpenCode Configuration

Tokens are passed to MCP servers via the `environment` block in `opencode.jsonc`:

```jsonc
{
  "mcp": {
    "google-drive": {
      "type": "local",
      "command": ["npx", "tsx", "/path/to/packages/drive/src/index.ts"],
      "environment": {
        "GOOGLE_WORKSPACE_DRIVE_PROXY_URL": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_URL}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_READ_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_READ_TOKEN}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_WRITE_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_WRITE_TOKEN}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_SHARE_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_SHARE_TOKEN}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_DESTRUCTIVE_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_DESTRUCTIVE_TOKEN}",
        "GOOGLE_WORKSPACE_DRIVE_PROXY_ADMIN_TOKEN": "{env:GOOGLE_WORKSPACE_DRIVE_PROXY_ADMIN_TOKEN}"
      }
    }
  }
}
```

The `{env:VAR_NAME}` syntax tells OpenCode to resolve the value from the shell environment, keeping tokens out of the config file.

## Rotating Tokens

If a token is compromised, exposed in logs, or you want to rotate as good practice:

### Steps

1. Open the Apps Script editor URL from `scripts/setup.sh`, or open `https://script.google.com/d/<script-id>/edit` using the `scriptId` in `packages/<service>/apps-script/.clasp.json`.

2. In the editor, go to **Project Settings** (gear icon) → **Script Properties**.

3. Delete the property `PROXY_BOOTSTRAPPED`.

4. Delete the property `PROXY_AUTH_TOKEN`.

5. If you use class-scoped tokens, also delete any affected `PROXY_READ_TOKEN`, `PROXY_WRITE_TOKEN`, `PROXY_SEND_TOKEN`, `PROXY_SHARE_TOKEN`, `PROXY_DESTRUCTIVE_TOKEN`, or `PROXY_ADMIN_TOKEN` properties.

6. **Deploy a new version** of the web app if the deployment URL changes, then update `.env`.

7. Bootstrap the new token with the setup key from the untracked `BootstrapSecret.gs` file, writing it directly to your environment file:

```bash
TOKEN_RESPONSE="$(curl -sL -X POST -H 'Content-Type: application/json' -d '{"setupKey":"<bootstrap-setup-key>"}' "https://script.google.com/macros/s/<deployment-id>/exec")"
TOKEN_RESPONSE="$TOKEN_RESPONSE" node -e 'const fs = require("fs"); const r = JSON.parse(process.env.TOKEN_RESPONSE); if (!r.success) throw new Error(r.error?.message || "Bootstrap failed"); fs.appendFileSync(".env", `export GOOGLE_WORKSPACE_<SERVICE>_PROXY_TOKEN=${JSON.stringify(r.data.token)}\n`)'
```

8. Update the matching proxy URL in `.env` if it changed.

9. Re-source your environment and restart OpenCode:

```bash
source ~/.zshrc
# Restart opencode
```

!!! warning "Token rotation breaks existing connections"
    The old token stops working immediately when you delete `PROXY_AUTH_TOKEN` from script properties. Plan rotation during a maintenance window.

### Why Rotate?

- Token was accidentally committed to version control.
- Token was shared in a chat, log, or screenshot.
- Team member with token access leaves the project.
- Regular security hygiene (recommended quarterly).

## Environment Variable Security

### What's in the Environment

Your environment contains two values per service:

| Variable | Risk |
|---|---|
| `GOOGLE_WORKSPACE_*_PROXY_URL` | Low. The URL is public but useless without the token. |
| `GOOGLE_WORKSPACE_*_PROXY_TOKEN` | **Critical.** Primary bearer token and fallback when a class-scoped token is not configured. |
| `GOOGLE_WORKSPACE_*_PROXY_READ_TOKEN` | Optional read-only token. |
| `GOOGLE_WORKSPACE_*_PROXY_WRITE_TOKEN` | Optional token for non-destructive mutations, including Drive comment/reply/revision updates and Gmail filters/vacation responder settings. |
| `GOOGLE_WORKSPACE_*_PROXY_SEND_TOKEN` | Optional token for Gmail send, reply, and forward actions. |
| `GOOGLE_WORKSPACE_*_PROXY_SHARE_TOKEN` | Optional token for Drive sharing actions. |
| `GOOGLE_WORKSPACE_*_PROXY_DESTRUCTIVE_TOKEN` | Optional token for trash/delete/clear actions, including Drive comment and reply deletion. |
| `GOOGLE_WORKSPACE_*_PROXY_ADMIN_TOKEN` | Optional broad fallback for mixed high-risk batches or full operational access. |

### Best Practices

- **Use a dedicated `.env` file.** Don't hardcode tokens in shell profiles shared across machines.
- **Set restrictive file permissions:**

```bash
chmod 600 .env
```

- **Don't export tokens in shared environments.** CI systems and shared servers should use their own tokens.
- **Audit your environment before sharing screen.** `env | grep GOOGLE_WORKSPACE` will show all tokens.
- **Use shell history controls.** Tokens passed via `curl` or `export` end up in `.zsh_history`. Use `setopt HIST_IGNORE_SPACE` and prefix sensitive commands with a space.

### Workspace MCP Environment Audit

Check which tokens are currently configured:

```bash
env | grep GOOGLE_WORKSPACE | grep TOKEN
```

This should show 6 lines (one per service). If a service is missing, the MCP server for that service won't start.

## No Service Account Exposure

A key security property of this architecture: **there are no service accounts.**

Traditional Google API integrations use service accounts with JSON key files that:

- Can be downloaded and shared.
- Have perpetual access until manually revoked.
- Often have over-broad scopes ("drive" instead of "drive.file").
- Are hard to audit — who used this key and when?

This project eliminates all of that:

| Service Account Model | This Project |
|---|---|
| JSON key file on disk → can be exfiltrated | No key files exist |
| Service account email → can be added to resources | No service account; runs as you |
| Domain-wide delegation → can impersonate any user | Single-user; `USER_DEPLOYING` |
| Key rotation in Google Cloud Console | Token rotation via Apps Script properties |

The attack surface is:

1. **Your local machine** (token in `.env`)
2. **The Apps Script** (token in Script Properties, accessible only to you)
3. **The HTTPS channel** (TLS-terminated by Google)

There is no additional infrastructure to secure.

## Threat Model

### What an attacker can do with a compromised token

Token impact depends on the token's authorization classes. The setup-generated primary token defaults to `read,draft`; broader classes require `PROXY_AUTH_TOKEN_CLASSES` or class-scoped token properties in Apps Script Script Properties. The MCP client chooses class-scoped environment tokens by action class when they are configured, and only falls back to the primary token when no matching class token is available.

| Token class | Access |
|---|---|
| `read` | Read/list/search actions allowed by service policies |
| `draft` | Draft-safe Gmail actions plus read |
| `write` | Create/update/archive/non-destructive mutations plus draft/read |
| `send` | Email send/reply/forward plus write/draft/read |
| `share` | Drive sharing plus write/draft/read |
| `destructive` | Trash/delete/clear destructive actions plus write/draft/read |
| `admin` | All action classes |

**Rotate immediately if a token is compromised.**

### What an attacker cannot do

- **Access other users' data.** The proxy runs as `USER_DEPLOYING` — your identity only.
- **Escalate to admin actions.** No admin SDK or domain-wide capabilities.
- **Modify the proxy itself.** Apps Script deployments are immutable snapshots.
- **Create persistent backdoors.** Google Apps Script has no cron/trigger API in this surface.
- **Access Google Cloud Console or billing.** The proxy has no cloud project association beyond the Apps Script project.

### Rate limiting as defense-in-depth

Even with a valid token, an attacker is limited to 100 weighted request units per minute per proxy. This is not a security boundary (a patient attacker can work within it), but it limits blast radius and makes destructive/send/share batches more expensive than reads.
