# Contributing

Thanks for considering a contribution to `workspace-lite`.

This repository is a TypeScript monorepo plus Apps Script source. Contributions should keep local MCP behavior, Apps Script proxy behavior, docs, and safety validators in sync — changes should update all affected surfaces together.

## Development Setup

```bash
git clone https://github.com/joe-broadhead/workspace-lite.git
cd workspace-lite
npm ci
npm run build
```

Use Node.js 20 or newer.

## Local Validation

Run the full project gate (the same one CI runs) before opening a pull request:

```bash
npm run validate
npm run audit
mkdocs build --strict
git diff --check
```

Install docs dependencies before building docs locally:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r docs/requirements.txt
mkdocs serve
```

## Contributor Checklist

| Area | Check |
|---|---|
| Packages | Build and typecheck all affected workspaces. |
| Apps Script | Run `npm run generate:proxy-shell` when registry-driven shell metadata changes. |
| Validators | Update deterministic validators when safety-sensitive behavior changes. |
| Docs | Update MkDocs pages for setup, APIs, service tools, or operational changes. |
| Secrets | Do not commit `.env`, `.clasp.json`, `.clasprc.json`, `BootstrapSecret.gs`, tokens, deployment URLs with secrets, or generated private config. |

The root `CONTRIBUTING.md` contains the canonical contributor policy and should stay aligned with this page.
