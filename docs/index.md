---
hide:
  - navigation
  - toc
---

# workspace-lite

<div class="subtitle" markdown>
MCP servers for Google Workspace
</div>

---

<div class="grid cards" markdown>

-   :material-rocket-launch:{ .lg .middle } __Getting Started__

    ---

    Install, deploy through Apps Script, and run your first tool.

    [:octicons-arrow-right-24: Installation](getting-started/installation.md)
    [:octicons-arrow-right-24: Quickstart](getting-started/quickstart.md)
    [:octicons-arrow-right-24: Setup Script](getting-started/setup-script.md)

-   :material-graph:{ .lg .middle } __Architecture__

    ---

    Mermaid diagrams, package layout, Zod validation, auth flow, rate limiting, and batch internals.

    [:octicons-arrow-right-24: Architecture Overview](architecture/overview.md)
    [:octicons-arrow-right-24: Security Model](architecture/security.md)

-   :material-package-variant-closed:{ .lg .middle } __Services__

    ---

    Deep dives into each of the 8 Google Workspace services.

    [:octicons-arrow-right-24: Drive](services/drive.md)
    [:octicons-arrow-right-24: Gmail](services/gmail.md)
    [:octicons-arrow-right-24: Calendar](services/calendar.md)
    [:octicons-arrow-right-24: Sheets](services/sheets.md)
    [:octicons-arrow-right-24: Slides](services/slides.md)
    [:octicons-arrow-right-24: Docs](services/docs.md)
    [:octicons-arrow-right-24: Tasks](services/tasks.md)
    [:octicons-arrow-right-24: Forms](services/forms.md)

-   :material-robot:{ .lg .middle } __Agent Skill__

    ---

    The `google-workspace` skill for OpenCode: tool catalogs, numbered workflows, and safety rules.

    [:octicons-arrow-right-24: Skill Overview](skill/overview.md)
    [:octicons-arrow-right-24: Workflows](skill/workflows.md)

-   :material-code-json:{ .lg .middle } __API Reference__

    ---

    Service tool listings, usage notes, examples, and batch action mappings.

    [:octicons-arrow-right-24: Drive](services/drive.md)
    [:octicons-arrow-right-24: Gmail](services/gmail.md)
    [:octicons-arrow-right-24: Calendar](services/calendar.md)
    [:octicons-arrow-right-24: Sheets](services/sheets.md)
    [:octicons-arrow-right-24: Slides](services/slides.md)
    [:octicons-arrow-right-24: Docs](services/docs.md)
    [:octicons-arrow-right-24: Tasks](services/tasks.md)
    [:octicons-arrow-right-24: Forms](services/forms.md)
    [:octicons-arrow-right-24: Batch Operations](api/batch.md)

-   :material-check-decagram:{ .lg .middle } __Project__

    ---

    Public release readiness, release process, contributing, changelog, and security policy.

    [:octicons-arrow-right-24: Release Readiness](project/public-release.md)
    [:octicons-arrow-right-24: Release Process](project/release-process.md)
    [:octicons-arrow-right-24: Contributing](project/contributing.md)

</div>

---

## Key Features

| Feature | Detail |
|---------|--------|
| :material-shield-key:{ .middle } **Bearer token auth** | One-time bootstrap per service. Token stored in Apps Script properties. No OAuth refresh loops, no service accounts. |
| :material-package-variant-closed:{ .middle } **8 services** | Drive, Gmail, Calendar, Sheets, Slides, Docs, Tasks, Forms &mdash; every service has a dedicated MCP server and Apps Script proxy. |
| :material-counter:{ .middle } **218 tools** | Drive&nbsp;(44), Gmail&nbsp;(39), Calendar&nbsp;(22), Sheets&nbsp;(33), Slides&nbsp;(25), Docs&nbsp;(26), Tasks&nbsp;(13), Forms&nbsp;(16). |
| :material-layers-triple:{ .middle } **Batch on all 8** | `{service}_batch` tools combine up to 20 operations in one round-trip. Sequential execution with per-op error collection. |
| :material-arrange-bring-forward:{ .middle } **Auto-positioning** | Slides text boxes, images, shapes, and tables auto-position below existing elements. Override with explicit coordinates. |
| :material-email-fast:{ .middle } **Draft-first email** | `gmail_create_draft`, `gmail_create_draft_reply`, `gmail_create_draft_reply_all` &mdash; review before sending. Never sends without explicit approval. |
| :material-clock-fast:{ .middle } **Rate limiting** | 100 weighted units/minute per proxy via Apps Script `CacheService`. Shared across all instances of a deployment. |

---

## Quick Install

```bash
git clone https://github.com/joe-broadhead/workspace-lite.git
cd workspace-lite
npm install && npm run build
./scripts/setup.sh
```

The setup script creates or reuses 8 Apps Script projects, pushes code, guides the manual web app deployments, bootstraps auth tokens, and prints OpenCode config.

[:material-arrow-right: Full installation guide](getting-started/installation.md)

---

## Release Readiness

This repository includes CI, strict docs builds, release workflow automation, contributor guidance, security policy, changelog, and deterministic safety validators.

[:material-arrow-right: Public release checklist](project/public-release.md)
