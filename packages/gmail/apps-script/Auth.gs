const SCRIPT_PROPERTY_KEY = 'PROXY_AUTH_TOKEN'
const BOOTSTRAPPED_KEY = 'PROXY_BOOTSTRAPPED'
const BOOTSTRAP_SECRET_PROPERTY_KEY = 'PROXY_BOOTSTRAP_SECRET'

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

function validateRequest(e) {
  let token = null
  try { const body = JSON.parse(e.postData.contents); token = body.token } catch(_) {}
  const expected = getExistingToken_()
  return !!expected && constantTimeEquals_(token, expected)
}

function getStoredTokenFingerprint_() {
  const token = getExistingToken_() || 'NOT_SET'
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token)
  return Utilities.base64EncodeWebSafe(bytes)
}

function isRateLimited(maxRequests) {
  const cache = CacheService.getScriptCache()
  const lock = LockService.getScriptLock()
  const key = 'rate_' + getStoredTokenFingerprint_()
  try {
    if (!lock.tryLock(1000)) return true
    const count = parseInt(cache.get(key) || '0', 10)
    if (count >= (maxRequests || 100)) return true
    cache.put(key, String(count + 1), 60)
    return false
  } finally {
    lock.releaseLock()
  }
}
