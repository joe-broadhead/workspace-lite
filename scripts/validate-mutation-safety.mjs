import { readFileSync } from 'node:fs'

const failures = []

const schemas = readFileSync('shared/src/schemas.ts', 'utf8')
for (const name of [
  'folderCreateSchema',
  'fileCreateSchema',
  'fileCopySchema',
  'fileSetSharingSchema',
  'fileAddEditorSchema',
  'fileAddViewerSchema',
  'driveCommentCreateSchema',
  'calendarCreateEventSchema',
  'calendarCreateEventSeriesSchema',
  'calendarQuickAddSchema',
  'gmailSendSchema',
  'gmailUpdateDraftSchema',
  'gmailSendDraftSchema',
  'gmailReplySchema',
  'gmailForwardSchema',
  'tasksCreateTasklistSchema',
  'tasksCreateTaskSchema',
  'formsCreateFormSchema',
  'formsAddItemSchema',
]) {
  const start = schemas.indexOf(`export const ${name}`)
  const end = schemas.indexOf('\n}\n', start)
  const block = start >= 0 && end >= 0 ? schemas.slice(start, end) : ''
  if (!block.includes('idempotencyKey')) failures.push(`shared/src/schemas.ts: ${name} must expose idempotencyKey`)
}

const drive = readFileSync('packages/drive/apps-script/DriveService.gs', 'utf8')
const fileMoveStart = drive.indexOf('function fileMove')
const fileMoveEnd = drive.indexOf('function fileUpdateMeta', fileMoveStart)
const fileMove = drive.slice(fileMoveStart, fileMoveEnd)
if (!fileMove.includes('if (!destAlreadyParent) dest.addFile(file)')) failures.push('Drive fileMove must add destination before parent removal')
if (!(fileMove.indexOf('dest.addFile(file)') < fileMove.indexOf('parent.removeFile(file)'))) failures.push('Drive fileMove removes parents before destination add')
if (!fileMove.includes('PARENT_REMOVAL_FAILED')) failures.push('Drive fileMove must return explicit partial cleanup failures')
if (!drive.includes('IDEMPOTENCY:drive:')) failures.push('Drive mutations must support idempotency replay')

const gmail = readFileSync('packages/gmail/apps-script/GmailService.gs', 'utf8')
const updateDraftStart = gmail.indexOf('function updateDraft')
const updateDraftEnd = gmail.indexOf('function deleteDraft', updateDraftStart)
const updateDraft = gmail.slice(updateDraftStart, updateDraftEnd)
if (!(updateDraft.indexOf('GmailApp.createDraft') < updateDraft.indexOf('draft.deleteDraft()'))) failures.push('Gmail updateDraft must create replacement before deleting original')
if (!updateDraft.includes('rollbackFailed')) failures.push('Gmail updateDraft must report rollback/partial behavior')
if (!gmail.includes('IDEMPOTENCY:gmail:')) failures.push('Gmail mutations must support idempotency replay')

const calendar = readFileSync('packages/calendar/apps-script/CalendarService.gs', 'utf8')
if (!calendar.includes('function parseGuestEmails')) failures.push('Calendar createEvent must prevalidate guest emails before mutation')
if (!calendar.includes('GUEST_ADD_FAILED')) failures.push('Calendar createEvent must surface guest add failures as partial success')
if (!calendar.includes("withIdempotency('createEvent'")) failures.push('Calendar createEvent must support idempotency replay')
if (!calendar.includes('IDEMPOTENCY:calendar:')) failures.push('Calendar mutations must support idempotency replay')

const tasks = readFileSync('packages/tasks/apps-script/TasksService.gs', 'utf8')
if (!tasks.includes("withIdempotency('tasklistsCreate'")) failures.push('Tasks tasklist create must support idempotency replay')
if (!tasks.includes("withIdempotency('tasksCreate'")) failures.push('Tasks task create must support idempotency replay')
if (!tasks.includes('IDEMPOTENCY:tasks:')) failures.push('Tasks mutations must support idempotency replay')

const forms = readFileSync('packages/forms/apps-script/FormsService.gs', 'utf8')
if (!forms.includes("withIdempotency('formCreate'")) failures.push('Forms form create must support idempotency replay')
if (!forms.includes("withIdempotency('itemAdd'")) failures.push('Forms item add must support idempotency replay')
if (!forms.includes('IDEMPOTENCY:forms:')) failures.push('Forms mutations must support idempotency replay')
if (!forms.includes('validateCommonItemFields(params)')) failures.push('Forms item add must validate common fields before creating an item')

const mutationDocs = readFileSync('docs/operations/mutation-safety.md', 'utf8')
for (const term of ['drive_move_file', 'gmail_update_draft', 'calendar_create_event', 'idempotencyKey', 'partial: true', 'Retry guidance']) {
  if (!mutationDocs.includes(term)) failures.push(`docs/operations/mutation-safety.md: missing ${term}`)
}

const batchDocs = readFileSync('docs/api/batch.md', 'utf8')
if (!batchDocs.includes('partial: true')) failures.push('docs/api/batch.md: missing partial success response documentation')
if (!batchDocs.includes('strictly sequential')) failures.push('docs/api/batch.md: missing sequential batch semantics')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Mutation safety contracts are valid')
