const TOKEN_ENV_NAME = 'GOOGLE_WORKSPACE_DOCS_PROXY_TOKEN'

function doGet(e) {
  if (e && e.parameter && e.parameter.bootstrap === '1') {
    if (isRateLimited(20, 1)) return respond(err('RATE_LIMITED', 'Too many bootstrap attempts. Try again in 60 seconds.'))
    return respond(bootstrapProxy(e, TOKEN_ENV_NAME))
  }
  return respond(ok({ status: 'healthy', version: '1.0.0', service: 'google-workspace-proxy-docs' }))
}

function clientInputErrorMessage_(ex) {
  const message = ex && ex.message ? String(ex.message) : ''
  if (/^(Missing required parameter:|Invalid [A-Za-z0-9 _@.-]+:|Invalid [A-Za-z0-9 ]+ ID:|Invalid access or permission:|No changes specified|width must be positive|height must be positive|targetSlideIndex out of range)/.test(message)) return message
  if (/^[A-Za-z0-9_ .-]+ must be a finite number$/.test(message)) return message
  return null
}

function doPost(e) {
  var body
  if (e && e.postData && e.postData.contents && e.postData.contents.length > 1000000) {
    return respond(err('LIMIT_EXCEEDED', 'request bytes limit exceeded: max 1000000'))
  }
  try { body = JSON.parse(e.postData.contents) } catch(_) { return respond(err('BAD_REQUEST', 'Invalid JSON body')) }
  if (!validateRequest(body)) {
    if (isAuthFailureRateLimited(body && body.token)) {
      return respond(err('RATE_LIMITED', 'Too many failed authentication attempts. Try again in 60 seconds.'))
    }
    return respond(err('UNAUTHORIZED', 'Invalid or missing auth token'))
  }

  if (isRateLimited(100, DocsService.requestWeight(body.action, body.params || {}))) {
    return respond(err('RATE_LIMITED', 'Too many requests. Try again in 60 seconds.'))
  }

  if (!body.action) return respond(err('BAD_REQUEST', 'Missing action field'))

  try {
    return respond(DocsService.handle(body.action, body.params || {}))
  } catch(ex) {
    if (ex && ex.proxyError) return respond(ex.proxyError)
    const clientInputMessage = clientInputErrorMessage_(ex)
    if (clientInputMessage) return respond(err('BAD_REQUEST', clientInputMessage))
    const correlationId = Utilities.getUuid()
    console.error('[docs-proxy] correlationId=%s action=%s error=%s', correlationId, body.action, ex && ex.message ? ex.message : String(ex))
    return respond(err('INTERNAL_ERROR', 'An internal error occurred. See Apps Script logs with correlationId ' + correlationId + '.', correlationId))
  }
}
