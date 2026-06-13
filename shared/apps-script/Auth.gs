const SCRIPT_PROPERTY_KEY = 'PROXY_AUTH_TOKEN'
const BOOTSTRAPPED_KEY = 'PROXY_BOOTSTRAPPED'
const BOOTSTRAP_SECRET_PROPERTY_KEY = 'PROXY_BOOTSTRAP_SECRET'
const AUTH_TOKEN_CLASSES_PROPERTY_KEY = 'PROXY_AUTH_TOKEN_CLASSES'
const DEFAULT_AUTH_TOKEN_CLASSES = 'read,draft'
const READ_TOKEN_PROPERTY_KEY = 'PROXY_READ_TOKEN'
const WRITE_TOKEN_PROPERTY_KEY = 'PROXY_WRITE_TOKEN'
const SEND_TOKEN_PROPERTY_KEY = 'PROXY_SEND_TOKEN'
const SHARE_TOKEN_PROPERTY_KEY = 'PROXY_SHARE_TOKEN'
const DESTRUCTIVE_TOKEN_PROPERTY_KEY = 'PROXY_DESTRUCTIVE_TOKEN'
const ADMIN_TOKEN_PROPERTY_KEY = 'PROXY_ADMIN_TOKEN'

var CURRENT_AUTH_CONTEXT_ = { authenticated: false, tokenKind: null, classes: {} }
var CURRENT_AUTH_RATE_KEY_ = 'anonymous'

function generateToken_() {
  return Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '')
}

function getExistingToken_() {
  return PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTY_KEY)
}

function getOrCreateToken_() {
  const props = PropertiesService.getScriptProperties()
  let token = props.getProperty(SCRIPT_PROPERTY_KEY)
  if (!token) {
    token = generateToken_()
    props.setProperty(SCRIPT_PROPERTY_KEY, token)
  }
  return token
}

function isBootstrapped() {
  return PropertiesService.getScriptProperties().getProperty(BOOTSTRAPPED_KEY) === 'true'
}

function markBootstrapped_() {
  PropertiesService.getScriptProperties().setProperty(BOOTSTRAPPED_KEY, 'true')
}

function constantTimeEquals_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  let diff = a.length ^ b.length
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

function getBootstrapSecret_() {
  if (typeof BOOTSTRAP_SETUP_SECRET !== 'undefined' && BOOTSTRAP_SETUP_SECRET) {
    return BOOTSTRAP_SETUP_SECRET
  }
  return PropertiesService.getScriptProperties().getProperty(BOOTSTRAP_SECRET_PROPERTY_KEY)
}

function bootstrapProxy(e, tokenEnvName) {
  const lock = LockService.getScriptLock()
  if (!lock.tryLock(5000)) {
    return err('LOCK_TIMEOUT', 'Could not acquire bootstrap lock. Try again shortly.')
  }
  try {
    if (isBootstrapped()) {
      return err('FORBIDDEN', 'Bootstrap has already been completed. Rotate the token if it was lost or exposed.')
    }

    const expectedSecret = getBootstrapSecret_()
    if (!expectedSecret) {
      return err('BOOTSTRAP_NOT_CONFIGURED', 'Bootstrap setup secret is missing. Run scripts/setup.sh to generate BootstrapSecret.gs before deployment.')
    }

    const suppliedSecret = e && e.parameter ? e.parameter.setupKey : null
    if (!constantTimeEquals_(suppliedSecret, expectedSecret)) {
      return err('UNAUTHORIZED', 'Invalid or missing bootstrap setup key')
    }

    const token = getOrCreateToken_()
    markBootstrapped_()
    return ok({
      status: 'bootstrapped',
      token: token,
      note: 'Save this token as ' + tokenEnvName + '. This endpoint will not return the token again.',
    })
  } finally {
    lock.releaseLock()
  }
}

function parseTokenClasses_(value, fallback) {
  const classes = {}
  String(value || fallback || '').split(',').forEach(function(part) {
    const name = part.trim().toLowerCase()
    if (name) classes[name] = true
  })
  if (classes.admin) {
    classes.read = true
    classes.draft = true
    classes.write = true
    classes.send = true
    classes.share = true
    classes.destructive = true
  }
  if (classes.send || classes.share || classes.destructive) classes.write = true
  if (classes.write) classes.draft = true
  if (classes.draft || classes.write) classes.read = true
  return classes
}

function authContextForToken_(token) {
  const props = PropertiesService.getScriptProperties()
  const primaryToken = props.getProperty(SCRIPT_PROPERTY_KEY)
  if (primaryToken && constantTimeEquals_(token, primaryToken)) {
    return {
      authenticated: true,
      tokenKind: 'primary',
      classes: parseTokenClasses_(props.getProperty(AUTH_TOKEN_CLASSES_PROPERTY_KEY), DEFAULT_AUTH_TOKEN_CLASSES),
    }
  }

  const tokenSpecs = [
    { key: READ_TOKEN_PROPERTY_KEY, kind: 'read', classes: 'read' },
    { key: WRITE_TOKEN_PROPERTY_KEY, kind: 'write', classes: 'read,draft,write' },
    { key: SEND_TOKEN_PROPERTY_KEY, kind: 'send', classes: 'read,draft,write,send' },
    { key: SHARE_TOKEN_PROPERTY_KEY, kind: 'share', classes: 'read,draft,write,share' },
    { key: DESTRUCTIVE_TOKEN_PROPERTY_KEY, kind: 'destructive', classes: 'read,draft,write,destructive' },
    { key: ADMIN_TOKEN_PROPERTY_KEY, kind: 'admin', classes: 'admin' },
  ]

  for (let i = 0; i < tokenSpecs.length; i++) {
    const spec = tokenSpecs[i]
    const expected = props.getProperty(spec.key)
    if (expected && constantTimeEquals_(token, expected)) {
      return { authenticated: true, tokenKind: spec.kind, classes: parseTokenClasses_(spec.classes) }
    }
  }

  return { authenticated: false, tokenKind: null, classes: {} }
}

function validateRequest(bodyOrEvent) {
  let body = bodyOrEvent || {}
  if (bodyOrEvent && bodyOrEvent.postData && bodyOrEvent.postData.contents) {
    try { body = JSON.parse(bodyOrEvent.postData.contents) } catch(_) { body = {} }
  }
  const token = body && typeof body.token === 'string' ? body.token : ''
  CURRENT_AUTH_CONTEXT_ = authContextForToken_(token)
  CURRENT_AUTH_RATE_KEY_ = CURRENT_AUTH_CONTEXT_.authenticated ? (CURRENT_AUTH_CONTEXT_.tokenKind || 'primary') : ('invalid_' + fingerprintString_(token || 'missing'))
  return CURRENT_AUTH_CONTEXT_.authenticated
}

function getAuthContext() {
  return CURRENT_AUTH_CONTEXT_ || { authenticated: false, tokenKind: null, classes: {} }
}

function getStoredTokenFingerprint_() {
  const token = getExistingToken_() || 'NOT_SET'
  return fingerprintString_(token)
}

function fingerprintString_(value) {
  const token = String(value || 'NOT_SET')
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)
  return Utilities.base64EncodeWebSafe(bytes)
}

function rateLimitWithKey_(key, maxRequests, weight) {
  const cache = CacheService.getScriptCache()
  const lock = LockService.getScriptLock()
  let locked = false
  try {
    locked = lock.tryLock(1000)
    if (!locked) return true
    const count = parseInt(cache.get(key) || '0', 10)
    const requestWeight = Math.max(1, Math.min(Number(weight) || 1, maxRequests || 100))
    if (count + requestWeight > (maxRequests || 100)) return true
    cache.put(key, String(count + requestWeight), 60)
    return false
  } finally {
    if (locked) lock.releaseLock()
  }
}

function isAuthFailureRateLimited(token) {
  return rateLimitWithKey_('authfail_' + fingerprintString_(token || 'missing'), 20, 1)
}

function isRateLimited(maxRequests, weight) {
  return rateLimitWithKey_('rate_' + (CURRENT_AUTH_RATE_KEY_ || getStoredTokenFingerprint_()), maxRequests, weight)
}
