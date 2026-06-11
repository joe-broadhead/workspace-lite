function doGet(e) {
  if (e && e.parameter && e.parameter.bootstrap === '1') {
    const token = getOrCreateToken()
    return respond(ok({ status: 'bootstrapped', token: token, note: 'Copy this token. Save it as GOOGLE_WORKSPACE_DRIVE_PROXY_TOKEN.' }))
  }
  return respond(ok({ status: 'healthy', version: '1.0.0', service: 'google-workspace-proxy-drive' }))
}

function getProxyToken() {
  return getToken()
}

function doPost(e) {
  if (!validateRequest(e)) {
    return respond(err('UNAUTHORIZED', 'Invalid or missing auth token'))
  }

  let body
  try {
    body = JSON.parse(e.postData.contents)
  } catch (ex) {
    return respond(err('BAD_REQUEST', 'Invalid JSON body'))
  }

  if (!body.action) {
    return respond(err('BAD_REQUEST', 'Missing action field'))
  }

  try {
    return respond(DriveService.handle(body.action, body.params || {}))
  } catch (ex) {
    const msg = ex instanceof Error ? ex.message : String(ex)
    return respond(err('INTERNAL_ERROR', msg))
  }
}
