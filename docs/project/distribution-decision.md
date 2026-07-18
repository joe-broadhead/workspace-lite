# Distribution Decision Record

**Status:** Accepted · 2026-07-18
**Decision:** Remain **source-first** for the `v0.0.x` period. Do not publish npm packages yet. Invest in generated client config as the distribution surface, and cut tagged GitHub source releases.
**Supersedes:** the open question left by design decision K16 in `cli-mcp-parity-design.md` ("revisit public npm after CLI GA").

## Context

`workspace-lite` is a set of 8 local TypeScript MCP servers plus the `wslite` CLI, all backed by **user-owned Apps Script web app deployments**. The trust model is the product: every user deploys their own proxies into their own Google account, holds their own class-scoped tokens, and no third party ever sits between their MCP client and their Workspace data.

As of this record:

- The CLI parity milestone is complete: 218 tools, full MCP↔CLI parity, verified by a live matrix on both surfaces.
- All packages are `"private": true` at version `0.0.0`; nothing has ever been published to npm.
- Install is `git clone` + `./scripts/setup.sh`, which handles clasp project creation, deployment, token bootstrap, and client config output.
- Google's **official Workspace MCP servers** entered public developer preview (rollout began May 2026): remote-hosted servers for Gmail, Drive, Calendar, Chat, and People, gated behind preview-program signup, and consumed as remote MCP endpoints by clients such as Gemini CLI, Antigravity, and Claude (paid plans).

## Options considered

### 1. Source-only (status quo) — **chosen**

Users clone the repo and run setup. The repo is the distribution.

- **Trust:** strongest possible story — users can read every line they deploy into their own account before deploying it. Nothing executes that didn't come from the repo they audited.
- **Install:** already works on macOS, Linux, and Windows Git Bash. Setup friction is real (clasp auth, 8 services) but that friction is inherent to user-owned deployments, not to the distribution channel — an npm package would not remove it.
- **Versioning:** GitHub tags per the existing release process; no registry coordination.
- **Cost:** low. No publish pipeline, no provenance/signing infrastructure, no support surface for stale published versions pointing at newer Apps Script contracts.

### 2. Publish `@workspace-lite/cli` (and `@workspace-lite/shared`) to npm — deferred

`npx wslite` / global install without cloning.

- The CLI is useless without deployed Apps Script proxies and a populated `.env`, which today only setup-from-clone produces. A published CLI would therefore be a second door into the same clone-first workflow until setup itself is decoupled from the checkout — real work that belongs after JOE-144/145/146 land.
- Publishing requires making package privacy, scoped-org ownership, provenance, and a version-sync policy (npm version vs Apps Script contract version) part of every release. That overhead buys little while the audience is source-comfortable early adopters.
- Version skew becomes a genuine failure mode: a published CLI older or newer than the user's deployed proxies. The repo currently guarantees CLI↔proxy consistency by construction (same checkout).

### 3. Publish 8 individual MCP server packages — rejected for this period

Highest maintenance surface (8+ packages), same `.env`/deployment coupling as option 2, and it fragments the single-checkout consistency guarantee further. Nothing about the MCP client experience improves: clients still just need a command + env, which generated config (option 4) provides from a checkout.

### 4. Generated client config as the distribution surface — **chosen, complements option 1**

Ship a generator (JOE-146) that emits ready-to-paste config for OpenCode, Claude Code/Desktop, Cursor, and other MCP clients, per selected services/profile, referencing env vars rather than embedding secrets. This is the highest-leverage distribution investment available: it makes a source checkout feel like a packaged product at the point where users actually interact with it (their MCP client), without taking on registry obligations.

## Positioning against Google's official Workspace MCP servers

The official servers and `workspace-lite` are different products, not competitors on the same axis:

| | Google official (preview) | workspace-lite |
|---|---|---|
| Hosting | Google-hosted remote MCP | Local servers → user's own Apps Script |
| Services | Gmail, Drive, Calendar, Chat, People | Drive, Gmail, Calendar, Sheets, Slides, Docs, Tasks, Forms (218 tools) |
| Access | Preview-program signup; client-side plan gating | Any MCP client, any account, today |
| Auth granularity | OAuth scopes | Class-scoped tokens (read/draft/write/send/share/destructive/admin) + server-side confirm gates + allowlists |
| CLI | No | `wslite` with full tool parity |
| Auditability | Closed service | User deploys source they can read |

`workspace-lite`'s durable niche is **user-owned, auditable, fine-grained-safety Workspace access with authoring-surface coverage (Docs/Sheets/Slides/Tasks/Forms) that the official preview does not offer**. That niche is served best by the source-first + generated-config model; a published npm package neither strengthens nor is required by it. If Google's official servers add authoring services and open general availability, the comparison — and possibly this decision — should be revisited.

## What is explicitly not promised

- No npm packages (`@workspace-lite/*`) are published or promised. `npx wslite` does not work and is not claimed anywhere.
- No hosted or remote version of workspace-lite exists or is planned.
- No commitment that package names, the `wslite` bin name, or workspace layout are final until a publish decision is made.
- Package `"private": true` and `0.0.0` versions stay untouched by this record.

## Consequences

1. **Releases** are GitHub tags per `release-process.md`. The next action there is cutting the first tag now that the CLI milestone is live-verified.
2. **JOE-146** (client config generation, multi-client) is the distribution investment for this period.
3. **README and docs** must continue to describe clone-based install only; any doc implying npm install is a bug.
4. **CI must not gain publish steps**; the `deploy` workflow remains about docs/site, not registries.

## Revisit triggers

Reopen this decision when any of the following happens:

- Setup can produce a working `.env` + deployments without a repo checkout (post JOE-144/145/146), removing the main coupling argument against a published CLI.
- External demand appears (issues/users asking for `npx wslite` or packaged servers) rather than being hypothesized.
- Google's official MCP servers reach GA with authoring-service coverage, changing the positioning table above.
- `v0.1.0` planning begins — the stable-baseline release is the natural moment to re-evaluate registry presence.

**Next step for future agents:** if a revisit trigger fires, open a new issue referencing this record; do not change package privacy or add publish workflows without a superseding decision record.
