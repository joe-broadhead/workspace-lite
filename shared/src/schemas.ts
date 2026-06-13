import { z } from 'zod'

export const driveIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid Drive ID')

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
}

export const fileAddEditorSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to add as editor.'),
}

export const fileAddViewerSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to add as viewer.'),
}

export const fileRemoveEditorSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to remove as editor.'),
}

export const fileRemoveViewerSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to remove as viewer.'),
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
export const gmailDeleteDraftSchema = { draftId: gmailDraftIdSchema }
export const gmailSendDraftSchema = { draftId: gmailDraftIdSchema }

export const gmailSendSchema = {
  to: gmailEmailSchema.describe('Recipient email.'),
  subject: gmailSubjectSchema.describe('Email subject.'),
  body: gmailBodySchema.describe('Plain text body.'),
  cc: z.string().max(1000).optional().describe('CC recipient(s).'),
  bcc: z.string().max(1000).optional().describe('BCC recipient(s).'),
  htmlBody: z.string().max(200000).optional().describe('HTML body.'),
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
export const gmailTrashMessageSchema = { messageId: gmailMessageIdSchema }
export const gmailUntrashMessageSchema = { messageId: gmailMessageIdSchema }
export const gmailDeleteMessageSchema = { messageId: gmailMessageIdSchema }
export const gmailTrashThreadSchema = { threadId: gmailThreadIdSchema }
export const gmailUntrashThreadSchema = { threadId: gmailThreadIdSchema }

export const gmailLabelSchema = {
  messageId: gmailMessageIdSchema,
  labelName: z.string().min(1).max(100).describe('Label name.'),
}

export const gmailReplySchema = {
  messageId: gmailMessageIdSchema,
  body: gmailBodySchema.describe('Reply body.'),
  htmlBody: z.string().max(200000).optional().describe('HTML body.'),
}

export const gmailReplyAllSchema = gmailReplySchema

export const gmailForwardSchema = {
  messageId: gmailMessageIdSchema,
  to: gmailEmailSchema.describe('Recipient email.'),
  htmlBody: z.string().max(200000).optional(),
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
  values: z.array(z.array(z.string())).describe('2D array of values to write.'),
}

export const sheetsAppendRowsSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  values: z.array(z.array(z.string())).describe('2D array of rows to append.'),
}

export const sheetsClearRangeSchema = {
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
  operations: z.array(z.object({
    action: z.string().describe('Action to perform (same action names used by individual tools: spreadsheetCreate, spreadsheetGet, sheetAdd, sheetDelete, sheetRename, sheetCopy, rangeRead, rangeWrite, rowsAppend, rangeClear, rangeFormat, rangeMerge, rangeUnmerge, columnWidth, freezeRows, rangeSort, formulaSet, chartCreate, noteSet).'),
    params: z.record(z.string(), z.unknown()).describe('Parameters for the action. See individual tool schemas for parameter details.'),
  })).min(1).max(20).describe('Ordered list of operations to execute.'),
}
