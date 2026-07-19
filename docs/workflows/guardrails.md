# Shared Guardrails

Every workflow recipe inherits these rules. A recipe may add stricter rules for its own steps; none may relax these. They exist so that a user can let an agent run a multi-step workflow without worrying about silent sends, surprise mutations, or unbounded reads.

## Draft-first email

Email composed by a workflow is **always created as a draft** (`gmail_create_draft`, `gmail_create_draft_reply`, `gmail_create_draft_reply_all`). Sending — `gmail_send`, `gmail_send_draft`, reply/forward tools — happens only at an explicit confirmation gate where the user has seen the recipient list and content summary. Recipes never construct a send step whose recipients were not shown to the user.

## No unconfirmed send, share, or destructive action

Send, share, and destructive catalog tools are already server-gated (`confirm: true` / CLI `--yes`). Recipes add the workflow-level rule: the agent must pause at the recipe's confirmation gates and present *what will happen* — recipients, share targets and roles, what gets trashed — before invoking the tool at all. Confirmation applies per gate, not once for the whole run; a user approving a document share has not approved an email send three steps later.

## Create new artifacts; do not mutate existing ones

Workflows produce **new** documents, sheets, events, and task lists by default. Editing or moving a user's existing artifact is allowed only when the user explicitly named it as an edit target in the workflow inputs, and is then treated as a confirmation gate. Never "improve" existing content opportunistically.

## Bound every read

Date ranges, search queries, and listings are always bounded: an explicit range from inputs (with a stated default like "this week"), `maxResults` on every search/list call, and queries scoped as narrowly as the task allows. Recipes must not sweep an entire mailbox, calendar, or drive to answer a bounded question — over-reading private data is a failure even when nothing is written.

## Preserve the user-owned trust model

Everything runs through the user's own Apps Script proxies with the user's own class-scoped tokens. Recipes must not instruct agents to route data through third-party services, cache Workspace content outside the conversation, or request broader token classes than the recipe declares in `token_classes`. If a step needs a class the install doesn't have, the recipe stops and reports — it does not escalate.

## Report faithfully

At every gate and at the end, the agent reports what was actually created, changed, or skipped — with IDs/links for artifacts — so the user can verify or undo. Partial success is stated as partial; failures are never silently retried past a confirmation gate.
