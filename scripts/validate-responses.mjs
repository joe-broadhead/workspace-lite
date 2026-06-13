import { readFileSync } from 'node:fs'

const services = ['drive', 'gmail', 'calendar', 'sheets', 'docs', 'slides']
const serviceGlobals = {
  drive: 'DriveService',
  gmail: 'GmailService',
  calendar: 'CalendarService',
  sheets: 'SheetsService',
  docs: 'DocsService',
  slides: 'SlidesService',
}

const failures = []

const responseSource = readFileSync('shared/src/response.ts', 'utf8')
if (!responseSource.includes('export function validateProxyResponse')) failures.push('shared/src/response.ts: missing validateProxyResponse')
if (!responseSource.includes('MAX_TOOL_OUTPUT_CHARS')) failures.push('shared/src/response.ts: missing output size guard')
if (!responseSource.includes('function safeStringify')) failures.push('shared/src/response.ts: missing safe formatter fallback')
if (!responseSource.includes('partial?: true')) failures.push('shared/src/response.ts: missing partial success contract')
if (!responseSource.includes('correlationId?: string')) failures.push('shared/src/response.ts: missing correlationId error contract')
if (!responseSource.includes('successful response cannot wrap a failed response in data')) failures.push('shared/src/response.ts: missing nested failure guard')

const proxySource = readFileSync('shared/src/proxy-client.ts', 'utf8')
if (!proxySource.includes('validateProxyResponse(json)')) failures.push('shared/src/proxy-client.ts: proxy client must validate JSON response shape')
if (!proxySource.includes('await res.text()')) failures.push('shared/src/proxy-client.ts: proxy client must safely parse response text')

for (const service of services) {
  const serviceTitle = service.charAt(0).toUpperCase() + service.slice(1)
  const serviceFile = `packages/${service}/apps-script/${serviceTitle}Service.gs`
  const codeFile = `packages/${service}/apps-script/Code.gs`
  const responseFile = `packages/${service}/apps-script/Response.gs`
  const policyFile = `packages/${service}/apps-script/Policy.gs`

  const source = readFileSync(serviceFile, 'utf8')
  const code = readFileSync(codeFile, 'utf8')
  const response = readFileSync(responseFile, 'utf8')
  const policy = readFileSync(policyFile, 'utf8')

  if (!code.includes(`service: 'google-workspace-proxy-${service}'`)) failures.push(`${codeFile}: health endpoint reports the wrong service`)
  if (!code.includes('correlationId = Utilities.getUuid()')) failures.push(`${codeFile}: top-level internal errors must include correlation IDs`)
  if (!code.includes(`return respond(${serviceGlobals[service]}.handle(body.action, body.params || {}))`)) failures.push(`${codeFile}: doPost must return the service response envelope directly`)

  if (!response.includes('function ok(data, pagination, warnings)')) failures.push(`${responseFile}: ok() must expose data, pagination, and warnings`)
  if (!response.includes('function err(code, message, correlationId)')) failures.push(`${responseFile}: err() must expose correlationId`)

  if (!source.includes('typeof result.success === \'boolean\' ? result : ok(result)')) failures.push(`${serviceFile}: trap() must pass through typed proxy responses`)
  if (source.includes('return ok(batchResultData_')) failures.push(`${serviceFile}: batch responses must use explicit partial success envelope`)
  if (!source.includes('const response = batchResponse_(results, operationWeight);') || !source.includes('JSON.stringify(response)')) failures.push(`${serviceFile}: batch response envelope must be size-capped`)
  if (source.includes('message: ex.message || String(ex)')) failures.push(`${serviceFile}: raw internal exception message returned in batch response`)
  if (/return\s+err\([^\n]*(?:e|ex)\.message/.test(source)) failures.push(`${serviceFile}: raw exception message returned to client`)
  if (/success:\s*true[^\n{]*nextPageToken/.test(source)) failures.push(`${serviceFile}: pagination must be nested under pagination`)

  if (!policy.includes('function batchResponse_')) failures.push(`${policyFile}: missing batchResponse_ partial success helper`)
  if (!policy.includes('partial: true, results: results')) failures.push(`${policyFile}: partial batch failures must expose top-level results`)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Proxy response contracts are valid')
