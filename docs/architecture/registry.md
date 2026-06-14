# Service Registry

`config/service-registry.json` is the canonical metadata seam for each Workspace service. It defines the service key, display title, Apps Script global module, proxy health identity, token environment variable, tool count, required Advanced Services, and OAuth scopes.

## Proxy Shell

`scripts/generate-proxy-shell.mjs` renders each service `Code.gs` from the registry and copies shared `Auth.gs` and `Response.gs` from `shared/apps-script/`. The generated shell owns bootstrap routing, request size checks, auth failure throttling, weighted rate limiting, health identity, service dispatch, and top-level correlation IDs.

`npm run validate:architecture` verifies generated `Code.gs` files match the registry and that service `Auth.gs` and `Response.gs` files have not drifted from the shared source.

## Action Registry Validation

The architecture validator builds an action registry from the Apps Script `ACTION_POLICIES`, `BATCH_ACTIONS`, MCP tool registrations, and batch docs. It fails when a tool targets an unregistered backend action, a batch action has no MCP tool, docs map an action to the wrong tool, or action risk metadata is missing.

This keeps tool names, backend action names, batch catalogs, service identities, scopes, and generated proxy shells from drifting silently.
