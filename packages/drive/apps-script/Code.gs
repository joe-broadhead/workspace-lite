const TOKEN_ENV_NAME = 'GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN'

function doGet(e) {
  if (e && e.parameter && e.parameter.bootstrap === '1') {
    return respond(bootstrapProxy(e, TOKEN_ENV_NAME))
  }
  return respond(ok({ status: 'healthy', version: '1.0.0', service: 'google-workspace-proxy-sheets' }))
}

function doPost(e) {
  var body
  try { body = JSON.parse(e.postData.contents) } catch(_) { return respond(err('BAD_REQUEST', 'Invalid JSON body')) }
  if (!validateRequest(body)) {
    return respond(err('UNAUTHORIZED', 'Invalid or missing auth token'))
  }

  if (isRateLimited(100, DriveService.requestWeight(body.action, body.params || {}))) {
    return respond(err('RATE_LIMITED', 'Too many requests. Try again in 60 seconds.'))
  }

  if (!body.action) return respond(err('BAD_REQUEST', 'Missing action field'))

  try {
    return respond(DriveService.handle(body.action, body.params || {}))
  } catch(ex) {
    console.error('[drive-proxy] action=%s error=%s', body.action, ex.message || String(ex))
    return respond(err('INTERNAL_ERROR', 'An internal error occurred. Check developer console logs for details.'))
  }
}
