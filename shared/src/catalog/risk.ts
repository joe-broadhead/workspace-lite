/**
 * Client token risk resolution — sole static/dynamic SSOT for proxy token class routing.
 * Auth.gs "draft" is a capability class only; it is NOT a client TokenClass.
 */

/** Client token routing classes — matches proxy-client. Auth "draft" is NOT a routing class. */
export type TokenClass =
  | 'read'
  | 'write'
  | 'send'
  | 'share'
  | 'destructive'
  | 'admin'

/** Auth.gs capability classes include draft; used only when documenting Script Properties. */
export type AuthCapabilityClass = TokenClass | 'draft'

/**
 * Static map: only non-read actions (omitted ⇒ read), ported from former proxy-client ACTION_TOKEN_CLASSES.
 * This is the ONLY hand-maintained client risk table.
 */
export const ACTION_TOKEN_CLASSES: Record<string, Record<string, TokenClass>> = {
  calendar: {
    quickAdd: 'write',
    createCalendar: 'write',
    updateCalendar: 'write',
    createEvent: 'write',
    updateEvent: 'write',
    moveEvent: 'write',
    respondToEvent: 'write',
    createEventSeries: 'write',
    setEventColor: 'write',
    deleteCalendar: 'destructive',
    deleteEvent: 'destructive',
  },
  docs: {
    documentCreate: 'write',
    paragraphInsert: 'write',
    paragraphUpdate: 'write',
    replaceText: 'write',
    listInsert: 'write',
    tableInsert: 'write',
    imageInsert: 'write',
    pageBreakInsert: 'write',
    horizontalRuleInsert: 'write',
    formatText: 'write',
    headerSet: 'write',
    footerSet: 'write',
    pageSetupUpdate: 'write',
    bookmarkCreate: 'write',
    namedRangeCreate: 'write',
    setText: 'destructive',
    paragraphDelete: 'destructive',
    bookmarkDelete: 'destructive',
    namedRangeDelete: 'destructive',
  },
  drive: {
    folderCreate: 'write',
    fileCreate: 'write',
    fileCopy: 'write',
    fileMove: 'write',
    fileUpdateMeta: 'write',
    fileUpdateContent: 'write',
    fileAddParent: 'write',
    commentCreate: 'write',
    commentsUpdate: 'write',
    repliesCreate: 'write',
    repliesUpdate: 'write',
    revisionsUpdate: 'write',
    fileUntrash: 'write',
    fileSetSharing: 'share',
    fileAddEditor: 'share',
    fileAddViewer: 'share',
    fileRemoveEditor: 'share',
    fileRemoveViewer: 'share',
    fileRemoveParent: 'destructive',
    fileTrash: 'destructive',
    fileDelete: 'destructive',
    commentsDelete: 'destructive',
    repliesDelete: 'destructive',
  },
  gmail: {
    markRead: 'write',
    markUnread: 'write',
    archive: 'write',
    star: 'write',
    unstar: 'write',
    addLabel: 'write',
    removeLabel: 'write',
    batchModify: 'write',
    createDraft: 'write',
    updateDraft: 'write',
    createDraftReply: 'write',
    createDraftReplyAll: 'write',
    untrashMessage: 'write',
    untrashThread: 'write',
    filtersCreate: 'write',
    vacationUpdate: 'write',
    send: 'send',
    sendDraft: 'send',
    reply: 'send',
    replyAll: 'send',
    forward: 'send',
    trashMessage: 'destructive',
    trashThread: 'destructive',
    deleteMessage: 'destructive',
    deleteDraft: 'destructive',
    filtersDelete: 'destructive',
  },
  sheets: {
    spreadsheetCreate: 'write',
    sheetAdd: 'write',
    sheetRename: 'write',
    sheetCopy: 'write',
    rangeWrite: 'write',
    rowsAppend: 'write',
    rangeFormat: 'write',
    rangeMerge: 'write',
    rangeUnmerge: 'write',
    columnWidth: 'write',
    freezeRows: 'write',
    rangeSort: 'write',
    formulaSet: 'write',
    chartCreate: 'write',
    noteSet: 'write',
    dataValidationSet: 'write',
    textReplace: 'write',
    rangeProtect: 'write',
    sheetProtect: 'write',
    rowsInsert: 'write',
    sheetDelete: 'destructive',
    rangeClear: 'destructive',
    rowsDelete: 'destructive',
    protectionRemove: 'destructive',
  },
  slides: {
    presentationCreate: 'write',
    slideAdd: 'write',
    slideDuplicate: 'write',
    slideMove: 'write',
    textBoxInsert: 'write',
    imageInsert: 'write',
    shapeInsert: 'write',
    tableInsert: 'write',
    slideNotes: 'write',
    textReplaceAll: 'write',
    elementFormatText: 'write',
    elementGeometryUpdate: 'write',
    elementTransformUpdate: 'write',
    elementAltTextSet: 'write',
    elementLinkSet: 'write',
    elementReorder: 'write',
    slideBackground: 'write',
    lineInsert: 'write',
    slideDelete: 'destructive',
    elementDelete: 'destructive',
  },
  tasks: {
    tasklistsCreate: 'write',
    tasklistsUpdate: 'write',
    tasksCreate: 'write',
    tasksUpdate: 'write',
    tasksMove: 'write',
    tasklistsDelete: 'destructive',
    tasksDelete: 'destructive',
    tasksClear: 'destructive',
  },
  forms: {
    formCreate: 'write',
    formUpdate: 'write',
    formSetAcceptingResponses: 'write',
    formSetDestination: 'write',
    itemAdd: 'write',
    itemUpdate: 'write',
    itemMove: 'write',
    formRemoveDestination: 'destructive',
    itemDelete: 'destructive',
    responseDelete: 'destructive',
    responsesDeleteAll: 'destructive',
  },
}

/** Policy.gs POLICY_CONFIRMATION_CLASSES_ — send/share/destructive (not admin, not write). */
export function isConfirmClass(tokenClass: TokenClass): boolean {
  return tokenClass === 'send' || tokenClass === 'share' || tokenClass === 'destructive'
}

/** Static map lookup only (omitted actions ⇒ read). Does not apply dynamic rules or batch. */
export function staticRiskClass(service: string, action: string): TokenClass {
  return ACTION_TOKEN_CLASSES[service]?.[action] ?? 'read'
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function sendsCalendarUpdates(params?: Record<string, unknown>) {
  return params?.sendUpdates === 'all' || params?.sendUpdates === 'externalOnly'
}

function gmailVacationRequiresSend(params?: Record<string, unknown>) {
  if (!params) return false
  if (params.enableAutoReply === true || params.enableAutoReply === 'true') return true
  return [
    'responseSubject', 'responseBodyPlainText', 'responseBodyHtml',
    'restrictToContacts', 'restrictToDomain', 'startTime', 'endTime',
    'clearStartTime', 'clearEndTime',
  ].some((name) => Object.prototype.hasOwnProperty.call(params, name))
}

function dynamicActionTokenClass(service: string, action: string, params?: Record<string, unknown>): TokenClass | undefined {
  if (service === 'gmail') {
    if (action === 'filtersCreate' && nonEmptyString(params?.forward)) return 'send'
    if (action === 'vacationUpdate' && gmailVacationRequiresSend(params)) return 'send'
  }
  if (service === 'calendar') {
    if ((action === 'createEvent' || action === 'updateEvent' || action === 'moveEvent') && sendsCalendarUpdates(params)) return 'send'
  }
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Batch token class for mixed operations. Promotes to admin when multiple high-risk
 * classes (send/share/destructive) appear in the same batch. Used for token selection only —
 * confirm still walks each nested op via resolveRiskClass.
 */
export function batchRiskClass(service: string, params?: Record<string, unknown>): TokenClass {
  const operations = Array.isArray(params?.operations) ? params.operations : []
  const required = new Set<TokenClass>(['read'])
  for (const operation of operations) {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) continue
    const action = (operation as { action?: unknown }).action
    const operationParams = (operation as { params?: unknown }).params
    if (typeof action === 'string') {
      required.add(resolveRiskClass(service, action, isRecord(operationParams) ? operationParams : undefined))
    }
  }

  const highRisk = ['send', 'share', 'destructive'].filter((tokenClass) => required.has(tokenClass as TokenClass))
  if (highRisk.length > 1) return 'admin'
  if (required.has('destructive')) return 'destructive'
  if (required.has('share')) return 'share'
  if (required.has('send')) return 'send'
  if (required.has('write')) return 'write'
  return 'read'
}

/** Full client risk resolution including batch and dynamic gmail/calendar rules. */
export function resolveRiskClass(
  service: string,
  action: string,
  params?: Record<string, unknown>,
): TokenClass {
  if (action === 'batch') return batchRiskClass(service, params)
  const dynamic = dynamicActionTokenClass(service, action, params)
  if (dynamic) return dynamic
  return staticRiskClass(service, action)
}
