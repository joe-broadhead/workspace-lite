function doGet(): GoogleAppsScript.Content.TextOutput {
  return respond(ok({ status: 'healthy', version: '1.0.0', service: 'google-workspace-proxy-drive' }))
}

// Clasp-accessible function to retrieve the token
function getProxyToken(): string {
  return getToken()
}

function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  if (!validateRequest(e)) {
    return respond(err('UNAUTHORIZED', 'Invalid or missing auth token'))
  }

  let body: { action: string; params?: Record<string, unknown> }
  try {
    body = JSON.parse(e.postData.contents)
  } catch {
    return respond(err('BAD_REQUEST', 'Invalid JSON body'))
  }

  if (!body.action) {
    return respond(err('BAD_REQUEST', 'Missing action field'))
  }

  try {
    return respond(DriveService.handle(body.action, body.params || {}))
  } catch (ex: unknown) {
    const msg = ex instanceof Error ? ex.message : String(ex)
    return respond(err('INTERNAL_ERROR', msg))
  }
}
