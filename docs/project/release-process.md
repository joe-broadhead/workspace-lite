# Release Process

Releases are source releases published through GitHub tags. The packages are not currently published to npm.

The first public release target is `v0.0.0`. After that, use `v0.0.x` for rapid release-candidate iterations while setup, docs, validators, and deployment proof are still maturing. Move to `v0.1.0` when the project is ready to advertise a more stable public baseline.

## Versioning

Use semantic versioning syntax for tags and release titles:

```text
vMAJOR.MINOR.PATCH
```

Before `v0.1.0`, use this track:

| Version | Meaning |
|---|---|
| `v0.0.0` | First public source-release candidate |
| `v0.0.x` | Follow-up fixes, docs updates, validator hardening, setup fixes, release-process improvements |
| `v0.1.0` | First minor baseline after we are comfortable with public setup and release process maturity |

After `v0.1.0`, increment versions as follows:

| Change type | Version bump |
|---|---|
| Breaking setup, token, tool, or response behavior | Major |
| New tool, service capability, or documented workflow | Minor |
| Bug fix, docs fix, validator hardening, or internal cleanup | Patch |

## Pre-Release Checklist

1. Move relevant `CHANGELOG.md` entries from `Unreleased` to the target version.
2. Confirm `package.json` version matches the release version when the release represents a code baseline.
3. Confirm all workspace package versions match the intended release tag without the leading `v`.
4. Run `npm run validate`.
5. Run `npm run lint`.
6. Run `npm run audit`.
7. Run `mkdocs build --strict`.
8. Run `git diff --check`.
9. Confirm no secrets or local deployment files are tracked.
10. Commit the release-prep changes.

## Tagging

```bash
git tag v0.0.0
git push origin v0.0.0
```

The `Release` GitHub Actions workflow validates the tag, builds docs, creates a source archive, extracts the matching version section from `CHANGELOG.md`, and opens a GitHub release using those notes.

## Docs Deployment

Docs deploy from `master` through the `Docs` workflow. Releases should not be considered complete until the docs workflow has passed on the release commit.

## Post-Release

- Verify the GitHub release exists and contains the source archive.
- Verify the public docs site loads.
- Create or update follow-up issues for known limitations.
- Start a new `Unreleased` section in `CHANGELOG.md` if needed.
