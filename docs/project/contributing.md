# Contributing

The canonical contributor guide is `CONTRIBUTING.md` at the repository root.

## Local Gates

Run these before opening a pull request:

```bash
npm run validate
npm run audit
mkdocs build --strict
git diff --check
```

## Documentation Changes

Install docs dependencies and preview locally:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r docs/requirements.txt
mkdocs serve
```

## Safety Rules

- Do not commit tokens, clasp files, bootstrap secrets, local env files, or generated docs output.
- Keep action risk classes and proxy-client token routing in sync.
- Add validator coverage for new security-sensitive behavior.
- Update `CHANGELOG.md` for user-facing changes.
