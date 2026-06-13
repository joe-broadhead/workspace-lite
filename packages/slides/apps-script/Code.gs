const TOKEN_ENV_NAME = 'GOOGLE_WORKSPACE_SLIDES_PROXY_TOKEN'

function doGet(e) {
  if (e && e.parameter && e.parameter.bootstrap === '1') {
    return respond(bootstrapProxy(e, TOKEN_ENV_NAME))
  }
  return respond(ok({ status: 'healthy', version: '1.0.0', service: 'google-workspace-proxy-sheets' }))
}

function doPost(e) {
  if (!validateRequest(e)) {
    return respond(err('UNAUTHORIZED', 'Invalid or missing auth token'))
  }

  if (isRateLimited(100)) {
    return respond(err('RATE_LIMITED', 'Too many requests. Try again in 60 seconds.'))
  }

  var body
  try { body = JSON.parse(e.postData.contents) } catch(_) { return respond(err('BAD_REQUEST', 'Invalid JSON body')) }
  if (!body.action) return respond(err('BAD_REQUEST', 'Missing action field'))

  try {
    return respond(SlidesService.handle(body.action, body.params || {}))
  } catch(ex) {
    console.error('[slides-proxy] action=%s error=%s', body.action, ex.message || String(ex))
    return respond(err('INTERNAL_ERROR', 'An internal error occurred. Check developer console logs for details.'))
  }
}
