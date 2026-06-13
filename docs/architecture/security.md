# Security Architecture

## Overview

```
┌──────────┐        ┌───────────────┐        ┌─────────────────────┐
│  opencode │  STDIO │  MCP Server    │  HTTPS │  Apps Script Web App │
│ (agent)   │◄──────►│  (local tsx)   │◄──────►│  script.google.com   │
└──────────┘        └───────────────┘        └─────────────────────┘
                                                 │
                                           Runs as USER_DEPLOYING
                                           Google identity auto-applied
```

The security model rests on three layers: **token authentication** (who can call the proxy), **identity delegation** (whose permissions are used), and **transport security** (how data moves).

## Token Model

Every Apps Script web app proxy is protected by a bearer token stored in Apps Script Script Properties. The setup script creates an untracked `BootstrapSecret.gs` file for each service, and bootstrap requires both `bootstrap=1` and that setup key.

The primary token is:

1. **Generated on first successful bootstrap** with `Utilities.getUuid()` plus a second UUID with dashes removed.
2. **Stored as `PROXY_AUTH_TOKEN`** in `PropertiesService.getScriptProperties()`.
3. **Returned exactly once** after the caller proves possession of the bootstrap setup key.
4. **Disabled for repeat bootstrap** by setting `PROXY_BOOTSTRAPPED=true`.

```javascript
// Auth.gs - token generation
function generateToken_() {
  return Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '')
}
```

The bootstrap flow:

1. `scripts/setup.sh` writes an untracked `BootstrapSecret.gs` containing `BOOTSTRAP_SETUP_SECRET`.
2. User deploys the Apps Script web app (manual GUI step).
3. Setup calls `GET /exec?bootstrap=1&setupKey=<bootstrap-setup-key>`.
4. The proxy validates the setup key in constant time, generates the token, stores it, marks bootstrap complete, and returns the token.
5. The user stores the token as an environment variable such as `GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN`.

The primary token defaults to the `read,draft` authorization classes. Operators can set `PROXY_AUTH_TOKEN_CLASSES` or service-specific tokens such as `PROXY_WRITE_TOKEN`, `PROXY_SEND_TOKEN`, `PROXY_SHARE_TOKEN`, `PROXY_DESTRUCTIVE_TOKEN`, and `PROXY_ADMIN_TOKEN` in Script Properties when they need broader action classes.

## Token Transmission

Normal proxy calls accept the token only in the JSON request body:

```json
{ "action": "fileGet", "params": { "fileId": "<file-id>" }, "token": "<proxy-token>" }
```

The MCP servers read the token from environment variables and send it in that body field. Query parameters are reserved for the one-time bootstrap flow, and Authorization headers are not part of the proxy request contract.

## Rate Limiting

Each proxy applies a weighted **100 units per minute** rate limit using `CacheService.getScriptCache()` and a script lock:

```javascript
function rateLimitWithKey_(key, maxRequests, weight) {
  const count = parseInt(cache.get(key) || '0', 10)
  const requestWeight = Math.max(1, Math.min(Number(weight) || 1, maxRequests || 100))
  if (count + requestWeight > (maxRequests || 100)) return true
  cache.put(key, String(count + requestWeight), 60)
  return false
}
```

- The rate limit counter is keyed by authenticated token kind, or by an invalid-token fingerprint for auth failures.
- Read actions cost 1 unit, write actions cost 3, send/share actions cost 6, destructive actions cost 8, and batch cost is the sum of child action weights capped at 100.
- Failed authentication attempts have a separate 20/minute throttle.
- When the limit is hit, the proxy returns `RATE_LIMITED` with the message "Too many requests. Try again in 60 seconds."
- The MCP server surface does not retry automatically — it surfaces the error to the agent.

## ID Validation

All resource IDs passed to proxy actions are validated with regex patterns before any API call is made:

| Service | Pattern | Example Valid ID |
|---|---|---|
| Drive files/folders | `^[a-zA-Z0-9_-]+$` | `<drive-file-id>` |
| Sheets spreadsheets | `^[a-zA-Z0-9_-]+$` | `<spreadsheet-id>` |
| Slides presentations | `^[a-zA-Z0-9_-]+$` | `<presentation-id>` |
| Docs documents | `^[a-zA-Z0-9_-]+$` | `<document-id>` |
| Gmail message IDs | `z.string().min(1)` | `18a1b2c3d4e5f6g7` |
| Gmail thread IDs | `z.string().min(1)` | `18a1b2c3d4e5f6g7` |
| Calendar event IDs | `z.string().min(1)` | `_60q30c1g6...` |
| Email addresses | Zod `email()` validator | `user@domain.com` |

Validation happens at **both layers**: the MCP server validates with Zod schemas before sending the request, and the Apps Script proxy re-validates IDs server-side before calling Google APIs.

## No OAuth Per Call

This is the key architectural decision. The Apps Script web app is deployed as:

- **Execute as: Me (`USER_DEPLOYING`)**
- **Access: Anyone**

This means:

- **No OAuth dance per API call.** There are no refresh tokens, no consent screens, no token expiry.
- **Google identity is automatic.** The proxy runs under the identity of the user who deployed it. All API calls use that user's permissions.
- **No service accounts.** No service account JSON files, no domain-wide delegation, no IAM roles to configure.
- **No third-party OAuth app verification.** Since the proxy is a web app you deploy yourself, there's nothing for Google to review.

The trade-off is that the proxy can only act on behalf of **one user** — the deploying user. This is ideal for personal productivity automation but not for multi-user SaaS scenarios.

## HTTPS Transport Only

All MCP server → proxy communication happens over HTTPS to `script.google.com`. Google's infrastructure terminates TLS and provides:

- Certificate validation and chain of trust
- HSTS enforcement
- Protection against downgrade attacks

There is no plain HTTP fallback. The MCP servers are hardcoded to use `https://` URLs.

## Request Flow Summary

```
1. opencode agent invokes an MCP tool (e.g., drive_search_files)
2. MCP server validates parameters with Zod schemas
3. MCP server constructs JSON payload: { action, params, token }
4. MCP server POSTs to proxy URL over HTTPS
5. Proxy validates the JSON-body token and establishes its authorization classes
6. Proxy checks weighted rate limits (CacheService, 100 units/min)
7. Proxy enforces action policy and confirmation gates
8. Proxy validates resource IDs and high-risk inputs
9. Proxy executes the action using Apps Script built-in services (DriveApp, GmailApp, etc.)
10. Proxy returns JSON response
11. MCP server formats response for STDIO/JSON-RPC
```

## What the Token Does NOT Protect

The token authenticates that the caller knows the shared secret. It does **not**:

- Provide per-user or per-agent identity (there is one token set per deployment).
- Encrypt request/response payloads (HTTPS handles transport encryption).
- Sign or provide non-repudiation for individual operations.
- Replace Google's own API authorization — the proxy uses `USER_DEPLOYING` identity.

If your token is compromised, rotate it immediately (see [Operations: Security](../operations/security.md#rotating-tokens)).
