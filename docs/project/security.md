# Security Policy

The canonical security policy is `SECURITY.md` at the repository root.

## Important Rules

- Do not commit `.env`, `.clasp.json`, `.clasprc.json`, or `BootstrapSecret.gs`.
- Do not paste token values into issues, pull requests, docs, or logs.
- Use class-scoped tokens for least privilege where practical.
- Rotate tokens immediately after suspected exposure.

See `operations/security.md` for the full operational security model and token rotation workflow.
