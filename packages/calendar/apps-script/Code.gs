function doGet(e) {
  if (e && e.parameter && e.parameter.bootstrap === '1') {
    if (isBootstrapped()) {
      return respond(err('FORBIDDEN', 'Bootstrap has already been completed. Use the token saved during initial setup.'))
    }
    markBootstrapped()
    return respond(ok({ status: 'bootstrapped', token: getOrCreateToken(), note: 'Save this token as GOOGLE_WORKSPACE_CALENDAR_PROXY_TOKEN. This endpoint will not return the token again.' }))
  }
  return respond(ok({ status: 'healthy', version: '1.0.0', service: 'google-workspace-proxy-sheets' }))
}

function getProxyToken() { return getToken() }

function doPost(e) {
  if (!validateRequest(e)) {
    return respond(err('UNAUTHORIZED', 'Invalid or missing auth token'))
  }

  if (isRateLimited(getToken(), 100)) {
    return respond(err('RATE_LIMITED', 'Too many requests. Try again in 60 seconds.'))
  }

  var body
  try { body = JSON.parse(e.postData.contents) } catch(_) { return respond(err('BAD_REQUEST', 'Invalid JSON body')) }
  if (!body.action) return respond(err('BAD_REQUEST', 'Missing action field'))

  try {
    return respond(CalendarService.handle(body.action, body.params || {}))
  } catch(ex) {
    console.error('[calendar-proxy] action=%s error=%s', body.action, ex.message || String(ex))
    return respond(err('INTERNAL_ERROR', 'An internal error occurred. Check developer console logs for details.'))
  }
}
