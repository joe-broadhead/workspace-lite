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

Every Apps Script web app proxy is protected by a **48-character random bearer token**. The token is:

1. **Generated on first bootstrap** using `Math.random()` combined with a 62-character alphabet (`A-Za-z0-9`).
2. **Stored in Apps Script Properties** (`PropertiesService.getScriptProperties()`), which is a secure, per-script key-value store visible only to the script itself.
3. **Returned exactly once** via the `?bootstrap=1` GET parameter. After that, the bootstrap endpoint is permanently disabled for the deployment.

```javascript
// Auth.gs — token generation (simplified)
function generateToken() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
```

The bootstrap flow:

1. User deploys web app (manual GUI step).
2. User hits `GET /exec?bootstrap=1` — the proxy generates a token, stores it, marks itself as bootstrapped, and returns the token.
3. The bootstrap endpoint **refuses** subsequent requests: `FORBIDDEN: Bootstrap has already been completed.`
4. The user stores the token as an environment variable (`GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN`).

## Token Transmission

Tokens are accepted through three channels (checked in order):

| Method | Example |
|---|---|
| Query parameter | `POST /exec?token=AbCdEf...` |
| JSON body field | `{ "action": "...", "token": "AbCdEf..." }` |
| Authorization header | `Authorization: Bearer AbCdEf...` |

The MCP servers pass tokens as JSON body fields. All three channels are validated on every request via `validateRequest()`.

## Rate Limiting

Each proxy applies a **100 requests per minute** rate limit using `CacheService.getScriptCache()`:

```javascript
function isRateLimited(token, maxRequests) {
  var cache = CacheService.getScriptCache();
  var key = 'rate_' + (token || 'anon');
  var count = parseInt(cache.get(key) || '0', 10);
  if (count >= (maxRequests || 100)) return true;
  cache.put(key, String(count + 1), 60);  // 60-second TTL
  return false;
}
```

- The rate limit counter is keyed by token and resets after 60 seconds.
- When the limit is hit, the proxy returns `RATE_LIMITED` with the message "Too many requests. Try again in 60 seconds."
- The MCP server surface does not retry automatically — it surfaces the error to the agent.

## ID Validation

All resource IDs passed to proxy actions are validated with regex patterns before any API call is made:

| Service | Pattern | Example Valid ID |
|---|---|---|
| Drive files/folders | `^[a-zA-Z0-9_-]+$` | `1aBcDeFgHiJkLmNoPqRsTuVwX` |
| Sheets spreadsheets | `^[a-zA-Z0-9_-]+$` | `1XyZ-abc123_ABC` |
| Slides presentations | `^[a-zA-Z0-9_-]+$` | `1pQrStUvWxYz` |
| Docs documents | `^[a-zA-Z0-9_-]+$` | `1dEfGhIjKlMnOp` |
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
5. Proxy validates the token (all three channels checked)
6. Proxy checks rate limit (CacheService, 100/min)
7. Proxy validates resource IDs (regex patterns)
8. Proxy executes the action using Apps Script built-in services (DriveApp, GmailApp, etc.)
9. Proxy returns JSON response
10. MCP server formats response for STDIO/JSON-RPC
```

## What the Token Does NOT Protect

The token authenticates that the caller knows the shared secret. It does **not**:

- Provide per-user or per-agent identity (there is one token per deployment).
- Encrypt request/response payloads (HTTPS handles transport encryption).
- Sign or provide non-repudiation for individual operations.
- Replace Google's own API authorization — the proxy uses `USER_DEPLOYING` identity.

If your token is compromised, rotate it immediately (see [Operations: Security](../operations/security.md#rotating-tokens)).
