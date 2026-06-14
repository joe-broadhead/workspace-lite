# Agent Skill Overview

`workspace-lite` ships agent skills that teach coding agents how to install the project and how to use the Google Workspace MCP tools safely.

## Included Skills

| Skill | Purpose |
|---|---|
| `google-workspace` | Tool catalog, safety rules, and common workflows for Drive, Gmail, Calendar, Sheets, Slides, Docs, Tasks, and Forms. |
| `workspace-lite-installer` | Installation, deployment, refresh, and verification workflows for local Apps Script projects. |

## `google-workspace`

The `google-workspace` skill is the runtime usage guide for agents. It keeps the tool catalog compact, points agents to deeper references only when needed, and highlights high-risk operations that require user approval.

Reference files:

| File | Use |
|---|---|
| `skills/google-workspace/SKILL.md` | Fast-start patterns, critical safety rules, and routing guidance. |
| `skills/google-workspace/references/tool-catalog.md` | Compact service-by-service tool reference. |
| `skills/google-workspace/references/workflows.md` | Multi-step workflows for email, calendar, sheets, slides, docs, Drive, Tasks, and Forms. |
| `skills/google-workspace/references/rules.md` | Expanded safety rules, search syntax, and parameter notes. |

## `workspace-lite-installer`

The installer skill helps agents operate the setup and deployment scripts without hiding the parts that require a human review. It covers dry runs, first-time setup, deployment refreshes, verification, and troubleshooting.

Reference files:

| File | Use |
|---|---|
| `skills/workspace-lite-installer/SKILL.md` | Installation workflow, safety boundaries, and script routing. |
| `skills/workspace-lite-installer/scripts/deploy-all.sh` | Refresh every Apps Script deployment. |
| `skills/workspace-lite-installer/scripts/deploy-single.sh` | Refresh one service deployment. |
| `skills/workspace-lite-installer/scripts/verify-deployments.sh` | Check deployment URLs and health responses. |

## Safety Model

The skills instruct agents to search before acting, create Gmail drafts before sending, ask before destructive or sharing operations, and ask before creating calendar events. The MCP servers still enforce schema validation, auth, response contracts, rate limits, and action classes; the skills add agent-facing operating discipline on top.

## Installation

```bash
mkdir -p ~/.config/opencode/skills
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
ln -sf "$(pwd)/skills/workspace-lite-installer" ~/.config/opencode/skills/workspace-lite-installer
```

Restart the agent environment after adding or updating skill symlinks.
