# Troubleshooting

## Deployment Issues

### Web App Not Accessible

**Symptom:** MCP server returns `"FetchError"` or `"Connection refused"` when calling the proxy URL.

**Likely causes:**

1. **Web app not deployed.** Each service requires a manual deployment via the Apps Script editor.
2. **Deployment URL is incorrect.** Verify the URL in your `.env` file matches the deployment URL from the Apps Script editor.
3. **Execute-as setting is wrong.** The deployment must be "Execute as: Me (USER_DEPLOYING)".
4. **Access setting is wrong.** The deployment must allow anonymous access, not only signed-in Google users.
5. **Initial deployment was created only with `clasp deploy`.** Use the Apps Script editor GUI for initial setup so the deployment type, anonymous access, and OAuth scopes are explicitly verified.

**Resolution:**

```bash
# Verify the deployment is accessible
curl -sL "https://script.google.com/macros/s/<deployment-id>/exec"

# Expected output (healthy check):
# {"success":true,"data":{"status":"healthy","version":"<health-version>","service":"google-workspace-proxy-drive"}}
```

If this returns an error or no response, re-deploy:

```bash
open "https://script.google.com/d/<script-id>/edit"
```

In the Apps Script editor: **Deploy → New deployment → Select type: Web app → Execute as: Me → Who has access: Anyone**. Update the URL in your `.env` file.

Do not use `clasp deploy` as the replacement for the GUI deployment step during installation. It can create a deployment record that still returns a Google access-denied HTML page when used as the public web app URL. After a user-created web app deployment exists, `clasp deploy -i <deployment-id> -V <version>` is appropriate for refreshing that same URL.

### Scopes Not Authorized

**Symptom:** Every request returns `"INTERNAL_ERROR"` or `"Authorization is required to perform that action"`.

**Resolution:**

```bash
open "https://script.google.com/d/<script-id>/edit"
```

In the Apps Script editor, run any function (e.g., `doGet`). Google will prompt you to authorize the required scopes. Accept the permissions. After authorization, re-deploy the web app to apply the new scopes.

Each service requires its own set of OAuth scopes:

| Service | Required Scope |
|---|---|
| Drive | `https://www.googleapis.com/auth/drive` |
| Gmail | `https://www.googleapis.com/auth/gmail.modify`, `https://www.googleapis.com/auth/gmail.settings.basic`, `https://www.googleapis.com/auth/script.send_mail` |
| Calendar | `https://www.googleapis.com/auth/calendar` |
| Sheets | `https://www.googleapis.com/auth/spreadsheets` |
| Slides | `https://www.googleapis.com/auth/presentations` |
| Docs | `https://www.googleapis.com/auth/documents` |
| Tasks | `https://www.googleapis.com/auth/tasks` |
| Forms | `https://www.googleapis.com/auth/forms`, `https://www.googleapis.com/auth/spreadsheets` |

---

## Token Issues

### Lost Token

**Symptom:** MCP server returns `"UNAUTHORIZED: Invalid or missing auth token"`.

**Resolution (if you have access to the script):**

```bash
open "https://script.google.com/d/<script-id>/edit"
```

In the Apps Script editor, go to **Project Settings → Script Properties** (gear icon). The token is stored under `PROXY_AUTH_TOKEN`. If it's missing or you need to regenerate:

1. Delete the property `PROXY_BOOTSTRAPPED`.
2. Delete the property `PROXY_AUTH_TOKEN`.
3. Re-deploy the web app (new deployment required if the URL changed).
4. Read the setup key from the generated, untracked `BootstrapSecret.gs` file and hit the bootstrap endpoint again:

```bash
TOKEN_RESPONSE="$(curl -sL "https://script.google.com/macros/s/<deployment-id>/exec?bootstrap=1&setupKey=<bootstrap-setup-key>")"
TOKEN_RESPONSE="$TOKEN_RESPONSE" node -e 'const fs = require("fs"); const r = JSON.parse(process.env.TOKEN_RESPONSE); if (!r.success) throw new Error(r.error?.message || "Bootstrap failed"); fs.appendFileSync(".env", `export GOOGLE_WORKSPACE_<SERVICE>_PROXY_TOKEN=${JSON.stringify(r.data.token)}\n`)'
```

5. Update the token in your `.env` file.
6. Restart OpenCode or re-source your environment.

### Already Bootstrapped

**Symptom:** Bootstrap endpoint returns `"FORBIDDEN: Bootstrap has already been completed."`

This is expected — the bootstrap endpoint is single-use by design. If you need the token, check the Apps Script script properties as described above. The token is there; it's just not retrievable via the bootstrap endpoint after the first use.

---

## Common Errors

### UNAUTHORIZED

```json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Invalid or missing auth token" } }
```

**Causes:**

- Environment variable `GOOGLE_WORKSPACE_<SERVICE>_PROXY_TOKEN` is not set or is wrong.
- Token in `.env` doesn't match the token in Apps Script Properties.
- Token was rotated but environment variable wasn't updated.

**Resolution:** Verify both the environment variable and the script property value match.

```bash
node -e 'const key = "GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN"; console.log(process.env[key] ? `${key} is set` : `${key} is missing`)'
```

### NOT_FOUND

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "File not found: abc123" } }
```

**Causes:**

- The resource ID is valid in format but doesn't exist.
- The resource exists but the deploying user doesn't have access.
- The resource was deleted or moved.

**Resolution:** Search for the resource by name before using its ID. Use `drive_search_files` or `gmail_search_messages` to verify existence and access.

### RATE_LIMITED

```json
{ "success": false, "error": { "code": "RATE_LIMITED", "message": "Too many requests. Try again in 60 seconds." } }
```

**Causes:** The proxy received more than 100 weighted request units in a 60-second window.

**Resolution:** Wait 60 seconds and retry. Reduce batch size or operation risk. Batch tools reduce round trips, but they are still charged by the sum of child operation weights.

### INTERNAL_ERROR

```json
{ "success": false, "error": { "code": "INTERNAL_ERROR", "message": "An internal error occurred. Check developer console logs for details." } }
```

**Causes:**

- Unhandled exception in the Apps Script code.
- Google API threw an unexpected error.
- Action name was misspelled outside the registered tool surface.

**Resolution:** Check the Apps Script logs:

1. Open the script at `https://script.google.com/d/<script-id>/edit`
2. Go to **Executions** in the left sidebar
3. Find the failed execution and expand the log

### BAD_REQUEST

```json
{ "success": false, "error": { "code": "BAD_REQUEST", "message": "Invalid JSON body" } }
```

**Causes:** Malformed JSON, missing required fields, invalid resource ID formats, or validation failure at the Zod schema layer.

**Resolution:** The MCP server validates most parameters before sending to the proxy. If this occurs, check the tool description for required parameters and ID formats.

### VALIDATION_ERROR

Returned when Zod schema validation fails on the MCP server side (before the request reaches the proxy). The error message includes the specific field that failed validation:

```json
{ "error": "Validation error: fileId must match pattern /^[a-zA-Z0-9_-]+$/" }
```

---

## Debugging

### Apps Script Logs

The most powerful debugging tool. Each proxy logs errors to `console.error` with the action name and error message:

```javascript
console.error('[drive-proxy] action=fileGet error=File not found: abc123');
```

To view logs:

```bash
open "https://script.google.com/d/<script-id>/edit"
```

In the Apps Script editor: **Executions** (left sidebar) → click on the failed execution → expand for full log.

### clasp Status

Verify the pushed code matches what's deployed:

```bash
cd packages/<service>/apps-script
clasp status
```

This shows the script ID, last push date, and deployment history. If the script ID doesn't match what you expect, you may have pushed to the wrong project.

### clasp Logs

View recent Apps Script logs from the command line:

```bash
cd packages/<service>/apps-script
clasp logs
```

Shows `console.log` and `console.error` output (limited to recent executions).

### Health Check

Every proxy responds to a GET request with a health check:

```bash
curl -sL "https://script.google.com/macros/s/<deployment-id>/exec" | jq .
```

Expected response (without token):

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "<health-version>",
    "service": "google-workspace-proxy-drive"
  }
}
```

This confirms the web app is deployed, accessible, and functional. No auth token is required for the health check.

### Token Verification

Verify your local token is set, then compare the private value with Apps Script Script Properties without pasting it into logs, issues, or support threads:

```bash
node -e 'const key = "GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN"; const value = process.env[key]; console.log(value ? `${key} is set (${value.length} chars)` : `${key} is missing`)'
```

Check the proxy value in the Apps Script editor under **Project Settings → Script Properties → PROXY_AUTH_TOKEN**.

If they don't match, update the environment variable to match the script property value, or rotate the token.
