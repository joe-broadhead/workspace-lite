const SCRIPT_PROPERTY_KEY = 'PROXY_AUTH_TOKEN'
const BOOTSTRAPPED_KEY = 'PROXY_BOOTSTRAPPED'

function generateToken() {
  try {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var token = ''
    for (var i = 0; i < 48; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  } catch(e) {
    var fallback = ''
    for (var j = 0; j < 48; j++) {
      fallback += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))
    }
    return fallback
  }
}

function getOrCreateToken() {
  var props = PropertiesService.getScriptProperties()
  var token = props.getProperty(SCRIPT_PROPERTY_KEY)
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
  var token = null
  if (e.parameter && e.parameter.token) {
    token = e.parameter.token
  } else {
    try { var body = JSON.parse(e.postData.contents); if (body.token) token = body.token } catch(_) {}
  }
  if (!token) {
    var authHeader = (e.postData && e.postData.headers) ? (e.postData.headers['Authorization'] || e.postData.headers['authorization'] || '') : ''
    if (authHeader.indexOf('Bearer ') === 0) token = authHeader.substring(7)
  }
  var expected = getOrCreateToken()
  return token === expected
}

function validateSignedRequest(e) {
  var sig = (e.parameter || {})['x-sig'] || ''
  var ts = (e.parameter || {})['x-ts'] || ''
  if (!sig || !ts) return false
  var now = Math.floor(Date.now() / 1000)
  var reqTime = parseInt(ts, 10)
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 300) return false
  var token = getOrCreateToken()
  var payload = reqTime + '\n' + e.postData.contents
  var hash = Utilities.computeHmacSha256Signature(payload, token)
  var expected = hash.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2) }).join('')
  return sig === expected
}

function isRateLimited(token, maxRequests) {
  var cache = CacheService.getScriptCache()
  var key = 'rate_' + (token || 'anon')
  var count = parseInt(cache.get(key) || '0', 10)
  if (count >= (maxRequests || 100)) return true
  cache.put(key, String(count + 1), 60)
  return false
}
