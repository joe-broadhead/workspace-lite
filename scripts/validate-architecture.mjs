import fs from 'node:fs'
import path from 'node:path'
import {
  actionPolicyEntries,
  batchActions,
  batchDocMappings,
  loadRegistry,
  renderProxyCode,
  root,
  serviceFilePath,
  sharedShellSource,
  toolActionMappings,
} from './registry-helpers.mjs'

const failures = []
const { services } = loadRegistry()

function sorted(values) {
  return [...values].sort()
}

function relative(filePath) {
  return path.relative(root, filePath)
}

const referenceAuth = sharedShellSource('Auth.gs')
const referenceResponse = sharedShellSource('Response.gs')
const riskModule = fs.readFileSync(path.join(root, 'shared', 'src', 'catalog', 'risk.ts'), 'utf8')
const proxyClient = fs.readFileSync(path.join(root, 'shared', 'src', 'proxy-client.ts'), 'utf8')

for (const token of [
  'function dynamicActionTokenClass',
  "action === 'filtersCreate' && nonEmptyString(params?.forward)",
  "action === 'vacationUpdate' && gmailVacationRequiresSend(params)",
  "sendsCalendarUpdates(params)",
  'const operationParams = (operation as { params?: unknown }).params',
]) {
  if (!riskModule.includes(token)) failures.push(`shared/src/catalog/risk.ts: missing semantic token routing guard ${token}`)
}

if (!proxyClient.includes("from './catalog/risk.js'") && !proxyClient.includes('from "./catalog/risk.js"')) {
  failures.push('shared/src/proxy-client.ts: must import risk resolution from ./catalog/risk.js')
}
if (!proxyClient.includes('resolveRiskClass')) {
  failures.push('shared/src/proxy-client.ts: must call resolveRiskClass for token class routing')
}

for (const service of services) {
  const servicePath = serviceFilePath(service, `${service.title}Service.gs`)
  const codePath = serviceFilePath(service, 'Code.gs')
  const authPath = serviceFilePath(service, 'Auth.gs')
  const responsePath = serviceFilePath(service, 'Response.gs')
  const source = fs.readFileSync(servicePath, 'utf8')
  const code = fs.readFileSync(codePath, 'utf8')
  const expectedCode = renderProxyCode(service)

  if (code !== expectedCode) failures.push(`${relative(codePath)}: proxy shell is not generated from service-registry.json`)
  if (!code.includes('clientInputErrorMessage_')) failures.push(`${relative(codePath)}: proxy shell must classify top-level input exceptions as BAD_REQUEST`)
  if (fs.readFileSync(authPath, 'utf8') !== referenceAuth) failures.push(`${relative(authPath)}: Auth.gs drifted from shared/apps-script/Auth.gs`)
  if (fs.readFileSync(responsePath, 'utf8') !== referenceResponse) failures.push(`${relative(responsePath)}: Response.gs drifted from shared/apps-script/Response.gs`)

  const policies = actionPolicyEntries(source)
  const policyByAction = new Map(policies.map((entry) => [entry.action, entry.actionClass]))
  const batchSet = new Set(batchActions(source))
  const toolMappings = toolActionMappings(service.key)
  const docMappings = batchDocMappings(service.key)
  const toolByAction = new Map(toolMappings.map((entry) => [entry.action, entry]))

  const uniqueTools = new Set(toolMappings.map((entry) => entry.tool))
  if (uniqueTools.size !== service.toolCount) failures.push(`${service.key}: expected ${service.toolCount} tools, found ${uniqueTools.size}`)

  for (const mapping of toolMappings) {
    if (!mapping.tool.startsWith(service.key + '_')) failures.push(`${service.key}: tool ${mapping.tool} must use service prefix`)
    if (!policyByAction.has(mapping.action)) failures.push(`${service.key}: tool ${mapping.tool} targets unregistered action ${mapping.action}`)
    if (!mapping.schema) failures.push(`${service.key}: tool ${mapping.tool} must declare a schema`)
  }

  for (const action of batchSet) {
    if (!policyByAction.has(action)) failures.push(`${service.key}: batch action ${action} is missing ACTION_POLICIES metadata`)
    if (!toolByAction.has(action)) failures.push(`${service.key}: batch action ${action} has no MCP tool mapping`)
  }

  for (const mapping of docMappings) {
    if (!batchSet.has(mapping.action)) failures.push(`${service.key}: docs list non-batch action ${mapping.action}`)
    const toolMapping = toolByAction.get(mapping.action)
    if (!toolMapping) failures.push(`${service.key}: docs action ${mapping.action} has no registered tool`)
    if (toolMapping && toolMapping.tool !== mapping.tool) failures.push(`${service.key}: docs map ${mapping.action} to ${mapping.tool}, code maps it to ${toolMapping.tool}`)
  }

  const actionsWithoutClass = policies.filter((entry) => !entry.actionClass)
  for (const entry of actionsWithoutClass) failures.push(`${service.key}: action ${entry.action} must declare class/risk metadata`)

  const manifestPath = serviceFilePath(service, 'appsscript.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const enabledServices = sorted((manifest.dependencies?.enabledAdvancedServices ?? []).map((entry) => entry.serviceId))
  const expectedServices = sorted(service.advancedServices.map((entry) => entry.serviceId))
  if (JSON.stringify(enabledServices) !== JSON.stringify(expectedServices)) {
    failures.push(`${service.key}: manifest Advanced Services drifted from service registry`)
  }
}

const keys = services.map((service) => service.key)
if (new Set(keys).size !== keys.length) failures.push('service-registry.json: duplicate service keys')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Service registry and architecture seams are valid')
