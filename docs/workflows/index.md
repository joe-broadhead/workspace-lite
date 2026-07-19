# Workflow Recipes

Recipes are documented, inspectable procedures for cross-service agent workflows — an agent composes existing catalog tools by following the recipe, rather than calling a bespoke "workflow tool". This keeps every step visible and confirmable, and reveals which workflows deserve explicit tooling later.

Recipes live in two places, deliberately aligned:

- **`docs/workflows/<recipe>.md`** (this section) — the authoritative, full recipe.
- **`skills/google-workspace/references/workflows.md`** — the agent skill points here for flagship recipes and carries only short tool sequences of its own.

Every recipe follows the format below, enforced by `tests/workflow-recipes.test.ts` — a new recipe that misses a section or misdeclares a service fails CI. All recipes inherit the [shared guardrails](guardrails.md); a recipe may tighten them, never loosen them.

## Frontmatter

Each recipe starts with flat YAML frontmatter:

```yaml
---
recipe: meeting-pack            # slug, must match the filename
title: Meeting Pack             # human name
outcome: One sentence stating the artifacts/end state the recipe produces.
services: [calendar, drive, docs, gmail, tasks]
token_classes: [read, write, send]
status: skeleton                # skeleton | ready
---
```

- `services` — every service whose tools the recipe may call, and nothing more. Users on partial installs use this to see whether a recipe is available to them.
- `token_classes` — the highest-risk classes the recipe can touch. A recipe that never sends email must not list `send`.
- `status` — `skeleton` while the flow is specified but not yet dogfooded end-to-end; `ready` once it has been exercised live.

## Required sections

Every recipe has exactly these `##` sections, in this order:

| Section | Contents |
|---|---|
| `## Outcome` | What exists when the recipe finishes, stated concretely (artifact names, locations, states). |
| `## Inputs` | Each input with type, whether required, default, and bounds (date ranges, max results). |
| `## Preflight` | Checks before any mutation: services configured (`wslite doctor`), inputs resolvable to real IDs, bounds applied. Preflight is read-only. |
| `## Steps` | Numbered tool-by-tool sequence using catalog tool names (`calendar_get_event`, `docs_create_document`, …), with per-step notes on what to carry forward. Mutating steps are marked **[write]**, **[send]**, **[share]**, or **[destructive]**. |
| `## Confirmation gates` | Exactly where the agent must stop and show the user what will happen before proceeding (every send/share/destructive step, plus anything the recipe adds). |
| `## Partial failure` | What to do when a step fails midway: what is safe to retry, what to skip, what to report — recipes never leave the user guessing what was created. |
| `## Cleanup and rollback` | How to undo what the recipe created (trash-first semantics, draft deletion), and what cannot be undone. |
| `## Validation checklist` | Post-run checks the agent performs and reports (artifacts exist, links resolve, nothing sent without a gate). |
| `## Example prompt` | One realistic user prompt that should trigger this recipe. |

## Writing a new recipe

1. Copy an existing recipe (e.g. [Meeting Pack](meeting-pack.md)) as the skeleton.
2. Set `status: skeleton`, fill every section — empty sections are not allowed; write "None." with a reason if truly not applicable.
3. Add the page to the `Workflows` group in `mkdocs.yml` nav.
4. Run `npm test` (format enforcement) and the strict docs build.
5. Flip to `status: ready` only after a live dogfood run of the full flow.

## Recipes

| Recipe | Services | Status |
|---|---|---|
| [Meeting Pack](meeting-pack.md) | calendar, drive, docs, gmail, tasks | ready |
