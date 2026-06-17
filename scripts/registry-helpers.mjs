import fs from 'node:fs'
import path from 'node:path'

export const root = path.resolve(new URL('..', import.meta.url).pathname)

export function loadRegistry() {
  const registryPath = path.join(root, 'config', 'service-registry.json')
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'))
  return {
    ...registry,
    services: registry.services.map((service) => ({
      ...service,
      healthVersion: service.healthVersion || registry.healthVersion,
    })),
  }
}

export function serviceFilePath(service, filename) {
  return path.join(root, 'packages', service.key, 'apps-script', filename)
}

export function sharedShellSource(filename) {
  return fs.readFileSync(path.join(root, 'shared', 'apps-script', filename), 'utf8')
}

export function renderProxyCode(service) {
  return `const TOKEN_ENV_NAME = '${service.tokenEnvName}'

function doGet(e) {
  if (e && e.parameter && e.parameter.bootstrap === '1') {
    if (isRateLimited(20, 1)) return respond(err('RATE_LIMITED', 'Too many bootstrap attempts. Try again in 60 seconds.'))
    return respond(bootstrapProxy(e, TOKEN_ENV_NAME))
  }
  return respond(ok({ status: 'healthy', version: '${service.healthVersion}', service: '${service.proxyServiceName}' }))
}

function clientInputErrorMessage_(ex) {
  const message = ex && ex.message ? String(ex.message) : ''
  if (/^(Missing required parameter:|Invalid [A-Za-z0-9 _@.-]+:|Invalid [A-Za-z0-9 ]+ ID:|Invalid access or permission:|No changes specified|width must be positive|height must be positive|targetSlideIndex out of range)/.test(message)) return message
  if (/^[A-Za-z0-9_ .-]+ must be a finite number$/.test(message)) return message
  return null
}

function doPost(e) {
  var body
  if (e && e.postData && e.postData.contents && e.postData.contents.length > 1000000) {
    return respond(err('LIMIT_EXCEEDED', 'request bytes limit exceeded: max 1000000'))
  }
  try { body = JSON.parse(e.postData.contents) } catch(_) { return respond(err('BAD_REQUEST', 'Invalid JSON body')) }

  if (body && body.setupKey) {
    if (isRateLimited(20, 1)) return respond(err('RATE_LIMITED', 'Too many bootstrap attempts. Try again in 60 seconds.'))
    const setupEvent = { parameter: { setupKey: body.setupKey } }
    return respond(body.rotate === true ? rotateProxy(setupEvent, TOKEN_ENV_NAME) : bootstrapProxy(setupEvent, TOKEN_ENV_NAME))
  }

  if (!validateRequest(body)) {
    if (isAuthFailureRateLimited(body && body.token)) {
      return respond(err('RATE_LIMITED', 'Too many failed authentication attempts. Try again in 60 seconds.'))
    }
    return respond(err('UNAUTHORIZED', 'Invalid or missing auth token'))
  }

  if (isRateLimited(100, ${service.globalName}.requestWeight(body.action, body.params || {}))) {
    return respond(err('RATE_LIMITED', 'Too many requests. Try again in 60 seconds.'))
  }

  if (!body.action) return respond(err('BAD_REQUEST', 'Missing action field'))

  try {
    return respond(${service.globalName}.handle(body.action, body.params || {}))
  } catch(ex) {
    if (ex && ex.proxyError) return respond(ex.proxyError)
    const clientInputMessage = clientInputErrorMessage_(ex)
    if (clientInputMessage) return respond(err('BAD_REQUEST', clientInputMessage))
    const correlationId = Utilities.getUuid()
    console.error('[${service.key}-proxy] correlationId=%s action=%s error=%s', correlationId, body.action, ex && ex.message ? ex.message : String(ex))
    return respond(err('INTERNAL_ERROR', 'An internal error occurred. See Apps Script logs with correlationId ' + correlationId + '.', correlationId))
  }
}
`
}

export function extractObjectBlock(source, name) {
  const start = source.indexOf(`const ${name} = {`)
  if (start === -1) throw new Error(`missing ${name}`)
  const end = source.indexOf('\n  }', start)
  if (end === -1) throw new Error(`missing ${name} terminator`)
  return source.slice(start, end)
}

export function actionPolicyEntries(source) {
  const block = extractObjectBlock(source, 'ACTION_POLICIES')
  return [...block.matchAll(/^\s{4}([A-Za-z][A-Za-z0-9_]*):\s*\{[^\n]*class:\s*'([^']+)'/gm)]
    .map((match) => ({ action: match[1], actionClass: match[2] }))
}

export function batchActions(source) {
  const block = extractObjectBlock(source, 'BATCH_ACTIONS')
  return [...block.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\s*:\s*true\b/g)].map((match) => match[1])
}

export function batchDocMappings(serviceKey) {
  const docs = fs.readFileSync(path.join(root, 'docs', 'api', 'batch.md'), 'utf8')
  const heading = `### ${serviceKey.charAt(0).toUpperCase()}${serviceKey.slice(1)}`
  const start = docs.indexOf(heading)
  if (start === -1) return []
  const next = docs.indexOf('\n### ', start + heading.length)
  const block = docs.slice(start, next === -1 ? undefined : next)
  return [...block.matchAll(/\| `([^`]+)` \| `([^`]+)` \|/g)]
    .map((match) => ({ tool: match[1], action: match[2] }))
}

export function toolActionMappings(serviceKey) {
  const toolsDir = path.join(root, 'packages', serviceKey, 'src', 'tools')
  const files = fs.readdirSync(toolsDir).filter((file) => file.endsWith('.ts'))
  const mappings = []

  for (const file of files) {
    const source = fs.readFileSync(path.join(toolsDir, file), 'utf8')
    for (const match of source.matchAll(/registerTool\([\s\S]*?name:\s*'([^']+)'[\s\S]*?schema:\s*([A-Za-z0-9_]+)[\s\S]*?action:\s*'([^']+)'/g)) {
      mappings.push({ tool: match[1], schema: match[2], action: match[3], source: file })
    }
    for (const match of source.matchAll(/server\.tool\(\s*'([^']+)'[\s\S]*?callProxy\('([^']+)'/g)) {
      mappings.push({ tool: match[1], schema: 'inline', action: match[2], source: file })
    }

    if (serviceKey === 'drive' && source.includes("'drive_list_folders'") && source.includes("const action = args.folderId ? 'folderList' : 'folderListRoot'")) {
      mappings.push({ tool: 'drive_list_folders', schema: 'folderListSchema', action: 'folderList', source: file })
      mappings.push({ tool: 'drive_list_folders', schema: 'folderListSchema', action: 'folderListRoot', source: file })
    }
  }

  return mappings.sort((a, b) => a.tool.localeCompare(b.tool))
}
