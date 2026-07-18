# Changelog

All notable changes to `workspace-lite` are documented here.

This project follows a lightweight release process: keep an `Unreleased` section on `master`, move completed entries into a versioned section before tagging, and create GitHub releases from tags named `vMAJOR.MINOR.PATCH`.

The first public source release target is `v0.0.0`. The project will iterate through `v0.0.x` releases until it is ready for `v0.1.0`.

## Unreleased

### Added

- `wslite doctor --deployments`: compares each `.env` deployment ID against `clasp deployments` per service — detects stale versions, `@HEAD` URLs, and unknown deployments with redeploy hints; deployment IDs are fingerprinted, never printed in full (JOE-142).

- `wslite doctor --live`: per-service live probes — unauthenticated health GET (with wrong-service URL detection) plus one authenticated read (param-check based for services without zero-arg reads) — with actionable remediation hints and redaction-safe output (JOE-141).

- Distribution decision record (`docs/project/distribution-decision.md`): source-first for `v0.0.x`, no npm publishing yet, generated client config as the distribution surface, with explicit revisit triggers (JOE-157).
- Private live smoke harness (`npm run smoke:live`): seed-first suites for all 8 services driving the wslite CLI against the maintainer's own deployments, with rate-limit backoff, a send-recipient guard, always-run cleanup, container-listing leftover verification, and sanitized evidence output (JOE-160).

### Fixed

- `gmail_list_labels` no longer fails with INTERNAL_ERROR when user labels exist; the response no longer includes `messageCount`, which relied on a method that does not exist on Apps Script `GmailLabel` (JOE-824).
- MCP formatters for object-returning tools (`gmail_profile`, gmail draft/send tools, `gmail_batch`, `calendar_batch`, `drive_about`, `drive_batch`) now render a summary plus the result payload instead of the misleading "Found 0 items"; added a regression test over all 218 catalog formatters (JOE-825).
- `gmail_get_vacation_responder` output no longer claims settings were "updated" on a read (JOE-825).
- `docs_delete_named_range` accepts `kix.`-prefixed named range IDs as returned by `docs_get_as_json` (JOE-836).

- `gmail_create_filter` now validates client-side that at least one criterion and one action field are provided, matching the Apps Script guard (JOE-712).
- `drive_update_revision` schema now requires `keepForever`, matching the Apps Script guard (JOE-713).
- `docs_update_page_setup` now validates client-side that at least one page setup field is provided, matching the Apps Script guard (JOE-720).
- `calendar_update_calendar` now refuses the primary calendar with a clear BAD_REQUEST instead of a generic UPDATE_FAILED, mirroring `calendar_delete_calendar` (JOE-710).
- `tasks_delete_tasklist` now returns NOT_FOUND for a nonexistent tasklist instead of a false `deleted:true` (JOE-815).

### Added

- Catalog-driven CLI package `@workspace-lite/cli` with bin `wslite` (optional `workspace-lite`) for full MCP tool parity over `createProxyClient`.
- Shared tool catalog under `shared/src/catalog/` as SSOT for MCP registration and CLI command generation.
- Setup-key-gated token rotation for recovery when one-time bootstrap was consumed before `.env` was written.
- Windows Git Bash installation guidance and a PowerShell helper for persisting generated `.env` variables.
- Docs: `docs/getting-started/cli.md`; error codes `CONFIRMATION_REQUIRED`, `ACTION_NOT_ALLOWED`, `BATCH_ACTION_NOT_ALLOWED`.

### Changed

- Documented honest Auth.gs `DEFAULT_AUTH_TOKEN_CLASSES` (`read,draft,write,destructive,share,send`) in AGENTS.md and security docs (was incorrectly described as `read,draft` default).
- Registry `toolActionMappings` reads catalog only (tools-file scrape removed).
- `build:packages` now uses an explicit TypeScript project list instead of shell glob expansion.
- `scripts/setup.sh` now reuses existing Apps Script projects by title, handles clasp v3 manifest creation behavior, skips already-bootstrapped `.env` entries, and can recover missing tokens through explicit rotation.
- Deployment helper scripts now use `clasp redeploy` for in-place deployment refreshes.

### Fixed

- First-time setup no longer creates duplicate Apps Script projects on aborted-run retries.
- Windows Git Bash builds no longer fail because `tsc -b packages/*` was passed as a literal glob.

## 0.0.0 - 2026-06-15

### Added

- Initial public source-release candidate for the eight-service Google Workspace MCP proxy.
- Drive, Gmail, Calendar, Sheets, Slides, Docs, Tasks, and Forms MCP servers.
- Apps Script proxy deployment model with bearer token authentication.
- Batch support across all eight services.
- MkDocs Material documentation site.
- Public-release project hygiene: CI, docs deploy, release workflow, contributing guide, security policy, release process docs, and public release checklist.
- Semantic safety validators for send-capable Gmail and Calendar modes, Drive allowlist-sensitive read surfaces, and proxy token routing.
- Forms environment variables in `.env.example`.
- `workspace-lite-installer` OpenCode skill for agent-assisted install, clasp push, deployment refresh, and troubleshooting workflows.

### Changed

- Gmail forwarding filters and vacation responder modes that can send mail now require send-class authorization.
- Calendar notification modes now expose `sendUpdates` and require send-class authorization when notifications are requested.
- Drive `fileList`, `fileSearch`, shared-drive, and change-list surfaces now respect configured allowlists more consistently.
- Proxy error envelopes now flow through the production client consistently with the test client and response formatters.
- Setup and docs no longer depend on unsupported clasp editor-opening or login-status commands.
- Bootstrap token examples avoid printing token values directly.
- Installation docs now distinguish user-required initial Apps Script GUI deployment and OAuth scope review from agent-safe `clasp push` and existing-deployment refresh operations.

### Fixed

- Existing-project setup now generates `BootstrapSecret.gs` before pushing Apps Script code.
- Top-level malformed input exceptions are classified as `BAD_REQUEST` instead of generic internal failures.
