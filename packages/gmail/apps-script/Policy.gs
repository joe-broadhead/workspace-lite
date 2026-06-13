const POLICY_CONFIRMATION_CLASSES_ = { send: true, share: true, destructive: true }

function policyError_(code, message) {
  return { success: false, error: { code: code, message: message } }
}

function isActionConfirmed_(params) {
  if (!params) return false
  const value = params.confirm !== undefined ? params.confirm : params.confirmation
  if (value === true) return true
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === 'confirm' || normalized === 'confirmed'
  }
  return false
}

function policyClassAllowed_(context, actionClass, policy) {
  const classes = context && context.classes ? context.classes : {}
  if (classes.admin) return true
  if (actionClass === 'write' && policy && policy.allowDraftToken && classes.draft) return true
  return !!classes[actionClass]
}

function getPolicyList_(propertyName) {
  const raw = PropertiesService.getScriptProperties().getProperty(propertyName)
  if (!raw) return null
  return raw.split(',').map(function(value) { return value.trim() }).filter(Boolean)
}

function policyValueAllowed_(propertyName, value) {
  const allowed = getPolicyList_(propertyName)
  if (!allowed || allowed.length === 0) return true
  return allowed.indexOf(String(value)) >= 0
}

function policyPropertyHasList_(propertyName) {
  const allowed = getPolicyList_(propertyName)
  return !!(allowed && allowed.length > 0)
}

function policyBoolean_(propertyName) {
  const value = PropertiesService.getScriptProperties().getProperty(propertyName)
  return /^(1|true|yes)$/i.test(String(value || '').trim())
}

function splitPolicyValues_(value) {
  if (value === undefined || value === null || value === '') return []
  if (Array.isArray(value)) return value.map(String).map(function(item) { return item.trim() }).filter(Boolean)
  return String(value).split(/[;,]/).map(function(item) { return item.trim() }).filter(Boolean)
}

function enforcePolicyAllowlists_(action, params, policy) {
  const allowlists = policy && policy.allowlists ? policy.allowlists : []
  for (let i = 0; i < allowlists.length; i++) {
    const check = allowlists[i]
    if (!policyPropertyHasList_(check.property)) continue
    const names = check.params || []
    for (let j = 0; j < names.length; j++) {
      const name = names[j]
      let value = params ? params[name] : undefined
      if ((value === undefined || value === null || value === '') && check.defaultValue !== undefined) {
        value = check.defaultValue
      }
      const values = splitPolicyValues_(value)
      if (values.length === 0) continue
      for (let k = 0; k < values.length; k++) {
        if (!policyValueAllowed_(check.property, values[k])) {
          return policyError_('ACTION_NOT_ALLOWED', 'Action ' + action + ' is outside the configured ' + check.property + ' allowlist')
        }
      }
    }
  }
  return null
}

function enforceRecipientAllowlist_(action, params, policy) {
  const fields = policy && policy.recipientParams ? policy.recipientParams : []
  const recipientList = getPolicyList_('ALLOWED_EMAIL_RECIPIENTS')
  const domainList = getPolicyList_('ALLOWED_EMAIL_DOMAINS')
  const hasPolicy = (recipientList && recipientList.length > 0) || (domainList && domainList.length > 0)
  if (!hasPolicy) return null
  if (fields.length === 0) {
    if (policy.requiresKnownRecipients) {
      return policyError_('ACTION_NOT_ALLOWED', 'Action ' + action + ' cannot verify recipients against the configured email allowlist')
    }
    return null
  }

  const recipients = []
  for (let i = 0; i < fields.length; i++) {
    const values = splitPolicyValues_(params ? params[fields[i]] : undefined)
    for (let j = 0; j < values.length; j++) recipients.push(values[j].toLowerCase())
  }
  if (recipients.length === 0 && policy.requiresKnownRecipients) {
    return policyError_('ACTION_NOT_ALLOWED', 'Action ' + action + ' cannot verify recipients against the configured email allowlist')
  }

  const allowedRecipients = (recipientList || []).map(function(item) { return item.toLowerCase() })
  const allowedDomains = (domainList || []).map(function(item) { return item.replace(/^@/, '').toLowerCase() })
  for (let k = 0; k < recipients.length; k++) {
    const email = recipients[k]
    const domain = email.indexOf('@') >= 0 ? email.split('@').pop() : ''
    if (allowedRecipients.indexOf(email) >= 0 || allowedDomains.indexOf(domain) >= 0) continue
    return policyError_('ACTION_NOT_ALLOWED', 'Recipient ' + email + ' is outside the configured email allowlist')
  }
  return null
}

function enforceShareDefaults_(action, params, policy) {
  if (!policy || !policy.blockPublicSharing) return null
  const access = String(params && params.access ? params.access : '').toUpperCase()
  const isPublic = access === 'ANYONE' || access === 'ANYONE_WITH_LINK'
  if (isPublic && !policyBoolean_('ALLOW_PUBLIC_DRIVE_SHARING') && !policyBoolean_('ALLOW_PUBLIC_SHARING')) {
    return policyError_('ACTION_NOT_ALLOWED', 'Public Drive sharing is disabled by default. Set ALLOW_PUBLIC_DRIVE_SHARING=true to permit this action.')
  }
  return null
}

function enforceActionPolicy(action, params, policies) {
  const policy = policies[action] || { class: 'read' }
  const actionClass = policy.class || 'read'
  const authContext = getAuthContext()
  if (!policyClassAllowed_(authContext, actionClass, policy)) {
    return policyError_('ACTION_NOT_ALLOWED', 'Action ' + action + ' requires ' + actionClass + ' authorization')
  }
  if (POLICY_CONFIRMATION_CLASSES_[actionClass] && !isActionConfirmed_(params)) {
    return policyError_('CONFIRMATION_REQUIRED', 'Action ' + action + ' is ' + actionClass + ' and requires params.confirm=true after explicit user approval')
  }
  return enforcePolicyAllowlists_(action, params || {}, policy) ||
    enforceRecipientAllowlist_(action, params || {}, policy) ||
    enforceShareDefaults_(action, params || {}, policy)
}
