# Diagnostics

`wslite doctor` is the first-line diagnostic for any workspace-lite install. Run it **before** editing `.env`, rotating tokens, or redeploying — most "broken install" reports are one missing env var or one stale deployment, and doctor identifies which in seconds.

All doctor output is **redaction-safe by construction**: it prints environment variable *names*, error *codes*, correlationIds, and fingerprinted deployment IDs — never token values, full proxy URLs, script IDs, or full deployment IDs. You can paste doctor output into a GitHub issue, Linear ticket, or chat without scrubbing it first.

## Which check to run when

| Situation | Command | Network needed |
|---|---|---|
| Fresh install, MCP server won't start, "is my env set up?" | `wslite doctor` | No |
| Tools return errors, "is the proxy reachable and my token valid?" | `wslite doctor --live` | Yes |
| "I pushed code but behavior didn't change", post-deploy verification | `wslite doctor --deployments` | No (needs local `clasp`) |
| Full health check (e.g. after `setup.sh` or a redeploy) | `wslite doctor --live --deployments` | Yes |

Escalate to [Troubleshooting](troubleshooting.md) only after doctor has localized the failure — its sections map directly onto doctor's advice lines (redeploy, rotate token, fix URL wiring).

### Offline behavior

Plain `wslite doctor` makes **no network calls** and reads no files outside `process.env` — it checks, per service, that `GOOGLE_WORKSPACE_<SERVICE>_PROXY_URL` and `GOOGLE_WORKSPACE_<SERVICE>_PROXY_TOKEN` (plus any class-scoped tokens) are present. It is safe to run anywhere, including CI. `--live` performs one unauthenticated GET and one cheap authenticated read per configured service. `--deployments` runs `clasp deployments` locally per service; it talks to Google via clasp's own auth, not the proxies.

## `wslite doctor` (env presence)

Reports each service as configured or lists the missing variable names. Nothing else. Exit code 0 means every service the install intends to use has its variables set — it does **not** prove the values are correct; that is what `--live` is for.

## `wslite doctor --live` (health + auth probes)

Two probes per configured service:

1. **Health** — unauthenticated GET on the proxy URL. Every proxy answers `{status:'healthy', version, service:'google-workspace-proxy-<svc>'}`, so this also detects a URL pasted into the wrong service's variable.
2. **Auth** — one cheap authenticated read through the normal client path. Services without zero-argument reads (sheets, slides, docs, forms) are verified via a parameter-validation response: the proxy checks auth *before* params, so a `BAD_REQUEST` reply proves the token was accepted.

### Health statuses

| Status | Meaning | What to do |
|---|---|---|
| `healthy` | Deployment answers and identifies as the right service | Nothing |
| `service-mismatch` | URL answers as a *different* service's proxy | Fix the `_PROXY_URL` wiring in `.env` |
| `invalid-response` | Non-JSON or unexpected payload (often an HTML login page) | Point the URL at the versioned `/exec` deployment, not `/dev` |
| `unreachable` | HTTP error, timeout, or network failure | Check the URL; redeploy via `deploy-single.sh` |

### Auth statuses

| Status | Meaning | What to do |
|---|---|---|
| `ok` | Token accepted | Nothing |
| `unauthorized` | Proxy rejected the token | Rotate via `scripts/setup.sh` token recovery; see [Troubleshooting → Token Issues](troubleshooting.md#token-issues) |
| `rate-limited` | Per-minute budget exhausted | Wait 60 seconds, re-run |
| `error` | Unexpected proxy error (code + correlationId shown) | Look up the correlationId in Apps Script logs (`clasp logs`) |
| `skipped` | Health failed first, or client config error (missing env var named in the note) | Fix the named variable / health issue |

A service is **ready** only when health is `healthy` and auth is `ok`. Every non-ready service gets a one-line remediation hint.

## `wslite doctor --deployments` (staleness)

Requires a workspace-lite repo checkout with per-service `.clasp.json` files and a logged-in `clasp`. For each service it extracts the deployment ID from the `.env` URL and compares it against `clasp deployments`:

| Status | Meaning | What to do |
|---|---|---|
| `current` | URL points at the highest versioned deployment | Nothing |
| `stale` | A newer versioned deployment exists | **Pushed source is not live** until the URL's deployment is updated — run `skills/workspace-lite-installer/scripts/deploy-single.sh` |
| `head` | URL points at `@HEAD` | MCP traffic must use a versioned `/exec` deployment; redeploy |
| `not-found` | URL's deployment ID isn't in clasp's listing | Redeploy, or fix the URL if it was hand-edited |
| `missing-url` / `malformed-url` | No URL set, or it isn't an Apps Script `/exec` URL | Set/fix the variable (`scripts/setup.sh` prints it) |
| `clasp-unavailable` | clasp missing, not logged in, or no `.clasp.json` | Optional check — degrades gracefully and does not fail doctor |
| `version-unavailable` / `unparseable-output` | clasp output couldn't be interpreted | Run `clasp deployments` manually in `packages/<service>/apps-script` |

The most common real-world finding is `stale` after a `clasp push` without a redeploy: the two-step update cycle (push, then redeploy the *same* deployment ID the `.env` URL points at) is the sharpest edge in operating workspace-lite, and this check makes it visible.

## Exit codes

`doctor` exits 0 only when every service is configured and — with `--live`/`--deployments` — ready and current. `clasp-unavailable` and `version-unavailable` do not fail the run. Use `--json` for machine-readable output (same redaction rules apply).

## Sharing diagnostics safely (support bundles)

There is no `wslite support-bundle` command yet. Until one exists, a safe support bundle is exactly this, assembled by hand:

```bash
wslite doctor --live --deployments 2>&1 | tee doctor-output.txt
node --version
npm --version
clasp --version 2>/dev/null || echo "clasp not installed"
git -C . rev-parse --short HEAD 2>/dev/null
```

Include: doctor output (already redaction-safe), tool versions, the repo commit, your OS, and the *error code + correlationId* of any failing call.

**Never paste into GitHub, Linear, chat, or logs:**

- Token values, or any line from `.env`, `.clasprc.json`, `.clasp.json`, or `BootstrapSecret.gs`
- Full proxy/deployment URLs, deployment IDs, or script IDs (fingerprints like `AKfycbx4Ef…` are fine)
- Email addresses, file names, document/message content, or any other Workspace data returned by a tool call

If an error message itself embeds sensitive data, share only the error `code` and `correlationId` — the correlationId lets whoever holds the Apps Script project find the full log line without the data ever leaving your account.

A future `wslite support-bundle` command should emit exactly the safe set above (doctor `--json` output plus environment versions), enforce the redaction rules mechanically, and write to a local file only — never upload anywhere.

## Related

- [CLI reference](../getting-started/cli.md) — full doctor flag documentation
- [Troubleshooting](troubleshooting.md) — deep dives once doctor has localized the failure
- [Live Smoke Harness](live-smoke.md) — maintainer-grade end-to-end verification beyond doctor's cheap probes
- [Security](security.md) — the redaction and token model behind these rules
