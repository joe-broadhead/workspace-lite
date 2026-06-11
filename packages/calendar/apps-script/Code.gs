function doGet(e) {
  if (e && e.parameter && e.parameter.bootstrap === '1') {
    return respond(ok({ status: 'bootstrapped', token: getOrCreateToken(), note: 'Copy this token. Save it as GOOGLE_WORKSPACE_CALENDAR_PROXY_TOKEN.' }))
  }
  return respond(ok({ status: 'healthy', version: '1.0.0', service: 'google-workspace-proxy-calendar' }))
}

function getProxyToken() { return getToken() }

function doPost(e) {
  if (!validateRequest(e)) return respond(err('UNAUTHORIZED', 'Invalid or missing auth token'))
  let body
  try { body = JSON.parse(e.postData.contents) } catch(_) { return respond(err('BAD_REQUEST', 'Invalid JSON body')) }
  if (!body.action) return respond(err('BAD_REQUEST', 'Missing action field'))
  try { return respond(CalendarService.handle(body.action, body.params || {})) }
  catch(ex) { return respond(err('INTERNAL_ERROR', ex instanceof Error ? ex.message : String(ex))) }
}
