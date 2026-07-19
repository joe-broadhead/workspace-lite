# Lockdown Mode Specification

Status: **specified, not implemented**. This document is the implementable design for a lockdown mode that reduces send/share/destructive risk for agent-facing installs. It is grounded in the shipped auth model (`shared/apps-script/Auth.gs`, `shared/src/proxy-client.ts`) and changes none of it; follow-up implementation issues should be created directly from the "Implementation plan" section.

## The model being locked down

Two layers decide what a call can do, and lockdown must respect both:

**Server side** (Apps Script Script Properties, per service):

| Script property | Token kind | Capability classes granted |
|---|---|---|
| `PROXY_AUTH_TOKEN` | primary | `PROXY_AUTH_TOKEN_CLASSES`, defaulting to `read,draft,write,destructive,share,send` |
| `PROXY_READ_TOKEN` | read | `read` only (no draft) |
| `PROXY_WRITE_TOKEN` | write | `read,draft,write` |
| `PROXY_SEND_TOKEN` | send | `read,draft,write,send` |
| `PROXY_SHARE_TOKEN` | share | `read,draft,write,share` |
| `PROXY_DESTRUCTIVE_TOKEN` | destructive | `read,draft,write,destructive` |
| `PROXY_ADMIN_TOKEN` | admin | `admin` only |

`draft` is a server capability class only (gmail draft actions), not a client routing class.

**Client side** (`selectProxyToken`): for each action's class, the client prefers `GOOGLE_WORKSPACE_<SVC>_PROXY_<CLASS>_TOKEN`, then falls back — read falls back to primary then admin; other classes to admin then primary. **Consequence: removing class tokens from an environment does not reduce capability while the primary token is still present.** The primary is the skeleton key; every lockdown profile is therefore defined by which tokens exist in the *agent-facing environment*, with the primary excluded.

## Profiles

A profile is a statement about (a) which env tokens an agent-facing environment contains and (b) what the corresponding server-side properties must hold. Class tokens are minted manually today: generate a strong value, set it as the Script Property in the Apps Script editor, mirror it into the environment.

### `read-only`

- Env: `_PROXY_READ_TOKEN` only (plus `_PROXY_URL`). No primary, no other classes.
- Server: `PROXY_READ_TOKEN` set.
- Result: reads work; every write/send/share/destructive action fails server-side with `FORBIDDEN` regardless of client behavior. Gmail draft creation also fails (read grants `read` only).

### `read-draft`

- Env: a *narrowed primary* — `_PROXY_TOKEN` whose server-side `PROXY_AUTH_TOKEN_CLASSES` is set to `read,draft`.
- Server: `PROXY_AUTH_TOKEN_CLASSES=read,draft` on the services where this posture is wanted (realistically gmail; other services gain nothing from `draft`).
- Result: reads plus gmail draft composition; nothing can be sent, written, shared, or deleted.
- Note: this is the one profile that repurposes the primary, because no class token grants `read,draft` without `write`. The alternative — changing `PROXY_READ_TOKEN`'s grant to include draft — is **rejected**: silently widening an existing token kind breaks deployed expectations.
- Caveat: narrowing `PROXY_AUTH_TOKEN_CLASSES` affects *every* holder of that primary token. If the same primary also powers an operator shell, rotate first so the narrowed token is agent-only.

### `authoring`

- Env: `_PROXY_WRITE_TOKEN` only.
- Server: `PROXY_WRITE_TOKEN` set.
- Result: read, draft, and write (create/edit artifacts); no send, no share, no destructive. Matches the recipe MVP's needs (Meeting Pack without event-guest sends, Weekly Review, Inbox Thread without the draft-reply-send handoff).

### `full-with-confirmation` (today's default posture)

- Env: primary (and optionally class tokens) present.
- Result: everything except admin, gated only by the server-side `confirm:true` requirements and client confirmation flows.
- This posture remains supported — lockdown never removes it — but docs must state plainly: confirmation gates are a UX seatbelt, not an authorization boundary; any process holding the token can pass `confirm:true`.

Per-service mixing is expected (e.g. `authoring` for docs/sheets/slides, `read-only` for gmail/drive) — profiles apply service-by-service.

## What lockdown inspects

Entirely offline, extending `wslite security audit`:

1. Agent-facing env shape per service: which token env vars are present (the audit's existing token inventory).
2. Client-config files the generator produced (`client-config.mjs` output passes env *names*, so inspecting the env suffices).
3. Repo manifests (already audited).

**Live Script Property access is not required and not performed.** The spec's server-side expectations (which properties must exist / be narrowed) are emitted as instructions for the user to verify in the Apps Script editor — consistent with the audit's trust-model stance. An optional future admin-token-gated "verify" call is deliberately out of scope until an explicit follow-up approves it.

## What lockdown refuses to do automatically

- Never mutates Script Properties (no minting, narrowing, or deleting tokens server-side).
- Never edits `.env` or client config files without an explicit per-file confirmation (same rules as `wslite repair`).
- Never rotates tokens (rotation stays interactive-only, as in repair).
- Never removes the full-token capability from the product.
- Agents using the installer/google-workspace skills: **recommend, do not mutate.** Print the exact steps; perform them only when the user explicitly asks for that specific mutation.

## Interactions

- **`PROXY_AUTH_TOKEN_CLASSES`**: the only supported way to narrow the primary; server-side only; affects all holders (rotate first if shared).
- **Fallbacks**: client fallback order means partial lockdowns (class token present *and* primary present) provide zero enforcement — the audit must call this out rather than reporting the class token as an improvement.
- **Admin**: `PROXY_ADMIN_TOKEN` grants `admin` only and is never part of any profile; its presence in an agent env is always a warning.
- **Image hosts**: `ALLOWED_IMAGE_HOSTS` / per-service variants stay orthogonal — lockdown profiles do not change them, but the lockdown report should repeat the audit's posture line since `authoring` profiles enable image insertion.
- **Public sharing**: all profiles assume `ALLOW_PUBLIC_DRIVE_SHARING`/`ALLOW_PUBLIC_SHARING` unset; a lockdown report treats "set" as a warning even under `full-with-confirmation`.
- **Allowlists**: resource/recipient allowlists compose with profiles (class bounds *what kind* of action; allowlists bound *which targets*). Recommended pairing: any send-capable posture + `ALLOWED_EMAIL_RECIPIENTS`/`_DOMAINS`.

## Implementation plan (follow-up issues)

1. **`wslite security lockdown --profile <read-only|read-draft|authoring> [--service <svc>]`** — report-only: diff current env posture against the profile, emit exact steps (mint X in editor, set env var Y, remove primary from agent env, narrow `PROXY_AUTH_TOKEN_CLASSES`, rotate-first warning when applicable). Exit 0 always; `--json` for tooling.
2. **Config-generation integration** — `client-config.mjs --lockdown <profile>` emits client config referencing only the profile's env var names, so agent configs stop referencing the primary at all.
3. *(optional, needs explicit approval)* **Admin-gated live verification** — a proxy admin action reporting which token properties exist (names/booleans only), letting lockdown confirm server-side posture.

Each is unambiguous against this spec; none may mutate Script Properties.

## Related

- [Security model](../operations/security.md) — token classes and threat model
- [Diagnostics → Security audit](../operations/diagnostics.md#security-audit-wslite-security-audit) — today's posture reporting
- [Input Policies](../operations/input-policies.md) — allowlist script properties
