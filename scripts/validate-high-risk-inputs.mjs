import { readFileSync } from 'node:fs'

const failures = []

const schemas = readFileSync('shared/src/schemas.ts', 'utf8')
for (const token of ['httpsUrlSchema', 'a1RangeSchema', 'cssColorSchema', 'formulaSchema']) {
  if (!schemas.includes(`export const ${token}`)) failures.push(`shared/src/schemas.ts: missing ${token}`)
}
if (!schemas.includes('imageUrl: httpsUrlSchema')) failures.push('shared/src/schemas.ts: image URLs must use httpsUrlSchema')
if (!schemas.includes('formula: formulaSchema')) failures.push('shared/src/schemas.ts: formula inputs must use formulaSchema')

const calendar = readFileSync('packages/calendar/apps-script/CalendarService.gs', 'utf8')
if (!calendar.includes('if (!calendarId) return CalendarApp.getDefaultCalendar()')) failures.push('Calendar resolver must only use default calendar when calendarId is absent')
if (!calendar.includes("throw proxyError('NOT_FOUND'")) failures.push('Calendar resolver must return NOT_FOUND for supplied missing calendarId')
if (!calendar.includes("proxyError('BAD_REQUEST'")) failures.push('Calendar resolver must return BAD_REQUEST for invalid calendarId')
if (!calendar.includes('function parseDateTimeRange')) failures.push('Calendar mutations must validate start/end datetime ordering')

for (const [service, file] of [['Docs', 'packages/docs/apps-script/DocsService.gs'], ['Slides', 'packages/slides/apps-script/SlidesService.gs']]) {
  const source = readFileSync(file, 'utf8')
  if (!source.includes('function fetchImageBlob')) failures.push(`${service}: missing fetchImageBlob validation`)
  if (!source.includes('function parseHttpsUrl')) failures.push(`${service}: image fetches must parse URLs without relying on unavailable Apps Script globals`)
  if (!source.includes('imageUrl must use https')) failures.push(`${service}: image fetches must reject non-HTTPS URLs`)
  if (!source.includes('ALLOWED_IMAGE_HOSTS')) failures.push(`${service}: image fetches must support host allowlists`)
  if (!source.includes("contentType.indexOf('image/') !== 0")) failures.push(`${service}: image fetches must validate image MIME type`)
  if (!source.includes('LIMITS.imageBytes')) failures.push(`${service}: image fetches must enforce byte limits`)
}

const sheets = readFileSync('packages/sheets/apps-script/SheetsService.gs', 'utf8')
for (const token of ['function validateA1Range', 'function formulaInjectionError', 'formula must start with =', 'validateCssColor', 'validateFiniteNumber']) {
  if (!sheets.includes(token)) failures.push(`Sheets: missing ${token}`)
}

const drivePolicy = readFileSync('packages/drive/apps-script/Policy.gs', 'utf8')
if (!drivePolicy.includes('ALLOW_PUBLIC_DRIVE_SHARING')) failures.push('Drive policy must keep public sharing opt-in')
const gmailPolicy = readFileSync('packages/gmail/apps-script/Policy.gs', 'utf8')
if (!gmailPolicy.includes('ALLOWED_EMAIL_DOMAINS')) failures.push('Gmail policy must support recipient domain allowlists')

const docs = readFileSync('docs/operations/input-policies.md', 'utf8')
for (const term of ['ALLOWED_IMAGE_HOSTS', 'ALLOWED_EMAIL_DOMAINS', 'ALLOW_PUBLIC_DRIVE_SHARING', 'Formula injection', 'calendarId']) {
  if (!docs.includes(term)) failures.push(`docs/operations/input-policies.md: missing ${term}`)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('High-risk input policies are valid')
