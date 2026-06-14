# Contributing

Thanks for considering a contribution to `workspace-lite`.

This repository is a TypeScript monorepo plus Apps Script source. Contributions should keep local MCP behavior, Apps Script proxy behavior, docs, and safety validators in sync.

## Development Setup

```bash
git clone https://github.com/joe-broadhead/workspace-lite.git
cd workspace-lite
npm ci
npm run build
```

Use Node.js 20 or newer.

## Local Validation

Run the full project gate before opening a pull request:

```bash
npm run validate
npm run audit
mkdocs build --strict
git diff --check
```

If you change docs, install docs dependencies first:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r docs/requirements.txt
mkdocs serve
```

## Safety Rules

- Do not commit `.env`, `.clasp.json`, `.clasprc.json`, `BootstrapSecret.gs`, tokens, deployment URLs with secrets, or generated private config.
- Do not add tool paths that print bearer tokens in docs, tests, logs, or errors.
- Keep risky operations behind the correct action class: `send`, `share`, or `destructive`.
- Update validators when adding a safety-sensitive tool surface.
- Use official Apps Script or Advanced Google service APIs only.

## Code Organization

| Area | Purpose |
|---|---|
| `packages/*/src` | MCP server entrypoints and tool registrations |
| `packages/*/apps-script` | Apps Script proxy implementation for each service |
| `shared/src` | Shared TypeScript schemas, response handling, proxy client, and test seams |
| `shared/apps-script` | Shared Apps Script auth and response helpers copied into each service |
| `config/service-registry.json` | Service metadata used by generated proxy shells and validators |
| `scripts/validate-*.mjs` | Deterministic local release gates |
| `docs/` | MkDocs Material documentation source |

## Pull Request Checklist

- Tests and validators pass locally.
- Documentation is updated when behavior, setup, or tool surfaces change.
- `CHANGELOG.md` has an `Unreleased` entry for user-facing changes.
- `npm run generate:proxy-shell` was run if registry-driven proxy shell metadata changed.
- No generated `site/`, `dist/`, secret, or local deployment files are committed.

## Reporting Issues

Use GitHub Issues for public bug reports and feature requests. Include:

- Service and tool name.
- Expected behavior.
- Actual behavior and sanitized error output.
- Validation commands run.
- Whether the issue is local MCP behavior, Apps Script runtime behavior, docs, or setup.
