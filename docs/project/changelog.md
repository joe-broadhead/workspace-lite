# Changelog

All notable changes are tracked in the root `CHANGELOG.md`.

This docs page exists so public readers can find release history from the
published site navigation while keeping the repository changelog as the
canonical source of truth.

## Current Track

The first public source release target is `v0.0.0`. The project will iterate
through `v0.0.x` releases until setup, docs, validators, and deployment proof
are stable enough for `v0.1.0`.

## Current Unreleased Themes

- Public-release project hygiene: CI, docs deployment, release workflow,
  contributing guide, security policy, release process docs, and release
  checklist.
- Safety validators for send-capable Gmail and Calendar modes, Drive
  allowlist-sensitive read surfaces, and proxy token routing.
- Agent-assisted installation through the `workspace-lite-installer` skill.
- Setup and docs hardening around Apps Script GUI deployment, OAuth scope
  review, and token-safe examples.

## Release Notes Source

Use the repository changelog for exact version entries:

```text
CHANGELOG.md
```

Before tagging a release, move relevant entries from `Unreleased` to the target
version and verify the release workflow uses those notes.
