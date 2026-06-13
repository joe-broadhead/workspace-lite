import { z } from 'zod'

export const driveIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid Drive ID')

export const confirmationSchema = {
  confirm: z.boolean().optional().describe('Required for server-gated send, share, or destructive actions after explicit user approval.'),
}

export const fileListSchema = {
  folderId: z.string().optional().describe('Folder ID to list files from. Omit to list all files.'),
  pageSize: z.number().min(1).max(100).default(50).describe('Number of files per page.'),
  pageToken: z.number().min(0).default(0).describe('Page number (0-based) for pagination.'),
}

export const fileSearchSchema = {
  query: z.string().describe('Drive search query string. See Google Drive search query syntax.'),
  maxResults: z.number().min(1).max(100).default(20).describe('Maximum results.'),
}

export const fileGetSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  ...confirmationSchema,
}

export const fileExportSchema = {
  fileId: driveIdSchema.describe('Drive file ID to export.'),
  mimeType: z.string().default('text/plain').describe('Export MIME type.'),
}

export const folderGetSchema = {
  folderId: z.string().describe('Folder ID.'),
}

export const folderListSchema = {
  folderId: z.string().optional().describe('Folder ID. Omit for root folder.'),
}

export const folderCreateSchema = {
  name: z.string().describe('Folder name.'),
  parentId: z.string().optional().describe('Parent folder ID. Omit for root.'),
}

export const fileCreateSchema = {
  name: z.string().describe('File name.'),
  content: z.string().describe('File content.'),
  mimeType: z.string().default('text/plain').describe('MIME type (e.g. text/markdown, application/json).'),
  parentId: z.string().optional().describe('Parent folder ID. Omit for root.'),
}

export const fileCopySchema = {
  fileId: driveIdSchema.describe('Source file ID.'),
  name: z.string().optional().describe('New name for copy.'),
  destFolderId: z.string().optional().describe('Destination folder ID.'),
}

export const fileMoveSchema = {
  fileId: driveIdSchema.describe('File ID to move.'),
  destFolderId: z.string().describe('Destination folder ID.'),
}

export const fileUpdateMetaSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  name: z.string().optional().describe('New name.'),
  description: z.string().optional().describe('New description.'),
}

export const fileUpdateContentSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  content: z.string().describe('New file content.'),
}

export const fileSetSharingSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  access: z.enum(['ANYONE', 'ANYONE_WITH_LINK', 'DOMAIN', 'DOMAIN_WITH_LINK', 'PRIVATE']).describe('Sharing access level.'),
  permission: z.enum(['NONE', 'VIEW', 'EDIT', 'COMMENT', 'ORGANIZER', 'FILE_ORGANIZER', 'OWNER']).describe('Sharing permission.'),
  ...confirmationSchema,
}

export const fileAddEditorSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to add as editor.'),
  ...confirmationSchema,
}

export const fileAddViewerSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to add as viewer.'),
  ...confirmationSchema,
}

export const fileRemoveEditorSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to remove as editor.'),
  ...confirmationSchema,
}

export const fileRemoveViewerSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to remove as viewer.'),
  ...confirmationSchema,
}

export const driveAddParentSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  folderId: z.string().describe('Folder ID to add as additional parent.'),
}

export const driveRemoveParentSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  folderId: z.string().describe('Folder ID to remove from parents.'),
  ...confirmationSchema,
}

export const driveFolderPathSchema = {
  fileId: driveIdSchema.describe('File ID to get the full folder path for.'),
}

export const driveExportAsSchema = {
  fileId: driveIdSchema.describe('File ID to export.'),
  mimeType: z.string().describe('Target MIME type for export (e.g. application/pdf, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet).'),
}

export const driveCommentsListSchema = {
  fileId: driveIdSchema.describe('Drive file ID to get comments for.'),
}

export const driveCommentCreateSchema = {
  fileId: driveIdSchema.describe('Drive file ID to comment on.'),
  content: z.string().min(1).describe('Comment text content.'),
}

export const driveBatchSchema = {
  operations: z.array(z.object({
    action: z.string().describe('Action to perform (same names as individual tools: about, fileGet, fileList, fileSearch, fileExport, folderGet, folderList, folderListRoot, folderCreate, fileCreate, fileCopy, fileMove, fileUpdateMeta, fileUpdateContent, fileGetPermissions, fileSetSharing, fileAddEditor, fileAddViewer, fileRemoveEditor, fileRemoveViewer, fileAddParent, fileRemoveParent, folderPath, fileTrash, fileUntrash, fileDelete, fileExportAs, commentsList, commentCreate).'),
    params: z.record(z.string(), z.unknown()).default({}).describe('Parameters for the action. See individual tool schemas.'),
  })).min(1).max(20).describe('Ordered list of operations.'),
}

// ─── CALENDAR SCHEMAS ───

export const calendarEventIdSchema = z.string().min(1).describe('Calendar event ID.')

export const calendarListEventsSchema = {
  calendarId: z.string().optional().describe('Calendar ID. Omit for default.'),
  timeMin: z.string().optional().describe('Start time ISO string (default: now).'),
  timeMax: z.string().optional().describe('End time ISO string (default: +30d).'),
  maxResults: z.number().int().min(1).max(100).default(50).describe('Max events.'),
  page: z.number().int().min(0).default(0).describe('Page number.'),
}

export const calendarSearchEventsSchema = {
  query: z.string().min(1).max(500).describe('Text to search in event titles/descriptions.'),
  timeMin: z.string().optional().describe('Start time ISO string.'),
  timeMax: z.string().optional().describe('End time ISO string.'),
  maxResults: z.number().int().min(1).max(100).default(50).describe('Max results.'),
}

export const calendarFreeBusySchema = {
  timeMin: z.string().optional().describe('Start time ISO string (default: now).'),
  timeMax: z.string().optional().describe('End time ISO string (default: +7d).'),
}

export const calendarGetEventSchema = {
  eventId: calendarEventIdSchema,
  calendarId: z.string().optional().describe('Calendar ID.'),
}

export const calendarCreateEventSchema = {
  title: z.string().min(1).max(1000).describe('Event title.'),
  startTime: z.string().describe('Start time ISO string.'),
  endTime: z.string().describe('End time ISO string.'),
  calendarId: z.string().optional().describe('Calendar ID.'),
  description: z.string().max(10000).optional().describe('Description.'),
  location: z.string().max(500).optional().describe('Location.'),
  guests: z.string().optional().describe('Comma-separated emails.'),
}

export const calendarUpdateEventSchema = {
  eventId: calendarEventIdSchema,
  calendarId: z.string().optional().describe('Calendar ID.'),
  title: z.string().min(1).max(1000).optional().describe('New title.'),
  description: z.string().max(10000).optional().describe('New description.'),
  location: z.string().max(500).optional().describe('New location.'),
  startTime: z.string().optional().describe('New start time ISO.'),
  endTime: z.string().optional().describe('New end time ISO.'),
}

export const calendarDeleteEventSchema = {
  eventId: calendarEventIdSchema,
  calendarId: z.string().optional().describe('Calendar ID.'),
  ...confirmationSchema,
}

export const calendarRespondEventSchema = {
  eventId: calendarEventIdSchema,
  status: z.enum(['YES', 'NO', 'MAYBE']).describe('RSVP status.'),
  calendarId: z.string().optional().describe('Calendar ID.'),
}

export const calendarCreateEventSeriesSchema = {
  title: z.string().min(1).max(1000).describe('Event title.'),
  startTime: z.string().describe('Start time ISO string.'),
  endTime: z.string().describe('End time ISO string.'),
  recurrence: z.string().describe('Recurrence rule (e.g. "WEEKLY", "DAILY", "MONTHLY", "YEARLY", "EVERY MONDAY").'),
  calendarId: z.string().optional().describe('Calendar ID.'),
  description: z.string().max(10000).optional().describe('Description.'),
  location: z.string().max(500).optional().describe('Location.'),
}

export const calendarSetEventColorSchema = {
  eventId: calendarEventIdSchema,
  color: z.string().describe('Color name from CalendarApp.EventColor enum (e.g. PALE_BLUE, PALE_GREEN, MAUVE, PALE_RED, YELLOW, ORANGE, CYAN, GRAY, BLUE, GREEN, RED).'),
  calendarId: z.string().optional().describe('Calendar ID.'),
}

export const calendarEventInstancesSchema = {
  eventId: calendarEventIdSchema,
  calendarId: z.string().optional().describe('Calendar ID. Defaults to "primary".'),
  timeMin: z.string().optional().describe('Start time ISO string.'),
  timeMax: z.string().optional().describe('End time ISO string.'),
}

export const calendarQuickAddSchema = {
  text: z.string().min(1).describe('Natural language event description (e.g. "Lunch with Sarah tomorrow at noon").'),
  calendarId: z.string().optional().describe('Calendar ID. Defaults to "primary".'),
}

export const calendarBatchSchema = {
  operations: z.array(z.object({
    action: z.string().describe('Action to perform (same names as individual tools: listCalendars, getCalendar, listEvents, searchEvents, findFreeBusy, getEvent, eventInstances, quickAdd, createEvent, updateEvent, deleteEvent, respondToEvent, createEventSeries, setEventColor).'),
    params: z.record(z.string(), z.unknown()).default({}).describe('Parameters for the action. See individual tool schemas.'),
  })).min(1).max(20).describe('Ordered list of operations.'),
}

// ─── GMAIL SCHEMAS ───

export const gmailMessageIdSchema = z.string().min(1).describe('Gmail message ID.')
export const gmailThreadIdSchema = z.string().min(1).describe('Gmail thread ID.')
export const gmailDraftIdSchema = z.string().min(1).describe('Gmail draft ID.')
export const gmailEmailSchema = z.string().email().max(320).describe('Email address.')
export const gmailSubjectSchema = z.string().min(1).max(1000).describe('Email subject.')
export const gmailBodySchema = z.string().min(1).max(100000).describe('Email body.')

export const gmailSearchMessagesSchema = {
  query: z.string().max(500).optional().describe('Gmail search query.'),
  isUnread: z.string().optional().describe('Set to "true" for unread only.'),
  isStarred: z.string().optional().describe('Set to "true" for starred only.'),
  from: z.string().max(320).optional().describe('Filter by sender.'),
  to: z.string().max(320).optional().describe('Filter by recipient.'),
  subject: z.string().max(500).optional().describe('Filter by subject.'),
  before: z.string().optional().describe('Before date (YYYY/MM/DD).'),
  after: z.string().optional().describe('After date (YYYY/MM/DD).'),
  label: z.string().max(100).optional().describe('Filter by label.'),
  maxResults: z.number().int().min(1).max(100).default(20).describe('Max results.'),
  page: z.number().int().min(0).default(0).describe('Page number.'),
}

export const gmailListThreadsSchema = {
  query: z.string().max(500).optional().describe('Search query.'),
  isUnread: z.string().optional(), isStarred: z.string().optional(),
  from: z.string().max(320).optional(), subject: z.string().max(500).optional(),
  label: z.string().max(100).optional(),
  maxResults: z.number().int().min(1).max(100).default(20).describe('Max threads.'),
  page: z.number().int().min(0).default(0).describe('Page number.'),
}

export const gmailGetMessageSchema = { messageId: gmailMessageIdSchema }
export const gmailGetThreadSchema = { threadId: gmailThreadIdSchema }
export const gmailListDraftsSchema = { maxResults: z.number().int().min(1).max(100).default(20).optional().describe('Max drafts.') }
export const gmailGetDraftSchema = { draftId: gmailDraftIdSchema }
export const gmailDeleteDraftSchema = { draftId: gmailDraftIdSchema, ...confirmationSchema }
export const gmailSendDraftSchema = { draftId: gmailDraftIdSchema, ...confirmationSchema }

export const gmailSendSchema = {
  to: gmailEmailSchema.describe('Recipient email.'),
  subject: gmailSubjectSchema.describe('Email subject.'),
  body: gmailBodySchema.describe('Plain text body.'),
  cc: z.string().max(1000).optional().describe('CC recipient(s).'),
  bcc: z.string().max(1000).optional().describe('BCC recipient(s).'),
  htmlBody: z.string().max(200000).optional().describe('HTML body.'),
  ...confirmationSchema,
}

export const gmailCreateDraftSchema = gmailSendSchema

export const gmailUpdateDraftSchema = {
  draftId: gmailDraftIdSchema,
  to: z.string().max(320).optional(),
  subject: z.string().max(1000).optional(),
  body: z.string().max(100000).optional(),
  cc: z.string().max(1000).optional(),
  bcc: z.string().max(1000).optional(),
}

export const gmailMarkReadSchema = { messageId: gmailMessageIdSchema }
export const gmailMarkUnreadSchema = { messageId: gmailMessageIdSchema }
export const gmailArchiveSchema = { messageId: gmailMessageIdSchema }
export const gmailStarSchema = { messageId: gmailMessageIdSchema }
export const gmailUnstarSchema = { messageId: gmailMessageIdSchema }
export const gmailTrashMessageSchema = { messageId: gmailMessageIdSchema, ...confirmationSchema }
export const gmailUntrashMessageSchema = { messageId: gmailMessageIdSchema }
export const gmailDeleteMessageSchema = { messageId: gmailMessageIdSchema, ...confirmationSchema }
export const gmailTrashThreadSchema = { threadId: gmailThreadIdSchema, ...confirmationSchema }
export const gmailUntrashThreadSchema = { threadId: gmailThreadIdSchema }

export const gmailLabelSchema = {
  messageId: gmailMessageIdSchema,
  labelName: z.string().min(1).max(100).describe('Label name.'),
}

export const gmailReplySchema = {
  messageId: gmailMessageIdSchema,
  body: gmailBodySchema.describe('Reply body.'),
  htmlBody: z.string().max(200000).optional().describe('HTML body.'),
  ...confirmationSchema,
}

export const gmailReplyAllSchema = gmailReplySchema

export const gmailForwardSchema = {
  messageId: gmailMessageIdSchema,
  to: gmailEmailSchema.describe('Recipient email.'),
  htmlBody: z.string().max(200000).optional(),
  ...confirmationSchema,
}

export const gmailAttachmentGetSchema = {
  messageId: gmailMessageIdSchema,
  attachmentId: z.string().min(1).describe('Attachment ID from the message.'),
}

export const gmailBatchModifySchema = {
  messageIds: z.array(z.string().min(1)).min(1).describe('Array of message IDs to modify.'),
  addLabels: z.array(z.string()).optional().describe('Label names or IDs to add.'),
  removeLabels: z.array(z.string()).optional().describe('Label names or IDs to remove.'),
}

export const gmailBatchSchema = {
  operations: z.array(z.object({
    action: z.string().describe('Action to perform (same names as individual tools: profile, searchMessages, listThreads, getMessage, getThread, listLabels, send, createDraft, createDraftReply, createDraftReplyAll, listDrafts, getDraft, updateDraft, deleteDraft, sendDraft, markRead, markUnread, archive, star, unstar, addLabel, removeLabel, trashMessage, untrashMessage, deleteMessage, trashThread, untrashThread, reply, replyAll, forward, attachmentGet, batchModify).'),
    params: z.record(z.string(), z.unknown()).default({}).describe('Parameters for the action. See individual tool schemas.'),
  })).min(1).max(20).describe('Ordered list of operations.'),
}

// ─── SHEETS SCHEMAS ───

export const sheetsSpreadsheetIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid spreadsheet ID.')

export const sheetsSpreadsheetGetSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
}

export const sheetsSpreadsheetCreateSchema = {
  name: z.string().min(1).describe('Spreadsheet name.'),
}

export const sheetsRangeReadSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().optional().describe('Range in A1 notation (e.g. "A1:C10"). Defaults to all data.'),
}

export const sheetsRangeWriteSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().describe('Starting cell or range in A1 notation (e.g. "A1" or "A1:C3").'),
  values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).describe('2D array of values to write.'),
}

export const sheetsAppendRowsSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).describe('2D array of rows to append.'),
}

export const sheetsClearRangeSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().optional().describe('Range in A1 notation. Defaults to all data.'),
  ...confirmationSchema,
}

export const sheetsGetFormulasSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().optional().describe('Range in A1 notation. Defaults to all data.'),
}

export const sheetsGetNotesSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().optional().describe('Range in A1 notation. Defaults to all data.'),
}

export const sheetsAddSheetSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().min(1).describe('Name for the new sheet/tab.'),
}

export const sheetsDeleteSheetSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().min(1).describe('Name of the sheet/tab to delete.'),
  ...confirmationSchema,
}

export const sheetsRenameSheetSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  oldName: z.string().min(1).describe('Current sheet/tab name.'),
  newName: z.string().min(1).describe('New sheet/tab name.'),
}

export const sheetsCopySheetSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Source spreadsheet ID.'),
  sheetName: z.string().min(1).describe('Name of the sheet to copy.'),
  destSpreadsheetId: z.string().optional().describe('Destination spreadsheet ID. Omit to copy within same spreadsheet.'),
  newName: z.string().optional().describe('Name for the copied sheet.'),
}

export const sheetsFormatRangeSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().describe('Range in A1 notation (e.g. "A1:C10").'),
  background: z.string().optional().describe('Background color (CSS: "#FFFF00" or "yellow").'),
  fontColor: z.string().optional().describe('Font color (CSS).'),
  fontFamily: z.string().optional().describe('Font family (e.g. "Arial", "Roboto").'),
  fontSize: z.number().int().min(1).max(400).optional().describe('Font size in points.'),
  bold: z.boolean().optional().describe('Set bold.'),
  italic: z.boolean().optional().describe('Set italic.'),
  underline: z.boolean().optional().describe('Set underline.'),
  strikethrough: z.boolean().optional().describe('Set strikethrough.'),
  horizontalAlignment: z.enum(['left', 'center', 'right', 'general']).optional().describe('Horizontal alignment.'),
  verticalAlignment: z.enum(['top', 'middle', 'bottom']).optional().describe('Vertical alignment.'),
  numberFormat: z.string().optional().describe('Format pattern (#,##0.00, 0.00%, $#,##0.00, yyyy-mm-dd, @ for text).'),
  textWrap: z.boolean().optional().describe('Enable text wrapping.'),
  borderTop: z.boolean().optional().describe('Add top border.'),
  borderBottom: z.boolean().optional().describe('Add bottom border.'),
  borderLeft: z.boolean().optional().describe('Add left border.'),
  borderRight: z.boolean().optional().describe('Add right border.'),
  borderStyle: z.enum(['SOLID', 'DOTTED', 'DASHED', 'DOUBLE']).default('SOLID').optional().describe('Border line style.'),
  borderColor: z.string().optional().describe('Border color (CSS, default: black).'),
}

export const sheetsMergeCellsSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().describe('Range in A1 notation (e.g. "A1:C1").'),
}

export const sheetsSetColumnWidthSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  column: z.number().int().min(1).describe('Column number (1-based, A=1).'),
  width: z.number().int().min(10).max(1024).describe('Width in pixels.'),
}

export const sheetsFreezeRowsSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  numRows: z.number().int().min(0).describe('Number of rows to freeze. 0 to unfreeze.'),
}

export const sheetsSortRangeSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().describe('Range in A1 notation (e.g. "A2:C50").'),
  sortColumn: z.number().int().min(1).describe('Column number within the range to sort by (1-based, relative to range start).'),
  ascending: z.boolean().default(true).describe('Sort ascending if true, descending if false.'),
}

export const sheetsSetFormulaSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().describe('Cell or range in A1 notation (e.g. "D1" or "D1:D10").'),
  formula: z.string().describe('Formula string (e.g. "=SUM(A1:A10)").'),
}

export const sheetsCreateChartSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().describe('Data range in A1 notation (e.g. "A1:B10"). First row used as headers.'),
  chartType: z.enum(['AREA', 'BAR', 'COLUMN', 'COMBO', 'HISTOGRAM', 'LINE', 'PIE', 'SCATTER', 'TABLE', 'TIMELINE', 'WATERFALL']).describe('Chart type.'),
  title: z.string().optional().describe('Chart title.'),
  xAxisTitle: z.string().optional().describe('X-axis title.'),
  yAxisTitle: z.string().optional().describe('Y-axis title.'),
  position: z.string().default('A1').optional().describe('Anchor cell for chart position (e.g. "D1").'),
  width: z.number().int().min(100).max(1200).default(600).optional().describe('Chart width in pixels.'),
  height: z.number().int().min(100).max(1200).default(400).optional().describe('Chart height in pixels.'),
  legendPosition: z.enum(['BOTTOM', 'TOP', 'LEFT', 'RIGHT', 'NONE', 'LABELED']).default('RIGHT').optional().describe('Legend position.'),
  stacked: z.boolean().optional().describe('Use stacked chart (BAR, COLUMN, AREA only).'),
}

export const sheetsSetNoteSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: z.string().describe('Cell or range in A1 notation.'),
  note: z.string().describe('Note text. Use empty string to clear notes.'),
}

export const sheetsBatchSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  operations: z.array(z.object({
    action: z.string().describe('Action to perform (same action names used by individual tools: spreadsheetCreate, spreadsheetGet, sheetAdd, sheetDelete, sheetRename, sheetCopy, rangeRead, rangeWrite, rowsAppend, rangeClear, rangeGetFormulas, rangeGetNotes, valuesBatchGet, rangeFormat, rangeMerge, rangeUnmerge, columnWidth, freezeRows, rangeSort, formulaSet, chartCreate, noteSet, conditionalFormatGet, dataValidationSet, rowsInsert, rowsDelete).'),
    params: z.record(z.string(), z.unknown()).default({}).describe('Parameters for the action. See individual tool schemas for parameter details.'),
  })).min(1).max(20).describe('Ordered list of operations to execute.'),
}

export const sheetsConditionalFormatSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
}

export const sheetsDataValidationSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  range: z.string().describe('Range in A1 notation to apply validation to.'),
  validationType: z.enum([
    'VALUE_IN_LIST', 'NUMBER_BETWEEN', 'NUMBER_GREATER_THAN',
    'NUMBER_GREATER_THAN_OR_EQUAL_TO', 'NUMBER_LESS_THAN',
    'NUMBER_LESS_THAN_OR_EQUAL_TO', 'NUMBER_EQUAL_TO',
    'NUMBER_NOT_BETWEEN', 'TEXT_CONTAINS', 'TEXT_DOES_NOT_CONTAIN',
    'TEXT_EQUAL_TO', 'TEXT_IS_VALID_EMAIL', 'TEXT_IS_VALID_URL',
    'DATE_EQUAL_TO', 'DATE_BEFORE', 'DATE_AFTER',
    'CHECKBOX', 'CUSTOM_FORMULA',
  ]).describe('Type of validation rule.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  values: z.array(z.string()).optional().describe('List of allowed values for VALUE_IN_LIST.'),
  min: z.number().optional().describe('Minimum value for NUMBER_BETWEEN / NUMBER_NOT_BETWEEN.'),
  max: z.number().optional().describe('Maximum value for NUMBER_BETWEEN / NUMBER_NOT_BETWEEN.'),
  value: z.number().optional().describe('Comparison value for NUMBER_GREATER_THAN, NUMBER_LESS_THAN, etc.'),
  text: z.string().optional().describe('Text for TEXT_CONTAINS, TEXT_DOES_NOT_CONTAIN, TEXT_EQUAL_TO.'),
  date: z.string().optional().describe('ISO date string for DATE_EQUAL_TO, DATE_BEFORE, DATE_AFTER.'),
  formula: z.string().optional().describe('Custom formula string for CUSTOM_FORMULA.'),
  helpText: z.string().optional().describe('Help text shown when the cell is selected.'),
  strict: z.boolean().default(false).optional().describe('If true, reject invalid input instead of showing a warning.'),
}

export const sheetsBatchGetSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  ranges: z.array(z.string()).describe('Array of range strings in A1 notation (e.g. ["Sheet1!A1:B10", "Sheet2!C1:D20"]).'),
}

export const sheetsInsertRowsSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  startPosition: z.number().int().min(1).describe('Row index to insert before (1-based).'),
  howMany: z.number().int().min(1).default(1).describe('Number of rows to insert.'),
}

export const sheetsDeleteRowsSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  startPosition: z.number().int().min(1).describe('Row index to start deleting from (1-based).'),
  howMany: z.number().int().min(1).default(1).describe('Number of rows to delete.'),
  ...confirmationSchema,
}

// ─── SLIDES SCHEMAS ───

export const slidesPresentationIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid presentation ID.')

export const slidesPresentationGetSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
}

export const slidesCreatePresentationSchema = {
  name: z.string().min(1).describe('Presentation name.'),
}

export const slidesAddSlideSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  titleText: z.string().optional().describe('Optional title text for the new slide. Sets the top text box if a layout with a title placeholder exists.'),
  bodyText: z.string().optional().describe('Optional body text for the new slide.'),
}

export const slidesSlideIndexSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  ...confirmationSchema,
}

export const slidesMoveSlideSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index to move (0-based).'),
  newIndex: z.number().int().min(0).describe('Destination index (0-based).'),
}

export const slidesInsertTextBoxSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  text: z.string().describe('Text content for the text box.'),
  autoPosition: z.boolean().default(true).describe('Auto-place below existing elements. When true, left/top/width/height are auto-computed; override any by providing an explicit value. When false, uses specified coordinates (defaults to 72, 72, 576, 72).'),
  left: z.number().optional().describe('Left position in points. Overrides auto-positioning for this axis when set.'),
  top: z.number().optional().describe('Top position in points. Overrides auto-positioning for this axis when set.'),
  width: z.number().optional().describe('Width in points. Default auto-width fills between margins.'),
  height: z.number().optional().describe('Height in points. Default: 72.'),
}

export const slidesInsertImageSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  imageUrl: z.string().url().describe('Public URL of the image to insert.'),
  autoPosition: z.boolean().default(true).describe('Auto-place below existing elements. When true and no coordinates given, auto-places.'),
  left: z.number().optional().describe('Left position in points.'),
  top: z.number().optional().describe('Top position in points.'),
  width: z.number().optional().describe('Width in points (default: 300).'),
  height: z.number().optional().describe('Height in points (default: 200).'),
}

export const slidesInsertShapeSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  shapeType: z.enum(['RECTANGLE', 'ROUND_RECTANGLE', 'ELLIPSE', 'TRIANGLE', 'ARROW_RIGHT', 'ARROW_LEFT', 'STAR_5', 'HEXAGON', 'CLOUD', 'FLOW_CHART_PROCESS', 'FLOW_CHART_DECISION', 'WAVE', 'CHEVRON', 'PENTAGON', 'TRAPEZOID']).describe('Shape type.'),
  autoPosition: z.boolean().default(true).describe('Auto-place below existing elements.'),
  left: z.number().optional().describe('Left position in points.'),
  top: z.number().optional().describe('Top position in points.'),
  width: z.number().optional().describe('Width in points (default: 300).'),
  height: z.number().optional().describe('Height in points (default: 200).'),
}

export const slidesInsertTableSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).describe('2D array of cell values.'),
  rows: z.number().int().min(1).max(20).optional().describe('Number of rows (default: values.length).'),
  cols: z.number().int().min(1).max(10).optional().describe('Number of columns (default: values[0].length).'),
  autoPosition: z.boolean().default(true).describe('Auto-place below existing elements.'),
  left: z.number().optional().describe('Left position in points.'),
  top: z.number().optional().describe('Top position in points.'),
  width: z.number().optional().describe('Width in points (default: 576).'),
  height: z.number().optional().describe('Height in points (default: 200).'),
}

export const slidesReplaceAllTextSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  findText: z.string().min(1).describe('Text to find.'),
  replaceText: z.string().describe('Replacement text.'),
}

export const slidesSlideNotesSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  notes: z.string().optional().describe('Speaker notes text. If provided, sets notes. If omitted, returns current notes.'),
}

export const slidesDeleteElementSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  objectId: z.string().describe('Object ID of the element to delete.'),
  ...confirmationSchema,
}

export const slidesGetElementTextSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  objectId: z.string().describe('Object ID of the shape element to read text from.'),
}

export const slidesFormatTextSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  objectId: z.string().describe('Object ID of the shape element to format.'),
  findText: z.string().describe('Text to find and format within the element.'),
  bold: z.boolean().optional().describe('Set bold.'),
  italic: z.boolean().optional().describe('Set italic.'),
  underline: z.boolean().optional().describe('Set underline.'),
  fontFamily: z.string().optional().describe('Font family (e.g. "Arial").'),
  fontSize: z.number().int().min(1).max(400).optional().describe('Font size in points.'),
  foregroundColor: z.string().optional().describe('Text color (CSS).'),
  backgroundColor: z.string().optional().describe('Background color (CSS).'),
  linkUrl: z.string().optional().describe('Set hyperlink URL.'),
}

export const slidesBackgroundSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  color: z.string().describe('Hex color string (e.g. "#FF0000").'),
}

export const slidesInsertLineSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  lineCategory: z.enum(['STRAIGHT', 'BENT', 'CURVED']).describe('Line connector category.'),
  startLeft: z.number().describe('Start position left in points.'),
  startTop: z.number().describe('Start position top in points.'),
  endLeft: z.number().describe('End position left in points.'),
  endTop: z.number().describe('End position top in points.'),
  lineType: z.enum(['SOLID', 'DOTTED', 'DASHED']).default('SOLID').optional().describe('Line style.'),
}

export const slidesBatchSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  operations: z.array(z.object({
    action: z.string().describe('Action to perform (same names as individual tools: presentationGet, slideAdd, slideDelete, slideDuplicate, slideMove, textBoxInsert, imageInsert, shapeInsert, tableInsert, slideElementsList, elementDelete, elementGetText, elementFormatText, slideNotes, textReplaceAll, slideBackground, lineInsert).'),
    params: z.record(z.string(), z.unknown()).default({}).describe('Parameters for the action. See individual tool schemas.'),
  })).min(1).max(20).describe('Ordered list of operations.'),
}

// ─── DOCS SCHEMAS ───

export const docsDocumentIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid document ID.')

export const docsDocumentGetSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
}

export const docsCreateDocumentSchema = {
  name: z.string().min(1).describe('Document name.'),
}

export const docsInsertParagraphSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  text: z.string().optional().describe('Paragraph text content.'),
  heading: z.enum(['NORMAL', 'HEADING1', 'HEADING2', 'HEADING3', 'HEADING4', 'HEADING5', 'HEADING6']).default('NORMAL').optional().describe('Heading level. NORMAL is body text.'),
  append: z.boolean().default(true).describe('If true, appends to end of document. If false, inserts at the beginning.'),
}

export const docsUpdateParagraphSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  paragraphIndex: z.number().int().min(0).describe('Index of the paragraph to update (0-based).'),
  heading: z.enum(['NORMAL', 'HEADING1', 'HEADING2', 'HEADING3', 'HEADING4', 'HEADING5', 'HEADING6']).optional().describe('New heading level. NORMAL is body text.'),
  text: z.string().optional().describe('New paragraph text content.'),
}

export const docsDeleteParagraphSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  paragraphIndex: z.number().int().min(0).describe('Index of the paragraph to delete (0-based).'),
  ...confirmationSchema,
}

export const docsHeaderFooterSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  text: z.string().describe('Header/footer text. Use empty string to clear.'),
}

export const docsSetTextSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  text: z.string().describe('New text content for the entire document.'),
  ...confirmationSchema,
}

export const docsReplaceTextSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  findText: z.string().min(1).describe('Text to find.'),
  replaceText: z.string().describe('Replacement text.'),
}

export const docsInsertListSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  items: z.array(z.string()).describe('Array of list item texts.'),
  listType: z.enum(['BULLET', 'NUMBER']).default('BULLET').describe('List type: bullet points or numbered.'),
  append: z.boolean().default(true).describe('If true, appends to end of document.'),
}

export const docsInsertTableSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  values: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).describe('2D array of cell values. First row is header.'),
  rows: z.number().int().min(1).max(50).optional().describe('Number of rows (default: values.length).'),
  cols: z.number().int().min(1).max(20).optional().describe('Number of columns (default: values[0].length).'),
  append: z.boolean().default(true).describe('If true, appends to end of document.'),
}

export const docsInsertImageSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  imageUrl: z.string().url().describe('Public URL of the image to insert.'),
  append: z.boolean().default(true).describe('If true, appends to end of document.'),
}

export const docsInsertPageBreakSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  append: z.boolean().default(true).describe('If true, appends to end of document.'),
}

export const docsInsertHorizontalRuleSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  append: z.boolean().default(true).describe('If true, appends to end of document.'),
}

export const docsFormatTextSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  findText: z.string().min(1).describe('Text to find and format.'),
  bold: z.boolean().optional().describe('Set bold.'),
  italic: z.boolean().optional().describe('Set italic.'),
  underline: z.boolean().optional().describe('Set underline.'),
  strikethrough: z.boolean().optional().describe('Set strikethrough.'),
  fontFamily: z.string().optional().describe('Font family (e.g. "Arial", "Roboto").'),
  fontSize: z.number().int().min(1).max(400).optional().describe('Font size in points.'),
  foregroundColor: z.string().optional().describe('Text color (CSS, e.g. "#FF0000").'),
  backgroundColor: z.string().optional().describe('Background color (CSS).'),
  linkUrl: z.string().optional().describe('Set hyperlink URL.'),
}

export const docsGetAsJsonSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
}

export const docsBatchSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
  operations: z.array(z.object({
    action: z.string().describe('Action to perform (same names as individual tools: documentGet, documentGetJson, paragraphInsert, paragraphUpdate, paragraphDelete, setText, replaceText, listInsert, tableInsert, imageInsert, pageBreakInsert, horizontalRuleInsert, formatText, headerSet, footerSet).'),
    params: z.record(z.string(), z.unknown()).default({}).describe('Parameters for the action. See individual tool schemas.'),
  })).min(1).max(20).describe('Ordered list of operations.'),
}
