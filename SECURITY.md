# Security Policy

`workspace-lite` runs Apps Script web apps as the deploying Google user. Treat proxy URLs, bearer tokens, clasp credentials, and generated bootstrap secrets as sensitive.

## Supported Versions

Only the current `main` branch and the latest GitHub release receive security fixes.

## Reporting a Vulnerability

Please report vulnerabilities privately before public disclosure.

If GitHub private vulnerability reporting is enabled, use the repository security advisory flow. Otherwise, contact the maintainer directly and include a minimal, sanitized reproduction.

Do not include live bearer tokens, deployment URLs containing private context, Google account identifiers, customer data, or private documents in reports.

## Token Handling Rules

- Never commit `.env`, `.clasp.json`, `.clasprc.json`, `BootstrapSecret.gs`, or Apps Script tokens.
- Never paste or print token values in issues, pull requests, docs, logs, or support threads.
- Prefer presence checks over value checks when debugging environment configuration.
- Rotate tokens immediately if they are exposed.

## Security Model

- Each service has its own Apps Script web app deployment and bearer token.
- Optional class-scoped tokens can limit callers to read, write, send, share, destructive, or admin actions.
- Apps Script runs as `USER_DEPLOYING`, so Google-side permissions are the deploying user's permissions.
- Risky operations require the correct token class and, where applicable, explicit `confirm: true`.

See the full security documentation at `docs/operations/security.md`.
