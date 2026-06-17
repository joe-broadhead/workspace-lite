# Changelog

All notable changes to `workspace-lite` are documented here.

This project follows a lightweight release process: keep an `Unreleased` section on `master`, move completed entries into a versioned section before tagging, and create GitHub releases from tags named `vMAJOR.MINOR.PATCH`.

The first public source release target is `v0.0.0`. The project will iterate through `v0.0.x` releases until it is ready for `v0.1.0`.

## Unreleased

### Added

- Setup-key-gated token rotation for recovery when one-time bootstrap was consumed before `.env` was written.
- Windows Git Bash installation guidance and a PowerShell helper for persisting generated `.env` variables.

### Changed

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
