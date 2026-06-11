const SCRIPT_PROPERTY_KEY = 'PROXY_AUTH_TOKEN'

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

function getOrCreateToken(): string {
  const props = PropertiesService.getScriptProperties()
  let token = props.getProperty(SCRIPT_PROPERTY_KEY)
  if (!token) {
    token = generateToken()
    props.setProperty(SCRIPT_PROPERTY_KEY, token)
  }
  return token
}

function getToken(): string {
  const props = PropertiesService.getScriptProperties()
  return props.getProperty(SCRIPT_PROPERTY_KEY) || 'NOT_SET'
}

function validateRequest(e: GoogleAppsScript.Events.DoPost): boolean {
  const authHeader = e.parameter?.token || ''
  const expected = getOrCreateToken()
  return authHeader === expected
}
