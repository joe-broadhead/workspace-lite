# High-Risk Input Policies

workspace-lite validates high-risk inputs on the Apps Script proxy, not only in TypeScript schemas. Server-side validation protects batch calls, custom clients, and stale generated clients.

## Calendar IDs And Times

Default calendar fallback is allowed only when `calendarId` is absent. If a caller supplies a `calendarId`, the proxy validates the ID format and returns `BAD_REQUEST` for invalid syntax or `NOT_FOUND` when the calendar cannot be resolved.

Calendar create and update mutations validate ISO datetime inputs and require `endTime` to be after `startTime` before mutating an event.

## URL Fetch And Image Insertion

Docs and Slides image insertion tools require `https` URLs. Non-HTTPS URLs are rejected before any fetch.

Optional host allowlists are read from Apps Script script properties:

| Property | Applies to | Behavior |
|---|---|---|
| `ALLOWED_IMAGE_HOSTS` | Docs and Slides image insertion | Comma-separated hosts or domains. Subdomains are allowed when the base domain is listed. |
| `ALLOWED_DOCS_IMAGE_HOSTS` | Docs image insertion | Additional Docs-specific hosts. |
| `ALLOWED_SLIDES_IMAGE_HOSTS` | Slides image insertion | Additional Slides-specific hosts. |

Fetched image responses must return a 2xx HTTP status, an `image/*` content type, and fit under the service image byte limit.

## Email And Sharing Allowlists

Gmail send/reply/forward actions can be restricted with recipient allowlists:

| Property | Behavior |
|---|---|
| `ALLOWED_EMAIL_RECIPIENTS` | Comma-separated exact recipient addresses. |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated domains. Values may include or omit the leading `@`. |

Drive public sharing is opt-in. Public access levels such as `ANYONE` and `ANYONE_WITH_LINK` are blocked unless one of these script properties is set to true:

| Property | Behavior |
|---|---|
| `ALLOW_PUBLIC_DRIVE_SHARING` | Enables public Drive sharing actions. |
| `ALLOW_PUBLIC_SHARING` | Backward-compatible shared switch for public sharing. |

Share and send classes still require `confirm=true` after explicit user approval.

## Formula Injection

Formula injection is blocked in generic Sheets value-writing tools. `rangeWrite` and `rowsAppend` reject string cell values beginning with formula metacharacters: `=`, `+`, `-`, or `@`.

Use `sheets_set_formula` for intentional formulas. The formula-specific tool requires formulas to start with `=`.

## A1 Ranges, Colors, And Dimensions

Sheets range-taking tools validate A1 notation server-side before mutation. Formatting colors accept named colors or hex colors. Numeric dimensions such as font size, chart width/height, column width, frozen row counts, and sort columns must be finite and within service bounds.
