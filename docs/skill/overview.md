# Agent Skill Overview

## Skills In This Repo

This repo contains two OpenCode skills:

| Skill | Purpose |
|---|---|
| `google-workspace` | Teaches agents how to use the Workspace MCP tools safely. |
| `workspace-lite-installer` | Teaches agents how to install, push, refresh deployments, and troubleshoot the MCP setup. |

## What `google-workspace` Provides

The `google-workspace` skill equips LLM agents with everything they need to automate Google Workspace through the Apps Script MCP servers. It's a self-contained knowledge pack with:

- **Tool catalog** — compact parameter reference and descriptions for all 218 tools across Drive, Gmail, Calendar, Sheets, Slides, Docs, Tasks, and Forms.
- **Numbered workflows** — step-by-step tool sequences for common tasks (email triage, meeting prep, scheduling, spreadsheet creation, presentation building, data analysis).
- **Safety rules** — guardrails that prevent agents from sending email without approval, deleting files without confirmation, or creating calendar events without user consent.
- **Search syntax** — Gmail query operators, Drive search language, Calendar ISO formatting.
- **Service routing** — which tool prefix maps to which MCP server (`drive_*`, `gmail_*`, `calendar_*`, `sheets_*`, `slides_*`, `docs_*`, `tasks_*`, `forms_*`).

## Reference Structure

```
skills/google-workspace/
├── SKILL.md                         # Fast-start index: quick patterns, critical rules, when to load references
└── references/
    ├── tool-catalog.md              # Compact tool listing with parameter tables
    ├── workflows.md                 # Step-by-step workflows for 12+ common scenarios
    └── rules.md                     # Full safety rules, search syntax, parameter types
```

### SKILL.md

The entry point. Contains:

- Quick-start table with common task patterns and their tool sequences.
- A "When to Load References" table that tells agents which reference file to consult.
- The 5 most critical rules condensed into bullets.

Agents read this file when the skill is loaded. For complex multi-tool workflows, the SKILL.md instructs them to load the reference files.

### references/tool-catalog.md

The compact tool dictionary. Organized by service (Drive, Gmail, Calendar, Sheets, Slides, Docs, Tasks, Forms) with parameter summaries. Groups tools by category (read, write, manage, format, organize) for easier scanning. For exact schemas, use the MCP tool definitions or `shared/src/schemas.ts`.

### references/workflows.md

Common patterns encoded as numbered checklists. Each workflow lists tools in execution order with notes on what to do between calls (e.g., "group by urgency", "present options to user"). Covers email triage, context-aware reply, meeting prep, scheduling, spreadsheet building, data analysis, dashboard creation, and presentation building.

### references/rules.md

The complete rule set. Expands on the critical rules from SKILL.md with detailed "Always" and "Never" lists. Includes Gmail and Drive search syntax cheat sheets, Calendar ISO formatting examples, and parameter type notes (Zod-validated).

## How Agents Load and Use the Skill

### Loading

When an OpenCode agent encounters a task matching the skill's description ("Google Workspace automation"), it loads the skill. The skill system injects the content of `SKILL.md` into the agent's context:

```
Agent prompt ← SKILL.md injected
Agent sees quick-start table, critical rules, reference loading triggers
```

### Reference Loading

If the task is complex (multiple tools, multiple services, formatting-heavy), the agent follows the SKILL.md reference triggers:

| Trigger | Agent Action |
|---|---|
| Needs compact tool parameters | Reads `references/tool-catalog.md` |
| Task matches a known pattern | Reads `references/workflows.md` (specific section) |
| Needs safety rules or search syntax | Reads `references/rules.md` |

Each reference file is loaded on-demand to keep context small. The agent typically reads only the sections it needs.

### Execution Pattern

```
1. Agent receives task ("create a project tracker spreadsheet")
2. Skill is loaded → agent sees quick-start table
3. Agent recognizes "Build a Tracker" pattern → reads workflows.md
4. Agent needs tool parameter guidance → reads tool-catalog.md (Sheets section)
5. Agent executes:
   a. sheets_create_spreadsheet(name: "Q2 Project Tracker")
   b. sheets_batch([write headers, format, freeze, column widths])
   c. sheets_append_rows(initial data)
   d. sheets_create_chart(key metrics)
6. Agent presents results to user
```

## Safety Rules

These rules are enforced by the skill's instructions, not by the MCP server. The server will execute any valid request; the skill tells the agent to exercise restraint.

### Draft-First Email

| Action | Rule |
|---|---|
| `gmail_send` | **Never** without explicit user approval |
| `gmail_reply` / `gmail_reply_all` | **Never** without explicit user approval |
| `gmail_forward` | **Never** without explicit user approval |
| `gmail_create_draft` | Always use this first |
| `gmail_create_draft_reply` | Always use this first (threads properly) |
| `gmail_create_draft_reply_all` | Always use this first for group replies |

The agent creates a draft, presents it for review, and only sends after the user says "send" or "approve."

### No Deletion Without Confirmation

| Action | Rule |
|---|---|
| `drive_trash_file` / `drive_delete_file` | **Never** without confirmation |
| `gmail_trash_message` / `gmail_delete_message` | **Never** without confirmation |
| `calendar_delete_event` | **Never** without confirmation |
| `sheets_delete_sheet` | **Never** without confirmation (cannot undo) |
| `sheets_clear_range` | **Never** without confirming the range |

### Calendar Guardrails

- **Never** create a calendar event without suggesting a time and getting approval.
- `calendar_find_freebusy` only checks the deploying user's calendar — guest availability must be confirmed manually.

### Sharing Guardrails

- **Never** `drive_add_editor`, `drive_add_viewer`, or `drive_set_sharing` without confirmation.
- Changing sharing access is a security-sensitive operation.

### Search-First Principle

- Never assume a file, email, event, or sheet exists — search first.
- If a search returns 0 results, try different terms, wider ranges, or fewer filters.
- Use pagination (`page`/`pageToken`) for large result sets.

## Installation

```bash
mkdir -p ~/.config/opencode/skills
ln -sf "$(pwd)/skills/google-workspace" ~/.config/opencode/skills/google-workspace
ln -sf "$(pwd)/skills/workspace-lite-installer" ~/.config/opencode/skills/workspace-lite-installer
```

The skills are discovered automatically by OpenCode on startup. Restart OpenCode after adding or changing skill symlinks.
