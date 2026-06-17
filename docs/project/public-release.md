# Public Release Readiness

This checklist defines what must be true before a public GitHub release.

The first release target is `v0.0.0`. Use `v0.0.x` for hardening iterations, and reserve `v0.1.0` for the point where setup, docs, CI, release flow, and deployment smoke testing feel stable enough for a broader initial baseline.

## Required Gates

| Gate | Command or evidence |
|---|---|
| TypeScript and package build | `npm run typecheck` and `npm run build` |
| Unit and contract tests | `npm test` |
| Safety and architecture validators | `npm run validate` |
| Lint | `npm run lint` |
| Dependency audit | `npm run audit` |
| Docs build | `mkdocs build --strict` |
| Diff hygiene | `git diff --check` |
| Secret hygiene | Confirm `.env`, `.clasp.json`, `.clasprc.json`, and `BootstrapSecret.gs` are untracked |
| Release notes | `CHANGELOG.md` has a versioned entry for the target tag, starting with `0.0.0` |
| CI | GitHub Actions `CI` passes on the release commit |

## Release Candidate Criteria

- README explains what the project is, who it is for, how to install it, and where to find docs.
- MkDocs navigation includes setup, quickstart, architecture, service docs, operations, security, contributing, release process, and changelog.
- CI runs the same deterministic checks documented for contributors.
- Release workflow validates the tag before publishing a GitHub release.
- Security docs avoid commands that print tokens directly.
- Public issue templates and governance files exist or the maintainer has intentionally deferred them.

## Current Known Limits

- Web app deployment is still a manual Google Apps Script GUI step.
- Live Google Workspace smoke tests are not part of CI because they require private deployments and credentials.
- This repository is marked `private: true` in `package.json` because it is released as source, not as an npm package.

## Release Decision

The project is public-source ready when all required gates pass on a clean branch and the maintainer is comfortable with the manual Apps Script deployment model described in the docs.
