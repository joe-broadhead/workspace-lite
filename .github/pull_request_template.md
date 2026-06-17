## Summary

Describe the change and why it is needed.

## Validation

- [ ] `npm run validate`
- [ ] `npm run lint`
- [ ] `npm run audit`
- [ ] `mkdocs build --strict`
- [ ] `git diff --check`

## Documentation

- [ ] README or MkDocs updated when behavior changed
- [ ] `CHANGELOG.md` updated for user-facing changes
- [ ] No docs examples print token values

## Security

- [ ] No `.env`, `.clasp.json`, `.clasprc.json`, `BootstrapSecret.gs`, tokens, or private deployment details are included
- [ ] Risky actions keep correct `send`, `share`, or `destructive` authorization classes
- [ ] Validators or tests cover security-sensitive behavior changes
