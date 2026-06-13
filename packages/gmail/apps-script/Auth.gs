const SCRIPT_PROPERTY_KEY = 'PROXY_AUTH_TOKEN'
const BOOTSTRAPPED_KEY = 'PROXY_BOOTSTRAPPED'

function generateToken() {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 48; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  } catch(e) {
    let fallback = ''
    for (let j = 0; j < 48; j++) {
      fallback += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))
    }
    return fallback
  }
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

function isBootstrapped() {
  return PropertiesService.getScriptProperties().getProperty(BOOTSTRAPPED_KEY) === 'true'
}

function markBootstrapped() {
  PropertiesService.getScriptProperties().setProperty(BOOTSTRAPPED_KEY, 'true')
}

function validateRequest(e) {
  let token = null
  if (e.parameter && e.parameter.token) {
    token = e.parameter.token
  } else {
    try { let body = JSON.parse(e.postData.contents); if (body.token) token = body.token } catch(_) {}
  }
  if (!token) {
    const authHeader = (e.postData && e.postData.headers) ? (e.postData.headers['Authorization'] || e.postData.headers['authorization'] || '') : ''
    if (authHeader.indexOf('Bearer ') === 0) token = authHeader.substring(7)
  }
  const expected = getOrCreateToken()
  return token === expected
}

function isRateLimited(token, maxRequests) {
  const cache = CacheService.getScriptCache()
  const key = 'rate_' + (token || 'anon')
  const count = parseInt(cache.get(key) || '0', 10)
  if (count >= (maxRequests || 100)) return true
  cache.put(key, String(count + 1), 60)
  return false
}
