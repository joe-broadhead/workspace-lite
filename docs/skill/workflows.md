# Agent Skill Workflows

The skills encode repeatable workflows so agents can move quickly while preserving user review for sensitive actions.

## Installation

1. Run `./scripts/setup.sh --dry-run` to preview dependencies, project creation, deployment steps, and generated config.
2. Run `./scripts/setup.sh` when ready.
3. Review Google OAuth scopes and create each Apps Script web app deployment in the Apps Script GUI.
4. Paste each `/exec` deployment URL back into setup.
5. Let setup bootstrap tokens and print MCP server configuration.

## Deployment Refresh

1. Confirm `.env` contains the service deployment URLs and tokens.
2. Run `skills/workspace-lite-installer/scripts/deploy-single.sh <service>` for one service, or `deploy-all.sh` for every service.
3. Use `verify-deployments.sh` to check health endpoints.
4. Re-run a simple read-only tool for the affected service.

## Email Triage

1. Search with `gmail_search_messages`.
2. Read important messages with `gmail_get_message` or full threads with `gmail_get_thread`.
3. Group results by urgency, sender, and required action.
4. Draft replies with `gmail_create_draft_reply` or `gmail_create_draft_reply_all`.
5. Send only after explicit user approval.

## Calendar Scheduling

1. Find events and availability with `calendar_list_events` and `calendar_find_freebusy`.
2. Present candidate times to the user.
3. Create or update events only after approval.
4. Note that guest availability may need manual confirmation.

## Workspace Creation

1. Create the target file with the service-specific create tool.
2. Use batch tools for setup work such as headers, formatting, slides, document sections, or form items.
3. Read the result back with the relevant get/list tool.
4. Share or delete only after explicit confirmation.

## Data Review

1. Search or list the target files first.
2. Read only the needed ranges, pages, slides, messages, or metadata.
3. Summarize outside the tool call.
4. Write back summaries or dashboards with batch tools when requested.

## Safety Checks

Before using a high-risk tool, agents should verify:

| Action class | Examples | Required user step |
|---|---|---|
| Send | Send email, reply, forward, calendar updates with guest notifications | Approve final content and recipients. |
| Share | Add editors/viewers, change link access | Confirm identity and access level. |
| Destructive | Delete, trash, clear ranges, remove events | Confirm target and consequence. |

For full details, see `skills/google-workspace/references/workflows.md` and `skills/google-workspace/references/rules.md`.
