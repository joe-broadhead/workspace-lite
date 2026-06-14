# workspace-lite

MCP servers for Google Workspace, backed by per-service Google Apps Script web app proxies.

`workspace-lite` lets OpenCode-compatible agents work with Drive, Gmail, Calendar, Sheets, Slides, Docs, Tasks, and Forms through local TypeScript MCP servers. The remote Google calls run inside Apps Script as the deploying user, so there is no OAuth dance per tool call.

## Status

Public-source release candidate. The source, docs, CI, release workflow, and safety validators are in place. A production deployment still requires the documented manual Apps Script web app deployment step for each service.

## What You Get

| Service | Tools | Batch | Highlights |
|---|---:|---|---|
| `drive` | 44 | Yes | Files, folders, permissions, sharing, comments, replies, revisions, shared drives, changes |
| `gmail` | 39 | Yes | Search, read, drafts, send, replies, forwarding, labels, filters, vacation responder |
| `calendar` | 22 | Yes | Events, free/busy, calendars, settings, Meet links, RSVP, colors, event moves |
| `sheets` | 33 | Yes | Values, formulas, formatting, charts, sorting, validations, protections, row ops |
| `slides` | 25 | Yes | Slides, text, images, shapes, tables, notes, backgrounds, geometry, links, z-order |
| `docs` | 26 | Yes | Documents, paragraphs, headings, lists, tables, images, formatting, bookmarks, named ranges |
| `tasks` | 13 | Yes | Task lists and tasks with create, update, move, delete, and clear-completed operations |
| `forms` | 16 | Yes | Forms, settings, items, destinations, responses, and response deletion |
| Total | 218 | All 8 | Dedicated MCP server and Apps Script proxy per service |

## Architecture

```text
OpenCode or MCP client
  <-> local TypeScript MCP server over stdio
  <-> Apps Script web app over HTTPS with bearer token
  <-> Google Workspace APIs as USER_DEPLOYING
```

Key properties:

- No service account required.
- One Apps Script project per Google Workspace service.
- One primary bearer token per service, with optional class-scoped tokens.
- Risky actions are classified as `send`, `share`, or `destructive` and require explicit confirmation where appropriate.
- Batch tools execute up to 20 same-service operations sequentially with per-operation results.

## Quick Start

### Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20 or newer |
| Google account | Access to the Workspace services you plan to use |
| clasp | Latest `@google/clasp` CLI |

Run the setup assistant:

```bash
git clone https://github.com/joe-broadhead/workspace-lite.git
cd workspace-lite
./scripts/setup.sh
```

The setup script installs dependencies, builds the packages, creates or reuses Apps Script projects, pushes proxy code, prints Apps Script editor URLs, guides the manual Apps Script web app deployment step, bootstraps tokens, and prints OpenCode MCP config. Use `./scripts/setup.sh --dry-run` first if you want to preview the flow without creating projects, bootstrap secrets, or `.env` entries.

The Apps Script web app deployment step is manual: open each printed editor URL, choose **Deploy → New deployment → Web app**, set **Execute as: Me**, set **Who has access: Anyone**, authorize scopes if prompted, and paste the `/exec` URL back into setup.

Agent-assisted setup is supported. Install the repo's `workspace-lite-installer` skill to teach OpenCode agents how to run setup, `clasp push`, and deployment refresh commands while still routing Google OAuth scope review and initial web app deployment verification through the Apps Script GUI.

Full setup documentation: <https://joe-broadhead.github.io/workspace-lite/getting-started/installation/>

## Documentation

| Resource | Link |
|---|---|
| Docs site | <https://joe-broadhead.github.io/workspace-lite/> |
| Installation | <https://joe-broadhead.github.io/workspace-lite/getting-started/installation/> |
| Quickstart | <https://joe-broadhead.github.io/workspace-lite/getting-started/quickstart/> |
| Architecture | <https://joe-broadhead.github.io/workspace-lite/architecture/overview/> |
| Service guides | <https://joe-broadhead.github.io/workspace-lite/services/drive/> |
| Security model | <https://joe-broadhead.github.io/workspace-lite/operations/security/> |
| Release process | <https://joe-broadhead.github.io/workspace-lite/project/release-process/> |

Build docs locally:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r docs/requirements.txt
mkdocs build --strict
mkdocs serve
```

## Development

Run the full local gate:

```bash
npm run validate
npm run audit
mkdocs build --strict
git diff --check
```

Useful scripts:

| Script | Purpose |
|---|---|
| `npm run build` | Build shared package and all service packages |
| `npm run typecheck` | Type-check the repository |
| `npm test` | Run Node test suite |
| `npm run validate` | Run deterministic release gates |
| `npm run generate:proxy-shell` | Regenerate service `Code.gs` shells from registry metadata |
| `npm run docs:build` | Build MkDocs strictly |
| `npm run docs:serve` | Preview docs locally |

## CI and Releases

GitHub Actions workflows:

| Workflow | Trigger | Purpose |
|---|---|---|
| `CI` | Pull requests and pushes to `main` | TypeScript, build, tests, validators, audit, docs strict build |
| `Docs Deploy` | Docs changes on `main` or manual dispatch | Build and deploy MkDocs to GitHub Pages |
| `Release` | Tags matching `v*.*.*` or manual dispatch | Validate release candidate and create a GitHub release archive |

The first release target is `v0.0.0`. We will iterate `v0.0.x` until the project is ready for `v0.1.0`. See `docs/project/release-process.md` and `CHANGELOG.md`.

## Security

Never commit or paste `.env`, `.clasp.json`, `.clasprc.json`, `BootstrapSecret.gs`, bearer tokens, or private deployment details.

Security docs:

- `SECURITY.md`
- `docs/operations/security.md`
- `docs/operations/input-policies.md`

## Contributing

Read `CONTRIBUTING.md` before opening issues or pull requests. Public behavior changes should update docs and `CHANGELOG.md`.

## License

MIT. See `LICENSE`.
