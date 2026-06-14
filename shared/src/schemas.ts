import { z } from 'zod'

export const googleIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid Google Workspace ID')
export const driveIdSchema = googleIdSchema.describe('Drive file or folder ID.')
export const isoDateTimeSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid ISO datetime')
export const gmailSearchDateSchema = z.string().regex(/^\d{4}\/\d{1,2}\/\d{1,2}$/, 'Use Gmail date format YYYY/MM/DD')
export const emailListSchema = z.string().max(1000).refine((value) => value.split(',').map((email) => email.trim()).filter(Boolean).every((email) => z.string().email().safeParse(email).success), 'Use comma-separated email addresses')
export const httpsUrlSchema = z.string().url().refine((value) => {
  try { return new URL(value).protocol === 'https:' }
  catch { return false }
}, 'URL must use https')
export const a1RangeSchema = z.string().max(200).regex(/^(?:(?:'[^']+'|[A-Za-z0-9_ .-]+)!)?(?:\$?[A-Z]{1,3}\$?\d{1,7}(?::\$?[A-Z]{1,3}\$?\d{1,7})?|\$?[A-Z]{1,3}:\$?[A-Z]{1,3}|\d{1,7}:\d{1,7})$/, 'Use A1 notation')
export const cssColorSchema = z.string().regex(/^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,32})$/, 'Use a named color or hex color')
export const formulaSchema = z.string().refine((value) => value.trim().startsWith('='), 'Formula must start with =')
export const idempotencyKeySchema = z.string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/, 'Use letters, numbers, dot, underscore, colon, or dash')
  .optional()
  .describe('Stable caller-provided key used to deduplicate retry-prone create, send, and share operations.')

export const confirmationSchema = {
  confirm: z.boolean().optional().describe('Required for server-gated send, share, or destructive actions after explicit user approval.'),
}

type ToolSchema = Record<string, z.ZodTypeAny>

function batchOperationSchema<Action extends string>(action: Action, schema: ToolSchema = {}) {
  return z.object({
    action: z.literal(action),
    params: z.object(schema).strict().default({}).describe('Parameters for this action.'),
  }).strict()
}

function omitSchemaKeys(schema: ToolSchema, keys: string[]): ToolSchema {
  const copy = { ...schema }
  for (const key of keys) delete copy[key]
  return copy
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
  folderId: driveIdSchema.describe('Folder ID.'),
}

export const folderListSchema = {
  folderId: driveIdSchema.optional().describe('Folder ID. Omit for root folder.'),
}

export const folderCreateSchema = {
  name: z.string().describe('Folder name.'),
  parentId: driveIdSchema.optional().describe('Parent folder ID. Omit for root.'),
  idempotencyKey: idempotencyKeySchema,
}

export const fileCreateSchema = {
  name: z.string().describe('File name.'),
  content: z.string().max(1000000).describe('File content.'),
  mimeType: z.string().default('text/plain').describe('MIME type (e.g. text/markdown, application/json).'),
  parentId: driveIdSchema.optional().describe('Parent folder ID. Omit for root.'),
  idempotencyKey: idempotencyKeySchema,
}

export const fileCopySchema = {
  fileId: driveIdSchema.describe('Source file ID.'),
  name: z.string().optional().describe('New name for copy.'),
  destFolderId: driveIdSchema.optional().describe('Destination folder ID.'),
  idempotencyKey: idempotencyKeySchema,
}

export const fileMoveSchema = {
  fileId: driveIdSchema.describe('File ID to move.'),
  destFolderId: driveIdSchema.describe('Destination folder ID.'),
}

export const fileUpdateMetaSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  name: z.string().optional().describe('New name.'),
  description: z.string().optional().describe('New description.'),
}

export const fileUpdateContentSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  content: z.string().max(1000000).describe('New file content.'),
}

export const fileSetSharingSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  access: z.enum(['ANYONE', 'ANYONE_WITH_LINK', 'DOMAIN', 'DOMAIN_WITH_LINK', 'PRIVATE']).describe('Sharing access level.'),
  permission: z.enum(['NONE', 'VIEW', 'EDIT', 'COMMENT', 'ORGANIZER', 'FILE_ORGANIZER', 'OWNER']).describe('Sharing permission.'),
  idempotencyKey: idempotencyKeySchema,
  ...confirmationSchema,
}

export const fileAddEditorSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to add as editor.'),
  idempotencyKey: idempotencyKeySchema,
  ...confirmationSchema,
}

export const fileAddViewerSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to add as viewer.'),
  idempotencyKey: idempotencyKeySchema,
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
  folderId: driveIdSchema.describe('Folder ID to add as additional parent.'),
}

export const driveRemoveParentSchema = {
  fileId: driveIdSchema.describe('File ID.'),
  folderId: driveIdSchema.describe('Folder ID to remove from parents.'),
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
  pageSize: z.number().int().min(1).max(100).default(100).optional().describe('Max comments.'),
  pageToken: z.string().optional().describe('Next page token from a previous response.'),
  includeDeleted: z.boolean().optional().describe('Include deleted comments when supported.'),
}

export const driveCommentCreateSchema = {
  fileId: driveIdSchema.describe('Drive file ID to comment on.'),
  content: z.string().min(1).describe('Comment text content.'),
  idempotencyKey: idempotencyKeySchema,
}

export const driveCommentGetSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  commentId: z.string().min(1).describe('Drive comment ID.'),
  includeDeleted: z.boolean().optional().describe('Include deleted comment metadata when supported.'),
}

export const driveCommentUpdateSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  commentId: z.string().min(1).describe('Drive comment ID.'),
  content: z.string().min(1).optional().describe('Replacement comment content.'),
  resolved: z.boolean().optional().describe('Set comment resolved state.'),
}

export const driveCommentDeleteSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  commentId: z.string().min(1).describe('Drive comment ID.'),
  ...confirmationSchema,
}

export const driveRepliesListSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  commentId: z.string().min(1).describe('Drive comment ID.'),
  pageSize: z.number().int().min(1).max(100).default(100).optional().describe('Max replies.'),
  pageToken: z.string().optional().describe('Next page token from a previous response.'),
  includeDeleted: z.boolean().optional().describe('Include deleted replies when supported.'),
}

export const driveReplyCreateSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  commentId: z.string().min(1).describe('Drive comment ID.'),
  content: z.string().min(1).describe('Reply text content.'),
  idempotencyKey: idempotencyKeySchema,
}

export const driveReplyGetSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  commentId: z.string().min(1).describe('Drive comment ID.'),
  replyId: z.string().min(1).describe('Drive reply ID.'),
  includeDeleted: z.boolean().optional().describe('Include deleted reply metadata when supported.'),
}

export const driveReplyUpdateSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  commentId: z.string().min(1).describe('Drive comment ID.'),
  replyId: z.string().min(1).describe('Drive reply ID.'),
  content: z.string().min(1).describe('Replacement reply content.'),
}

export const driveReplyDeleteSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  commentId: z.string().min(1).describe('Drive comment ID.'),
  replyId: z.string().min(1).describe('Drive reply ID.'),
  ...confirmationSchema,
}

export const driveRevisionsListSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  pageSize: z.number().int().min(1).max(100).default(100).optional().describe('Max revisions.'),
  pageToken: z.string().optional().describe('Next page token from a previous response.'),
}

export const driveRevisionGetSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  revisionId: z.string().min(1).describe('Drive revision ID.'),
}

export const driveRevisionUpdateSchema = {
  fileId: driveIdSchema.describe('Drive file ID.'),
  revisionId: z.string().min(1).describe('Drive revision ID.'),
  keepForever: z.boolean().optional().describe('Whether to keep this binary revision forever, where Drive API supports it.'),
}

export const driveSharedDrivesListSchema = {
  pageSize: z.number().int().min(1).max(100).default(100).optional().describe('Max shared drives.'),
  pageToken: z.string().optional().describe('Next page token from a previous response.'),
  query: z.string().optional().describe('Shared drive query string.'),
}

export const driveSharedDriveGetSchema = {
  driveId: driveIdSchema.describe('Shared drive ID.'),
}

export const driveChangesStartPageTokenSchema = {
  driveId: driveIdSchema.optional().describe('Shared drive ID. Omit for My Drive changes.'),
}

export const driveChangesListSchema = {
  pageToken: z.string().min(1).describe('Start or next page token returned by drive_get_start_page_token or drive_list_changes.'),
  pageSize: z.number().int().min(1).max(100).default(100).optional().describe('Max changes.'),
  driveId: driveIdSchema.optional().describe('Shared drive ID.'),
  includeItemsFromAllDrives: z.boolean().optional().describe('Include My Drive and shared drive items. Defaults to true.'),
  restrictToMyDrive: z.boolean().optional().describe('Restrict changes to My Drive.'),
  spaces: z.string().optional().describe('Comma-separated spaces to query, default drive.'),
}

export const driveBatchSchema = {
  operations: z.array(z.discriminatedUnion('action', [
    batchOperationSchema('about'),
    batchOperationSchema('fileGet', fileGetSchema),
    batchOperationSchema('fileList', fileListSchema),
    batchOperationSchema('fileSearch', fileSearchSchema),
    batchOperationSchema('fileExport', fileExportSchema),
    batchOperationSchema('folderGet', folderGetSchema),
    batchOperationSchema('folderList', folderListSchema),
    batchOperationSchema('folderListRoot'),
    batchOperationSchema('folderCreate', folderCreateSchema),
    batchOperationSchema('fileCreate', fileCreateSchema),
    batchOperationSchema('fileCopy', fileCopySchema),
    batchOperationSchema('fileMove', fileMoveSchema),
    batchOperationSchema('fileUpdateMeta', fileUpdateMetaSchema),
    batchOperationSchema('fileUpdateContent', fileUpdateContentSchema),
    batchOperationSchema('fileGetPermissions', fileGetSchema),
    batchOperationSchema('fileSetSharing', fileSetSharingSchema),
    batchOperationSchema('fileAddEditor', fileAddEditorSchema),
    batchOperationSchema('fileAddViewer', fileAddViewerSchema),
    batchOperationSchema('fileRemoveEditor', fileRemoveEditorSchema),
    batchOperationSchema('fileRemoveViewer', fileRemoveViewerSchema),
    batchOperationSchema('fileAddParent', driveAddParentSchema),
    batchOperationSchema('fileRemoveParent', driveRemoveParentSchema),
    batchOperationSchema('folderPath', driveFolderPathSchema),
    batchOperationSchema('fileTrash', fileGetSchema),
    batchOperationSchema('fileUntrash', fileGetSchema),
    batchOperationSchema('fileDelete', fileGetSchema),
    batchOperationSchema('fileExportAs', driveExportAsSchema),
    batchOperationSchema('commentsList', driveCommentsListSchema),
    batchOperationSchema('commentsGet', driveCommentGetSchema),
    batchOperationSchema('commentCreate', driveCommentCreateSchema),
    batchOperationSchema('commentsUpdate', driveCommentUpdateSchema),
    batchOperationSchema('commentsDelete', driveCommentDeleteSchema),
    batchOperationSchema('repliesList', driveRepliesListSchema),
    batchOperationSchema('repliesCreate', driveReplyCreateSchema),
    batchOperationSchema('repliesGet', driveReplyGetSchema),
    batchOperationSchema('repliesUpdate', driveReplyUpdateSchema),
    batchOperationSchema('repliesDelete', driveReplyDeleteSchema),
    batchOperationSchema('revisionsList', driveRevisionsListSchema),
    batchOperationSchema('revisionsGet', driveRevisionGetSchema),
    batchOperationSchema('revisionsUpdate', driveRevisionUpdateSchema),
    batchOperationSchema('sharedDrivesList', driveSharedDrivesListSchema),
    batchOperationSchema('sharedDrivesGet', driveSharedDriveGetSchema),
    batchOperationSchema('changesStartPageToken', driveChangesStartPageTokenSchema),
    batchOperationSchema('changesList', driveChangesListSchema),
  ])).min(1).max(20).describe('Ordered list of validated Drive operations.'),
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

export const calendarGetCalendarSchema = {
  calendarId: z.string().optional().describe('Calendar ID. Omit for default.'),
}

export const calendarGetEventSchema = {
  eventId: calendarEventIdSchema,
  calendarId: z.string().optional().describe('Calendar ID.'),
}

export const calendarCreateEventSchema = {
  title: z.string().min(1).max(1000).describe('Event title.'),
  startTime: isoDateTimeSchema.describe('Start time ISO string.'),
  endTime: isoDateTimeSchema.describe('End time ISO string.'),
  calendarId: z.string().optional().describe('Calendar ID.'),
  description: z.string().max(10000).optional().describe('Description.'),
  location: z.string().max(500).optional().describe('Location.'),
  guests: emailListSchema.optional().describe('Comma-separated emails.'),
  idempotencyKey: idempotencyKeySchema,
}

export const calendarUpdateEventSchema = {
  eventId: calendarEventIdSchema,
  calendarId: z.string().optional().describe('Calendar ID.'),
  title: z.string().min(1).max(1000).optional().describe('New title.'),
  description: z.string().max(10000).optional().describe('New description.'),
  location: z.string().max(500).optional().describe('New location.'),
  startTime: isoDateTimeSchema.optional().describe('New start time ISO.'),
  endTime: isoDateTimeSchema.optional().describe('New end time ISO.'),
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
  startTime: isoDateTimeSchema.describe('Start time ISO string.'),
  endTime: isoDateTimeSchema.describe('End time ISO string.'),
  recurrence: z.string().describe('Recurrence rule (e.g. "WEEKLY", "DAILY", "MONTHLY", "YEARLY", "EVERY MONDAY").'),
  calendarId: z.string().optional().describe('Calendar ID.'),
  description: z.string().max(10000).optional().describe('Description.'),
  location: z.string().max(500).optional().describe('Location.'),
  idempotencyKey: idempotencyKeySchema,
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
  idempotencyKey: idempotencyKeySchema,
}

export const calendarBatchSchema = {
  operations: z.array(z.discriminatedUnion('action', [
    batchOperationSchema('listCalendars'),
    batchOperationSchema('getCalendar', calendarGetCalendarSchema),
    batchOperationSchema('listEvents', calendarListEventsSchema),
    batchOperationSchema('searchEvents', calendarSearchEventsSchema),
    batchOperationSchema('findFreeBusy', calendarFreeBusySchema),
    batchOperationSchema('getEvent', calendarGetEventSchema),
    batchOperationSchema('eventInstances', calendarEventInstancesSchema),
    batchOperationSchema('quickAdd', calendarQuickAddSchema),
    batchOperationSchema('createEvent', calendarCreateEventSchema),
    batchOperationSchema('updateEvent', calendarUpdateEventSchema),
    batchOperationSchema('deleteEvent', calendarDeleteEventSchema),
    batchOperationSchema('respondToEvent', calendarRespondEventSchema),
    batchOperationSchema('createEventSeries', calendarCreateEventSeriesSchema),
    batchOperationSchema('setEventColor', calendarSetEventColorSchema),
  ])).min(1).max(20).describe('Ordered list of validated Calendar operations.'),
}

// ─── TASKS SCHEMAS ───

export const tasksIdSchema = z.string().min(1).max(256).regex(/^[a-zA-Z0-9_@.-]+$/, 'Invalid Google Tasks ID')
export const tasksTitleSchema = z.string().min(1).max(1024).describe('Title. Maximum 1024 characters.')
export const tasksPageTokenSchema = z.string().min(1).max(500).optional().describe('Opaque page token returned by a previous list call.')
export const tasksMaxResultsSchema = z.number().int().min(1).max(100).default(100).describe('Maximum results to return.')

export const tasksListTasklistsSchema = {
  maxResults: tasksMaxResultsSchema,
  pageToken: tasksPageTokenSchema,
}

export const tasksGetTasklistSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
}

export const tasksCreateTasklistSchema = {
  title: tasksTitleSchema.describe('Task list title.'),
  idempotencyKey: idempotencyKeySchema,
}

export const tasksUpdateTasklistSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
  title: tasksTitleSchema.describe('New task list title.'),
}

export const tasksDeleteTasklistSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
  ...confirmationSchema,
}

export const tasksListTasksSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
  maxResults: tasksMaxResultsSchema,
  pageToken: tasksPageTokenSchema,
  showCompleted: z.boolean().optional().describe('Whether to include completed tasks.'),
  showDeleted: z.boolean().optional().describe('Whether to include deleted tasks.'),
  showHidden: z.boolean().optional().describe('Whether to include hidden tasks.'),
  completedMin: isoDateTimeSchema.optional().describe('Lower bound for a task completion timestamp.'),
  completedMax: isoDateTimeSchema.optional().describe('Upper bound for a task completion timestamp.'),
  dueMin: isoDateTimeSchema.optional().describe('Lower bound for a task due timestamp.'),
  dueMax: isoDateTimeSchema.optional().describe('Upper bound for a task due timestamp.'),
  updatedMin: isoDateTimeSchema.optional().describe('Lower bound for last modification time.'),
}

export const tasksGetTaskSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
  taskId: tasksIdSchema.describe('Google Tasks task ID.'),
}

export const tasksCreateTaskSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
  title: tasksTitleSchema.describe('Task title.'),
  notes: z.string().max(10000).optional().describe('Task notes.'),
  due: isoDateTimeSchema.optional().describe('Due date/time as an ISO/RFC3339 string. Google Tasks stores due dates as dates.'),
  status: z.enum(['needsAction', 'completed']).optional().describe('Task status.'),
  parent: tasksIdSchema.optional().describe('Parent task ID for inserting as a subtask.'),
  previous: tasksIdSchema.optional().describe('Previous sibling task ID for insert ordering.'),
  idempotencyKey: idempotencyKeySchema,
}

export const tasksUpdateTaskSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
  taskId: tasksIdSchema.describe('Google Tasks task ID.'),
  title: tasksTitleSchema.optional().describe('New task title.'),
  notes: z.string().max(10000).optional().describe('New task notes.'),
  due: isoDateTimeSchema.optional().describe('New due date/time as an ISO/RFC3339 string. Google Tasks stores due dates as dates.'),
  status: z.enum(['needsAction', 'completed']).optional().describe('New task status.'),
}

export const tasksDeleteTaskSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
  taskId: tasksIdSchema.describe('Google Tasks task ID.'),
  ...confirmationSchema,
}

export const tasksMoveTaskSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
  taskId: tasksIdSchema.describe('Google Tasks task ID.'),
  parent: tasksIdSchema.optional().describe('New parent task ID. Omit to move as a top-level task.'),
  previous: tasksIdSchema.optional().describe('Previous sibling task ID. Omit to move to the first position.'),
}

export const tasksClearCompletedSchema = {
  tasklistId: tasksIdSchema.describe('Google Tasks task list ID.'),
  ...confirmationSchema,
}

export const tasksBatchSchema = {
  operations: z.array(z.discriminatedUnion('action', [
    batchOperationSchema('tasklistsList', tasksListTasklistsSchema),
    batchOperationSchema('tasklistsGet', tasksGetTasklistSchema),
    batchOperationSchema('tasklistsCreate', tasksCreateTasklistSchema),
    batchOperationSchema('tasklistsUpdate', tasksUpdateTasklistSchema),
    batchOperationSchema('tasklistsDelete', tasksDeleteTasklistSchema),
    batchOperationSchema('tasksList', tasksListTasksSchema),
    batchOperationSchema('tasksGet', tasksGetTaskSchema),
    batchOperationSchema('tasksCreate', tasksCreateTaskSchema),
    batchOperationSchema('tasksUpdate', tasksUpdateTaskSchema),
    batchOperationSchema('tasksDelete', tasksDeleteTaskSchema),
    batchOperationSchema('tasksMove', tasksMoveTaskSchema),
    batchOperationSchema('tasksClear', tasksClearCompletedSchema),
  ])).min(1).max(20).describe('Ordered list of validated Google Tasks operations.'),
}

// ─── FORMS SCHEMAS ───

export const formsIdSchema = googleIdSchema.describe('Google Form ID.')
export const formsSpreadsheetIdSchema = googleIdSchema.describe('Google Sheets spreadsheet ID for response destination.')
export const formsItemIdSchema = z.union([z.string().min(1), z.number().int().nonnegative()]).describe('Google Form item ID.')
export const formsResponseIdSchema = z.string().min(1).max(256).describe('Google Form response ID.')
export const formsTitleSchema = z.string().min(1).max(1024).describe('Form or item title.')
export const formsLongTextSchema = z.string().max(10000).describe('Text content. Maximum 10,000 characters.')
export const formsItemTypeSchema = z.enum([
  'TEXT', 'text',
  'PARAGRAPH_TEXT', 'PARAGRAPH', 'paragraph_text', 'paragraph',
  'MULTIPLE_CHOICE', 'multiple_choice',
  'CHECKBOX', 'checkbox',
  'LIST', 'list',
  'SCALE', 'scale',
  'DATE', 'date',
  'TIME', 'time',
  'SECTION_HEADER', 'section_header',
  'PAGE_BREAK', 'page_break',
]).describe('Supported Forms item type.')

const formsCommonItemFields = {
  title: formsTitleSchema.optional(),
  helpText: formsLongTextSchema.optional().describe('Optional help text shown under the item.'),
  required: z.boolean().optional().describe('Whether the item requires a response, when supported by the item type.'),
  choices: z.array(z.string().min(1).max(500)).min(1).max(200).optional().describe('Choice labels for multiple choice, checkbox, or list items.'),
  showOtherOption: z.boolean().optional().describe('Whether to show an "Other" option on supported choice items.'),
  lowerBound: z.number().int().min(0).max(10).optional().describe('Lower bound for scale items.'),
  upperBound: z.number().int().min(0).max(10).optional().describe('Upper bound for scale items.'),
  leftLabel: z.string().max(500).optional().describe('Left label for scale items.'),
  rightLabel: z.string().max(500).optional().describe('Right label for scale items.'),
}

export const formsCreateFormSchema = {
  title: formsTitleSchema.describe('Form title.'),
  description: formsLongTextSchema.optional().describe('Form description.'),
  isPublished: z.boolean().optional().describe('Whether the form is created in the published state.'),
  idempotencyKey: idempotencyKeySchema,
}

export const formsGetFormSchema = {
  formId: formsIdSchema,
  includeItems: z.boolean().optional().describe('Include item metadata in the response.'),
}

export const formsUpdateFormSchema = {
  formId: formsIdSchema,
  title: formsTitleSchema.optional().describe('New form title.'),
  description: formsLongTextSchema.optional().describe('New form description.'),
  confirmationMessage: formsLongTextSchema.optional().describe('Message shown after submission.'),
  customClosedFormMessage: formsLongTextSchema.optional().describe('Message shown while the form is closed to responses.'),
  collectEmail: z.boolean().optional().describe('Whether the form collects respondent email addresses.'),
  allowResponseEdits: z.boolean().optional().describe('Whether respondents can edit responses after submission.'),
  limitOneResponsePerUser: z.boolean().optional().describe('Whether the form limits responses to one per user.'),
  publishingSummary: z.boolean().optional().describe('Whether respondents can view the response summary.'),
  isPublished: z.boolean().optional().describe('Whether the form is published.'),
  showLinkToRespondAgain: z.boolean().optional().describe('Whether respondents see a link to submit another response.'),
  requireLogin: z.boolean().optional().describe('Whether respondents must log in before responding.'),
  progressBar: z.boolean().optional().describe('Whether the form shows a progress bar.'),
  quiz: z.boolean().optional().describe('Whether the form is a quiz.'),
}

export const formsSetAcceptingResponsesSchema = {
  formId: formsIdSchema,
  acceptingResponses: z.boolean().describe('Whether the form accepts responses.'),
  customClosedFormMessage: formsLongTextSchema.optional().describe('Message shown when the form is closed.'),
}

export const formsSetResponseDestinationSchema = {
  formId: formsIdSchema,
  spreadsheetId: formsSpreadsheetIdSchema,
}

export const formsRemoveResponseDestinationSchema = {
  formId: formsIdSchema,
  ...confirmationSchema,
}

export const formsListItemsSchema = {
  formId: formsIdSchema,
}

export const formsAddItemSchema = {
  formId: formsIdSchema,
  itemType: formsItemTypeSchema,
  index: z.number().int().min(0).optional().describe('Zero-based insertion index. Omit to append.'),
  ...formsCommonItemFields,
  idempotencyKey: idempotencyKeySchema,
}

export const formsUpdateItemSchema = {
  formId: formsIdSchema,
  itemId: formsItemIdSchema,
  ...formsCommonItemFields,
}

export const formsMoveItemSchema = {
  formId: formsIdSchema,
  itemId: formsItemIdSchema,
  index: z.number().int().min(0).describe('New zero-based item index.'),
}

export const formsDeleteItemSchema = {
  formId: formsIdSchema,
  itemId: formsItemIdSchema,
  ...confirmationSchema,
}

export const formsListResponsesSchema = {
  formId: formsIdSchema,
  maxResults: z.number().int().min(1).max(100).default(20).describe('Maximum responses to return.'),
  page: z.number().int().min(0).default(0).describe('Zero-based response page.'),
  includeAnswers: z.boolean().optional().describe('Include answer values in each listed response.'),
}

export const formsGetResponseSchema = {
  formId: formsIdSchema,
  responseId: formsResponseIdSchema,
}

export const formsDeleteResponseSchema = {
  formId: formsIdSchema,
  responseId: formsResponseIdSchema,
  ...confirmationSchema,
}

export const formsDeleteAllResponsesSchema = {
  formId: formsIdSchema,
  ...confirmationSchema,
}

export const formsBatchSchema = {
  operations: z.array(z.discriminatedUnion('action', [
    batchOperationSchema('formCreate', formsCreateFormSchema),
    batchOperationSchema('formGet', formsGetFormSchema),
    batchOperationSchema('formUpdate', formsUpdateFormSchema),
    batchOperationSchema('formSetAcceptingResponses', formsSetAcceptingResponsesSchema),
    batchOperationSchema('formSetDestination', formsSetResponseDestinationSchema),
    batchOperationSchema('formRemoveDestination', formsRemoveResponseDestinationSchema),
    batchOperationSchema('itemsList', formsListItemsSchema),
    batchOperationSchema('itemAdd', formsAddItemSchema),
    batchOperationSchema('itemUpdate', formsUpdateItemSchema),
    batchOperationSchema('itemMove', formsMoveItemSchema),
    batchOperationSchema('itemDelete', formsDeleteItemSchema),
    batchOperationSchema('responsesList', formsListResponsesSchema),
    batchOperationSchema('responseGet', formsGetResponseSchema),
    batchOperationSchema('responseDelete', formsDeleteResponseSchema),
    batchOperationSchema('responsesDeleteAll', formsDeleteAllResponsesSchema),
  ])).min(1).max(20).describe('Ordered list of validated Google Forms operations.'),
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
  before: gmailSearchDateSchema.optional().describe('Before date (YYYY/MM/DD).'),
  after: gmailSearchDateSchema.optional().describe('After date (YYYY/MM/DD).'),
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
export const gmailSendDraftSchema = { draftId: gmailDraftIdSchema, idempotencyKey: idempotencyKeySchema, ...confirmationSchema }

export const gmailSendSchema = {
  to: gmailEmailSchema.describe('Recipient email.'),
  subject: gmailSubjectSchema.describe('Email subject.'),
  body: gmailBodySchema.describe('Plain text body.'),
  cc: emailListSchema.optional().describe('CC recipient(s).'),
  bcc: emailListSchema.optional().describe('BCC recipient(s).'),
  htmlBody: z.string().max(200000).optional().describe('HTML body.'),
  idempotencyKey: idempotencyKeySchema,
  ...confirmationSchema,
}

export const gmailCreateDraftSchema = gmailSendSchema

export const gmailUpdateDraftSchema = {
  draftId: gmailDraftIdSchema,
  to: z.string().max(320).optional(),
  subject: z.string().max(1000).optional(),
  body: z.string().max(100000).optional(),
  cc: emailListSchema.optional(),
  bcc: emailListSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
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
  idempotencyKey: idempotencyKeySchema,
  ...confirmationSchema,
}

export const gmailReplyAllSchema = gmailReplySchema

export const gmailForwardSchema = {
  messageId: gmailMessageIdSchema,
  to: gmailEmailSchema.describe('Recipient email.'),
  htmlBody: z.string().max(200000).optional(),
  idempotencyKey: idempotencyKeySchema,
  ...confirmationSchema,
}

export const gmailAttachmentGetSchema = {
  messageId: gmailMessageIdSchema,
  attachmentId: z.string().min(1).describe('Attachment ID from the message.'),
}

export const gmailBatchModifySchema = {
  messageIds: z.array(z.string().min(1)).min(1).max(500).describe('Array of message IDs to modify.'),
  addLabels: z.array(z.string()).optional().describe('Label names or IDs to add.'),
  removeLabels: z.array(z.string()).optional().describe('Label names or IDs to remove.'),
}

export const gmailFilterIdSchema = z.string().min(1).max(256).describe('Gmail filter ID.')
export const gmailFilterLabelSchema = z.array(z.string().min(1).max(225)).max(50)
export const gmailVacationTimeSchema = z.union([
  z.string().min(1).max(64),
  z.number().int().nonnegative(),
]).describe('Vacation responder time as epoch milliseconds or an ISO datetime string.')

export const gmailGetFilterSchema = { filterId: gmailFilterIdSchema }

export const gmailCreateFilterSchema = {
  from: z.string().max(320).optional().describe('Filter sender criteria. Supports display name, local part, or email address.'),
  to: z.string().max(320).optional().describe('Filter recipient criteria. Includes to, cc, and bcc headers.'),
  subject: z.string().max(500).optional().describe('Case-insensitive subject phrase.'),
  query: z.string().max(1500).optional().describe('Gmail search query criteria.'),
  negatedQuery: z.string().max(1500).optional().describe('Gmail search query that must not match.'),
  hasAttachment: z.boolean().optional().describe('Whether matching messages must have attachments.'),
  excludeChats: z.boolean().optional().describe('Whether matching excludes chats.'),
  size: z.number().int().nonnegative().optional().describe('RFC822 message size in bytes.'),
  sizeComparison: z.enum(['smaller', 'larger']).optional().describe('Whether message size must be smaller or larger than size.'),
  addLabels: gmailFilterLabelSchema.optional().describe('Gmail label names or IDs to add when a message matches.'),
  removeLabels: gmailFilterLabelSchema.optional().describe('Gmail label names or IDs to remove when a message matches.'),
  forward: gmailEmailSchema.optional().describe('Verified forwarding address to receive matching messages. Requires confirm=true.'),
  idempotencyKey: idempotencyKeySchema,
  ...confirmationSchema,
}

export const gmailDeleteFilterSchema = { filterId: gmailFilterIdSchema, ...confirmationSchema }

export const gmailUpdateVacationResponderSchema = {
  enableAutoReply: z.boolean().optional().describe('Whether Gmail automatically replies to messages.'),
  responseSubject: z.string().max(1000).optional().describe('Optional text prepended to vacation response subjects.'),
  responseBodyPlainText: z.string().max(100000).optional().describe('Plain text vacation response body.'),
  responseBodyHtml: z.string().max(200000).optional().describe('HTML vacation response body. Gmail sanitizes this before storing.'),
  restrictToContacts: z.boolean().optional().describe('Only send responses to contacts.'),
  restrictToDomain: z.boolean().optional().describe('Only send responses inside the account domain, when supported.'),
  startTime: gmailVacationTimeSchema.optional(),
  endTime: gmailVacationTimeSchema.optional(),
  clearStartTime: z.boolean().optional().describe('Clear the stored vacation responder start time.'),
  clearEndTime: z.boolean().optional().describe('Clear the stored vacation responder end time.'),
  ...confirmationSchema,
}

export const gmailBatchSchema = {
  operations: z.array(z.discriminatedUnion('action', [
    batchOperationSchema('profile'),
    batchOperationSchema('searchMessages', gmailSearchMessagesSchema),
    batchOperationSchema('listThreads', gmailListThreadsSchema),
    batchOperationSchema('getMessage', gmailGetMessageSchema),
    batchOperationSchema('getThread', gmailGetThreadSchema),
    batchOperationSchema('listLabels'),
    batchOperationSchema('send', gmailSendSchema),
    batchOperationSchema('createDraft', gmailCreateDraftSchema),
    batchOperationSchema('createDraftReply', gmailReplySchema),
    batchOperationSchema('createDraftReplyAll', gmailReplyAllSchema),
    batchOperationSchema('listDrafts', gmailListDraftsSchema),
    batchOperationSchema('getDraft', gmailGetDraftSchema),
    batchOperationSchema('updateDraft', gmailUpdateDraftSchema),
    batchOperationSchema('deleteDraft', gmailDeleteDraftSchema),
    batchOperationSchema('sendDraft', gmailSendDraftSchema),
    batchOperationSchema('markRead', gmailMarkReadSchema),
    batchOperationSchema('markUnread', gmailMarkUnreadSchema),
    batchOperationSchema('archive', gmailArchiveSchema),
    batchOperationSchema('star', gmailStarSchema),
    batchOperationSchema('unstar', gmailUnstarSchema),
    batchOperationSchema('addLabel', gmailLabelSchema),
    batchOperationSchema('removeLabel', gmailLabelSchema),
    batchOperationSchema('trashMessage', gmailTrashMessageSchema),
    batchOperationSchema('untrashMessage', gmailUntrashMessageSchema),
    batchOperationSchema('deleteMessage', gmailDeleteMessageSchema),
    batchOperationSchema('trashThread', gmailTrashThreadSchema),
    batchOperationSchema('untrashThread', gmailUntrashThreadSchema),
    batchOperationSchema('reply', gmailReplySchema),
    batchOperationSchema('replyAll', gmailReplyAllSchema),
    batchOperationSchema('forward', gmailForwardSchema),
    batchOperationSchema('attachmentGet', gmailAttachmentGetSchema),
    batchOperationSchema('batchModify', gmailBatchModifySchema),
    batchOperationSchema('filtersList'),
    batchOperationSchema('filtersGet', gmailGetFilterSchema),
    batchOperationSchema('filtersCreate', gmailCreateFilterSchema),
    batchOperationSchema('filtersDelete', gmailDeleteFilterSchema),
    batchOperationSchema('vacationGet'),
    batchOperationSchema('vacationUpdate', gmailUpdateVacationResponderSchema),
  ])).min(1).max(20).describe('Ordered list of validated Gmail operations.'),
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
  range: a1RangeSchema.optional().describe('Range in A1 notation (e.g. "A1:C10"). Defaults to all data.'),
}

export const sheetsRangeWriteSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: a1RangeSchema.describe('Starting cell or range in A1 notation (e.g. "A1" or "A1:C3").'),
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
  range: a1RangeSchema.optional().describe('Range in A1 notation. Defaults to all data.'),
  ...confirmationSchema,
}

export const sheetsGetFormulasSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: a1RangeSchema.optional().describe('Range in A1 notation. Defaults to all data.'),
}

export const sheetsGetNotesSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: a1RangeSchema.optional().describe('Range in A1 notation. Defaults to all data.'),
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
  range: a1RangeSchema.describe('Range in A1 notation (e.g. "A1:C10").'),
  background: cssColorSchema.optional().describe('Background color (CSS: "#FFFF00" or "yellow").'),
  fontColor: cssColorSchema.optional().describe('Font color (CSS).'),
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
  borderColor: cssColorSchema.optional().describe('Border color (CSS, default: black).'),
}

export const sheetsMergeCellsSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: a1RangeSchema.describe('Range in A1 notation (e.g. "A1:C1").'),
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
  range: a1RangeSchema.describe('Range in A1 notation (e.g. "A2:C50").'),
  sortColumn: z.number().int().min(1).describe('Column number within the range to sort by (1-based, relative to range start).'),
  ascending: z.boolean().default(true).describe('Sort ascending if true, descending if false.'),
}

export const sheetsSetFormulaSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: a1RangeSchema.describe('Cell or range in A1 notation (e.g. "D1" or "D1:D10").'),
  formula: formulaSchema.describe('Formula string (e.g. "=SUM(A1:A10)").'),
}

export const sheetsCreateChartSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: a1RangeSchema.describe('Data range in A1 notation (e.g. "A1:B10"). First row used as headers.'),
  chartType: z.enum(['AREA', 'BAR', 'COLUMN', 'COMBO', 'HISTOGRAM', 'LINE', 'PIE', 'SCATTER', 'TABLE', 'TIMELINE', 'WATERFALL']).describe('Chart type.'),
  title: z.string().optional().describe('Chart title.'),
  xAxisTitle: z.string().optional().describe('X-axis title.'),
  yAxisTitle: z.string().optional().describe('Y-axis title.'),
  position: a1RangeSchema.default('A1').optional().describe('Anchor cell for chart position (e.g. "D1").'),
  width: z.number().int().min(100).max(1200).default(600).optional().describe('Chart width in pixels.'),
  height: z.number().int().min(100).max(1200).default(400).optional().describe('Chart height in pixels.'),
  legendPosition: z.enum(['BOTTOM', 'TOP', 'LEFT', 'RIGHT', 'NONE', 'LABELED']).default('RIGHT').optional().describe('Legend position.'),
  stacked: z.boolean().optional().describe('Use stacked chart (BAR, COLUMN, AREA only).'),
}

export const sheetsSetNoteSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  range: a1RangeSchema.describe('Cell or range in A1 notation.'),
  note: z.string().describe('Note text. Use empty string to clear notes.'),
}

export const sheetsConditionalFormatSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
}

export const sheetsDataValidationSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  range: a1RangeSchema.describe('Range in A1 notation to apply validation to.'),
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
  ranges: z.array(z.string()).min(1).max(10).describe('Array of range strings in A1 notation (e.g. ["Sheet1!A1:B10", "Sheet2!C1:D20"]).'),
}

export const sheetsInsertRowsSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  startPosition: z.number().int().min(1).describe('Row index to insert before (1-based).'),
  howMany: z.number().int().min(1).max(5000).default(1).describe('Number of rows to insert.'),
}

export const sheetsDeleteRowsSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID.'),
  sheetName: z.string().optional().describe('Sheet/tab name. Defaults to first sheet.'),
  startPosition: z.number().int().min(1).describe('Row index to start deleting from (1-based).'),
  howMany: z.number().int().min(1).max(5000).default(1).describe('Number of rows to delete.'),
  ...confirmationSchema,
}

const withoutSpreadsheetId = (schema: ToolSchema) => omitSchemaKeys(schema, ['spreadsheetId'])

export const sheetsBatchSchema = {
  spreadsheetId: sheetsSpreadsheetIdSchema.describe('Spreadsheet ID shared by all operations.'),
  operations: z.array(z.discriminatedUnion('action', [
    batchOperationSchema('spreadsheetGet', withoutSpreadsheetId(sheetsSpreadsheetGetSchema)),
    batchOperationSchema('sheetAdd', withoutSpreadsheetId(sheetsAddSheetSchema)),
    batchOperationSchema('sheetDelete', withoutSpreadsheetId(sheetsDeleteSheetSchema)),
    batchOperationSchema('sheetRename', withoutSpreadsheetId(sheetsRenameSheetSchema)),
    batchOperationSchema('sheetCopy', withoutSpreadsheetId(sheetsCopySheetSchema)),
    batchOperationSchema('rangeRead', withoutSpreadsheetId(sheetsRangeReadSchema)),
    batchOperationSchema('rangeWrite', withoutSpreadsheetId(sheetsRangeWriteSchema)),
    batchOperationSchema('rowsAppend', withoutSpreadsheetId(sheetsAppendRowsSchema)),
    batchOperationSchema('rangeClear', withoutSpreadsheetId(sheetsClearRangeSchema)),
    batchOperationSchema('rangeGetFormulas', withoutSpreadsheetId(sheetsGetFormulasSchema)),
    batchOperationSchema('rangeGetNotes', withoutSpreadsheetId(sheetsGetNotesSchema)),
    batchOperationSchema('valuesBatchGet', withoutSpreadsheetId(sheetsBatchGetSchema)),
    batchOperationSchema('rangeFormat', withoutSpreadsheetId(sheetsFormatRangeSchema)),
    batchOperationSchema('rangeMerge', withoutSpreadsheetId(sheetsMergeCellsSchema)),
    batchOperationSchema('rangeUnmerge', withoutSpreadsheetId(sheetsMergeCellsSchema)),
    batchOperationSchema('columnWidth', withoutSpreadsheetId(sheetsSetColumnWidthSchema)),
    batchOperationSchema('freezeRows', withoutSpreadsheetId(sheetsFreezeRowsSchema)),
    batchOperationSchema('rangeSort', withoutSpreadsheetId(sheetsSortRangeSchema)),
    batchOperationSchema('formulaSet', withoutSpreadsheetId(sheetsSetFormulaSchema)),
    batchOperationSchema('chartCreate', withoutSpreadsheetId(sheetsCreateChartSchema)),
    batchOperationSchema('noteSet', withoutSpreadsheetId(sheetsSetNoteSchema)),
    batchOperationSchema('conditionalFormatGet', withoutSpreadsheetId(sheetsConditionalFormatSchema)),
    batchOperationSchema('dataValidationSet', withoutSpreadsheetId(sheetsDataValidationSchema)),
    batchOperationSchema('rowsInsert', withoutSpreadsheetId(sheetsInsertRowsSchema)),
    batchOperationSchema('rowsDelete', withoutSpreadsheetId(sheetsDeleteRowsSchema)),
  ])).min(1).max(20).describe('Ordered list of validated Sheets operations. spreadsheetCreate is excluded because batches target one existing spreadsheet.'),
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
  imageUrl: httpsUrlSchema.describe('Public HTTPS URL of the image to insert.'),
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
  foregroundColor: cssColorSchema.optional().describe('Text color (CSS).'),
  backgroundColor: cssColorSchema.optional().describe('Background color (CSS).'),
  linkUrl: z.string().optional().describe('Set hyperlink URL.'),
}

export const slidesBackgroundSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID.'),
  slideIndex: z.number().int().min(0).describe('Slide index (0-based).'),
  color: cssColorSchema.describe('Hex or named color string (e.g. "#FF0000").'),
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

const withoutPresentationId = (schema: ToolSchema) => omitSchemaKeys(schema, ['presentationId'])

export const slidesBatchSchema = {
  presentationId: slidesPresentationIdSchema.describe('Presentation ID shared by all operations.'),
  operations: z.array(z.discriminatedUnion('action', [
    batchOperationSchema('presentationGet', withoutPresentationId(slidesPresentationGetSchema)),
    batchOperationSchema('slideAdd', withoutPresentationId(slidesAddSlideSchema)),
    batchOperationSchema('slideDelete', withoutPresentationId(slidesSlideIndexSchema)),
    batchOperationSchema('slideDuplicate', withoutPresentationId(slidesSlideIndexSchema)),
    batchOperationSchema('slideMove', withoutPresentationId(slidesMoveSlideSchema)),
    batchOperationSchema('textBoxInsert', withoutPresentationId(slidesInsertTextBoxSchema)),
    batchOperationSchema('imageInsert', withoutPresentationId(slidesInsertImageSchema)),
    batchOperationSchema('shapeInsert', withoutPresentationId(slidesInsertShapeSchema)),
    batchOperationSchema('tableInsert', withoutPresentationId(slidesInsertTableSchema)),
    batchOperationSchema('slideElementsList', withoutPresentationId(slidesSlideIndexSchema)),
    batchOperationSchema('elementDelete', withoutPresentationId(slidesDeleteElementSchema)),
    batchOperationSchema('elementGetText', withoutPresentationId(slidesGetElementTextSchema)),
    batchOperationSchema('elementFormatText', withoutPresentationId(slidesFormatTextSchema)),
    batchOperationSchema('slideNotes', withoutPresentationId(slidesSlideNotesSchema)),
    batchOperationSchema('textReplaceAll', withoutPresentationId(slidesReplaceAllTextSchema)),
    batchOperationSchema('slideBackground', withoutPresentationId(slidesBackgroundSchema)),
    batchOperationSchema('lineInsert', withoutPresentationId(slidesInsertLineSchema)),
  ])).min(1).max(20).describe('Ordered list of validated Slides operations. presentationCreate is excluded because batches target one existing presentation.'),
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
  imageUrl: httpsUrlSchema.describe('Public HTTPS URL of the image to insert.'),
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
  foregroundColor: cssColorSchema.optional().describe('Text color (CSS, e.g. "#FF0000").'),
  backgroundColor: cssColorSchema.optional().describe('Background color (CSS).'),
  linkUrl: z.string().optional().describe('Set hyperlink URL.'),
}

export const docsGetAsJsonSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID.'),
}

const withoutDocumentId = (schema: ToolSchema) => omitSchemaKeys(schema, ['documentId'])

export const docsBatchSchema = {
  documentId: docsDocumentIdSchema.describe('Document ID shared by all operations.'),
  operations: z.array(z.discriminatedUnion('action', [
    batchOperationSchema('documentGet', withoutDocumentId(docsDocumentGetSchema)),
    batchOperationSchema('documentGetJson', withoutDocumentId(docsGetAsJsonSchema)),
    batchOperationSchema('paragraphInsert', withoutDocumentId(docsInsertParagraphSchema)),
    batchOperationSchema('paragraphUpdate', withoutDocumentId(docsUpdateParagraphSchema)),
    batchOperationSchema('paragraphDelete', withoutDocumentId(docsDeleteParagraphSchema)),
    batchOperationSchema('setText', withoutDocumentId(docsSetTextSchema)),
    batchOperationSchema('replaceText', withoutDocumentId(docsReplaceTextSchema)),
    batchOperationSchema('listInsert', withoutDocumentId(docsInsertListSchema)),
    batchOperationSchema('tableInsert', withoutDocumentId(docsInsertTableSchema)),
    batchOperationSchema('imageInsert', withoutDocumentId(docsInsertImageSchema)),
    batchOperationSchema('pageBreakInsert', withoutDocumentId(docsInsertPageBreakSchema)),
    batchOperationSchema('horizontalRuleInsert', withoutDocumentId(docsInsertHorizontalRuleSchema)),
    batchOperationSchema('formatText', withoutDocumentId(docsFormatTextSchema)),
    batchOperationSchema('headerSet', withoutDocumentId(docsHeaderFooterSchema)),
    batchOperationSchema('footerSet', withoutDocumentId(docsHeaderFooterSchema)),
  ])).min(1).max(20).describe('Ordered list of validated Docs operations. documentCreate is excluded because batches target one existing document.'),
}
