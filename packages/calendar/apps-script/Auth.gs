const SCRIPT_PROPERTY_KEY = 'PROXY_AUTH_TOKEN'

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 48; i++) token += chars.charAt(Math.floor(Math.random() * chars.length))
  return token
}

function getOrCreateToken() {
  const props = PropertiesService.getScriptProperties()
  let token = props.getProperty(SCRIPT_PROPERTY_KEY)
  if (!token) { token = generateToken(); props.setProperty(SCRIPT_PROPERTY_KEY, token) }
  return token
}

function getToken() {
  return PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTY_KEY) || 'NOT_SET'
}

function validateRequest(e) {
  return ((e.parameter || {}).token || '') === getOrCreateToken()
}
