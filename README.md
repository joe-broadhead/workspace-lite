# workspace-lite

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen.svg?logo=nodedotjs&logoColor=white)](package.json)
[![Docs](https://img.shields.io/badge/docs-mkdocs%20material-blue.svg?logo=materialformkdocs&logoColor=white)](https://joe-broadhead.github.io/workspace-lite/)
[![CI](https://github.com/joe-broadhead/workspace-lite/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/joe-broadhead/workspace-lite/actions/workflows/ci.yml)

```text
                    _                                   _ _ _
__      _____  _ __| | _____ _ __   __ _  ___ ___      | (_) |_ ___
\ \ /\ / / _ \| '__| |/ / __| '_ \ / _` |/ __/ _ \_____| | | __/ _ \
 \ V  V / (_) | |  |   <\__ \ |_) | (_| | (_|  __/_____| | | ||  __/
  \_/\_/ \___/|_|  |_|\_\___/ .__/ \__,_|\___\___|     |_|_|\__\___|
                            |_|
        Google Workspace MCP servers
        through Apps Script proxies.
```

`workspace-lite` gives OpenCode-compatible agents local MCP servers for Google
Workspace: Drive, Gmail, Calendar, Sheets, Slides, Docs, Tasks, and Forms. Each
service runs through a small Apps Script web app deployed as you, so agents can
use your Workspace data without service accounts or per-tool OAuth loops.

A catalog-driven **CLI** (`wslite`) exposes the same 218 tools for humans and
scripts — same proxy client, schemas, risk classes, and confirm semantics as MCP.

## What It Does

- **Exposes 218 MCP tools** across 8 Google Workspace services (and the same surface via `wslite`).
- **Keeps Google calls inside Apps Script** with one web app proxy per service.
- **Uses bearer-token auth** with one-time bootstrap and optional class-scoped tokens (primary default classes are the full Auth.gs set; see docs).
- **Classifies risky actions** as `send`, `share`, or `destructive` so agents/CLI can ask before crossing user-review boundaries.
- **Supports batch tools for every service** with up to 20 same-service operations and per-operation results.
- **Ships agent skills** for safe Workspace usage and guided installation/deployment refreshes.

## Service Surface

| Service | Tools | Batch | Highlights |
|---|---:|---|---|
| `drive` | 44 | Yes | Files, folders, permissions, sharing, comments, replies, revisions, shared drives, changes |
| `gmail` | 39 | Yes | Search, read, drafts, send, replies, forwarding, labels, filters, vacation responder |
| `calendar` | 22 | Yes | Events, free/busy, calendars, settings, Meet links, RSVP, colors, event moves |
| `sheets` | 33 | Yes | Values, formulas, formatting, charts, sorting, validations, protections, row operations |
| `slides` | 25 | Yes | Slides, text, images, shapes, tables, notes, backgrounds, geometry, links, z-order |
| `docs` | 26 | Yes | Documents, paragraphs, headings, lists, tables, images, formatting, bookmarks, named ranges |
| `tasks` | 13 | Yes | Task lists and tasks with create, update, move, delete, and clear-completed operations |
| `forms` | 16 | Yes | Forms, settings, items, destinations, responses, and response deletion |

## 30-Second Shape

```text
OpenCode or MCP client
  <-> local TypeScript MCP server over stdio
  <-> Apps Script web app over HTTPS with bearer token
  <-> Google Workspace APIs as USER_DEPLOYING
```

Every service has the same deployment shape:

1. A local TypeScript MCP package registers tools and validates inputs.
2. An Apps Script web app receives signed proxy requests.
3. Apps Script calls Google APIs with the deploying user's permissions.
4. Responses return through a normalized success/error envelope.

## Quick Start

```bash
git clone https://github.com/joe-broadhead/workspace-lite.git
cd workspace-lite
./scripts/setup.sh --dry-run
./scripts/setup.sh
```

The setup script installs dependencies, builds packages, creates or reuses Apps
Script projects, pushes proxy code, prints Apps Script editor URLs, guides the
manual web app deployment step, bootstraps tokens, and prints MCP config.

Windows is supported through Git Bash or MSYS2 with Node 20+ and `clasp`.
The setup script emits Windows OpenCode commands that call the local
`node_modules\\.bin\\tsx.cmd` wrapper directly, avoiding direct-spawn `npx`
resolution failures.

The Google deployment step stays intentionally manual: for each service, open
the printed Apps Script editor URL, choose **Deploy -> New deployment -> Web app**,
set **Execute as: Me**, set **Who has access: Anyone**, authorize scopes if
prompted, and paste the `/exec` URL back into setup.

## Agent-Assisted Setup

Install the included installer skill when you want an agent to help run setup,
push proxies, verify deployments, or refresh existing services:

```bash
mkdir -p ~/.config/opencode/skills
ln -sf "$(pwd)/skills/workspace-lite-installer" ~/.config/opencode/skills/workspace-lite-installer
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
```

Agents can handle local commands, but the user must review Google OAuth scopes
and the first Apps Script web app deployment settings in the Apps Script GUI.

## Documentation

- Docs site: <https://joe-broadhead.github.io/workspace-lite/>
- Installation: <https://joe-broadhead.github.io/workspace-lite/getting-started/installation/>
- Quickstart: <https://joe-broadhead.github.io/workspace-lite/getting-started/quickstart/>
- Service guides: <https://joe-broadhead.github.io/workspace-lite/services/drive/>
- Batch operations: <https://joe-broadhead.github.io/workspace-lite/api/batch/>
- Security model: <https://joe-broadhead.github.io/workspace-lite/operations/security/>
- Diagnostics & troubleshooting: <https://joe-broadhead.github.io/workspace-lite/operations/diagnostics/>
- Contributing: <https://joe-broadhead.github.io/workspace-lite/project/contributing/>
- Changelog: <https://joe-broadhead.github.io/workspace-lite/project/changelog/>

## Development

```bash
npm ci
npm run check:install
npm run validate
npm run audit
```

Docs:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r docs/requirements.txt
mkdocs build --strict
mkdocs serve
```

Useful scripts:

| Script | Purpose |
|---|---|
| `npm run build` | Build shared package and all service packages |
| `npm run typecheck` | Type-check the repository |
| `npm test` | Run the Node test suite |
| `npm run validate` | Run deterministic release gates |
| `npm run generate:proxy-shell` | Regenerate service `Code.gs` shells from registry metadata |
| `npm run docs:build` | Build MkDocs strictly |
| `npm run docs:serve` | Preview docs locally |

## Public Release

This repository is a public-source release candidate. CI, strict docs builds,
release workflow automation, contributor guidance, security policy, changelog,
and deterministic safety validators are in place. Production use still requires
deploying the Apps Script web apps into the target Google account.

See:

- `docs/project/public-release.md`
- `docs/project/release-process.md`
- `CHANGELOG.md`
- `SECURITY.md`

## Security

Never commit `.env`, `.clasp.json`, `.clasprc.json`, `BootstrapSecret.gs`,
bearer tokens, deployment URLs with secrets, or private deployment details.

Security docs:

- `SECURITY.md`
- `docs/operations/security.md`
- `docs/operations/input-policies.md`

## License

MIT. See `LICENSE`.
