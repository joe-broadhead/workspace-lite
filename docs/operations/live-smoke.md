# Live Smoke Harness

An **opt-in, maintainer-only** harness that exercises the deployed Apps Script proxies end to end through the `wslite` CLI. It never runs in public CI: it needs your private `.env` and touches your real Google account (with strict guardrails).

```bash
npm run build
npm run smoke:live -- --self-email you@example.com
```

Options:

| Flag | Default | Meaning |
|---|---|---|
| `--services tasks,gmail` | all 8 | Subset of service suites to run |
| `--self-email` | unset | Enables Gmail send-class and Drive sharing steps; **all** recipients are verified to equal this address before any call |
| `--prefix` | `wslite-smoke-<ts>` | Name prefix stamped on every created artifact |
| `--pace 5000` | 5000 ms | Delay between calls (per-service rate budgets are weighted and trip quickly) |
| `--out .smoke` | `.smoke` | Evidence output directory (gitignored) |
| `--keep` | off | Skip cleanup/verification, for debugging a failing step |

## What it does

Each service suite is **seed-first**: it creates run-prefixed artifacts, captures their real IDs, and drives the service's tools against those IDs — never placeholder params. Rate limiting is handled with automatic backoff (70s on `RATE_LIMITED`, up to 4 attempts).

Guardrails, enforced by the harness itself:

- Send-class Gmail steps and Drive viewer/editor grants are **skipped entirely** unless `--self-email` is provided, and a recipient guard refuses any `to`/`cc`/`bcc`/`guests`/`email`/`forward` value that is not exactly that address.
- The Drive public-sharing guard is exercised as an **expected refusal** (`ACTION_NOT_ALLOWED` while `ALLOW_PUBLIC_DRIVE_SHARING` is unset) — the harness never actually makes anything public.
- Vacation responder is touched only as a no-op update that keeps auto-reply disabled.
- Mutating/destructive steps only ever target IDs the run created.

## Cleanup and verification

Cleanup runs even when steps fail, then each suite verifies **zero active prefixed artifacts**, including container listings (calendars, tasklists, filters, drafts) — not just content searches. Two accepted residues, by product design:

- **Drive trash:** deletes are trash-only (`setTrashed`); trashed run artifacts are acceptable and purge with normal Drive retention.
- **Gmail labels:** a run label may remain because no label-delete tool exists; it is empty and harmless.

Known unseedable surfaces (documented skips): Forms responses (no create-response API; negative paths only), Gmail attachments (sends cannot attach), `calendar_respond_to_event`'s positive path (needs a real invite from another account), and `drive_export_as` on the plain-text drive fixture (needs a Workspace file — run the docs suite in the same invocation for export coverage there).

## Evidence

Each run writes to `<out>/<timestamp>/`:

- `matrix.tsv` — service, tool, PASS/FAIL/SKIP, and a sanitized note (error code + correlationId for failures; never payload contents, subjects, or bodies).
- `report.json` — per-service counts, cleanup verification result, and the run prefix.

This output is safe to paste into an issue as-is. When reporting a failure, include the correlationId so it can be matched against Apps Script logs (`clasp logs`).

## CI stance

The suites have offline structure tests (`tests/live-smoke-suites.test.ts`) that run in normal CI without credentials: they validate suite shape, prefix discipline, and the recipient guard. The live harness itself must stay out of CI — see the [security docs](security.md) for why credentials never enter public workflows.
