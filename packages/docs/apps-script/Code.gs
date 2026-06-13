function doGet(e) {
  if (e && e.parameter && e.parameter.bootstrap === '1') {
    if (isBootstrapped()) return respond(err('FORBIDDEN', 'Bootstrap already completed. Use the token saved during initial setup.'))
    markBootstrapped()
    return respond(ok({ status: 'bootstrapped', token: getOrCreateToken(), note: 'Save this token as GOOGLE_WORKSPACE_DOCS_PROXY_TOKEN.' }))
  }
  return respond(ok({ status: 'healthy', version: '1.0.0', service: 'google-workspace-proxy-docs' }))
}

function getProxyToken() { return getToken() }

function doPost(e) {
  if (!validateRequest(e)) return respond(err('UNAUTHORIZED', 'Invalid or missing auth token'))
  if (isRateLimited(getToken(), 100)) return respond(err('RATE_LIMITED', 'Too many requests. Try again in 60 seconds.'))

  var body
  try { body = JSON.parse(e.postData.contents) } catch(_) { return respond(err('BAD_REQUEST', 'Invalid JSON body')) }
  if (!body.action) return respond(err('BAD_REQUEST', 'Missing action field'))

  try { return respond(DocsService.handle(body.action, body.params || {})) }
  catch(ex) {
    console.error('[docs-proxy] action=%s error=%s', body.action, ex.message || String(ex))
    return respond(err('INTERNAL_ERROR', 'An internal error occurred.'))
  }
}
