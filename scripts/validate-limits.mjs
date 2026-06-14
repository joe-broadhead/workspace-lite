import { readFileSync } from 'node:fs'

const docs = readFileSync('docs/operations/quotas.md', 'utf8')

const checks = [
  ['packages/drive/apps-script/DriveService.gs', ['pageSize', 'pageOffset', 'folderEntries', 'textChars', 'exportBytes', 'writeBytes', 'responseBytes', 'pathDepth']],
  ['packages/gmail/apps-script/GmailService.gs', ['pageSize', 'pageOffset', 'searchThreads', 'threadMessages', 'draftScan', 'messageBodyChars', 'responseBytes', 'attachmentBytes', 'batchModifyMessages']],
  ['packages/calendar/apps-script/CalendarService.gs', ['pageSize', 'pageOffset', 'listWindowDays', 'responseBytes']],
  ['packages/sheets/apps-script/SheetsService.gs', ['readCells', 'writeCells', 'batchRanges', 'responseBytes', 'rowsMutated']],
  ['packages/docs/apps-script/DocsService.gs', ['paragraphs', 'documentChars', 'responseBytes', 'documentJsonBytes']],
  ['packages/slides/apps-script/SlidesService.gs', ['pageElements', 'textChars', 'responseBytes']],
  ['packages/tasks/apps-script/TasksService.gs', ['tasklistsPageSize', 'tasksPageSize', 'titleChars', 'notesChars', 'responseBytes']],
  ['packages/forms/apps-script/FormsService.gs', ['items', 'responses', 'responseAnswers', 'titleChars', 'descriptionChars', 'choices', 'choiceChars', 'responseBytes']],
]

const codeEntrypoints = [
  'packages/drive/apps-script/Code.gs',
  'packages/gmail/apps-script/Code.gs',
  'packages/calendar/apps-script/Code.gs',
  'packages/sheets/apps-script/Code.gs',
  'packages/docs/apps-script/Code.gs',
  'packages/slides/apps-script/Code.gs',
  'packages/tasks/apps-script/Code.gs',
  'packages/forms/apps-script/Code.gs',
]

function parseLimits(file) {
  const source = readFileSync(file, 'utf8')
  const match = source.match(/const LIMITS = \{([\s\S]*?)\n\s*\}/)
  if (!match) throw new Error(`${file}: missing LIMITS object`)
  const limits = {}
  for (const line of match[1].split('\n')) {
    const entry = line.match(/\s*(\w+):\s*(\d+),?/)
    if (entry) limits[entry[1]] = Number(entry[2])
  }
  return limits
}

function formatted(value) {
  return value.toLocaleString('en-US')
}

const failures = []
for (const [file, keys] of checks) {
  const limits = parseLimits(file)
  for (const key of keys) {
    if (!Number.isFinite(limits[key])) failures.push(`${file}: missing LIMITS.${key}`)
    else if (!docs.includes(formatted(limits[key]))) failures.push(`docs/operations/quotas.md: missing ${formatted(limits[key])} for ${file} LIMITS.${key}`)
  }
  if (!readFileSync(file, 'utf8').includes('LIMIT_EXCEEDED')) failures.push(`${file}: missing LIMIT_EXCEEDED usage`)
}

if (!docs.includes('LIMIT_EXCEEDED')) failures.push('docs/operations/quotas.md: missing LIMIT_EXCEEDED documentation')
for (const file of codeEntrypoints) {
  const source = readFileSync(file, 'utf8')
  if (!source.includes('contents.length > 1000000')) failures.push(`${file}: missing request body limit`)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Proxy limits documentation is in sync')
