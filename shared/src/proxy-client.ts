import { validateProxyResponse, type ProxyResponse } from './response.js'

export interface ProxyClient {
  callProxy(action: string, params?: Record<string, unknown>): Promise<ProxyResponse>
}

type TokenClass = 'read' | 'write' | 'send' | 'share' | 'destructive' | 'admin'

const ACTION_TOKEN_CLASSES: Record<string, Record<string, TokenClass>> = {
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

function actionTokenClass(service: string, action: string, params?: Record<string, unknown>): TokenClass {
  if (action === 'batch') return batchTokenClass(service, params)
  return ACTION_TOKEN_CLASSES[service]?.[action] ?? 'read'
}

function batchTokenClass(service: string, params?: Record<string, unknown>): TokenClass {
  const operations = Array.isArray(params?.operations) ? params.operations : []
  const required = new Set<TokenClass>(['read'])
  for (const operation of operations) {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) continue
    const action = (operation as { action?: unknown }).action
    if (typeof action === 'string') required.add(actionTokenClass(service, action))
  }

  const highRisk = ['send', 'share', 'destructive'].filter((tokenClass) => required.has(tokenClass as TokenClass))
  if (highRisk.length > 1) return 'admin'
  if (required.has('destructive')) return 'destructive'
  if (required.has('share')) return 'share'
  if (required.has('send')) return 'send'
  if (required.has('write')) return 'write'
  return 'read'
}

function selectProxyToken(envPrefix: string, tokenClass: TokenClass) {
  const primaryEnvName = `${envPrefix}_PROXY_TOKEN`
  const adminEnvName = `${envPrefix}_PROXY_ADMIN_TOKEN`
  const classEnvName = `${envPrefix}_PROXY_${tokenClass.toUpperCase()}_TOKEN`
  const candidateEnvNames = tokenClass === 'admin'
    ? [adminEnvName, primaryEnvName]
    : tokenClass === 'read'
      ? [classEnvName, primaryEnvName, adminEnvName]
      : [classEnvName, adminEnvName, primaryEnvName]

  for (const envName of candidateEnvNames) {
    const token = process.env[envName]
    if (token) return { token, candidateEnvNames }
  }

  return { token: '', candidateEnvNames }
}

export function createProxyClient(service: string): ProxyClient {
  const envPrefix = `GOOGLE_WORKSPACE_${service.toUpperCase()}`
  const proxyUrl = process.env[`${envPrefix}_PROXY_URL`] ?? ''

  return {
    async callProxy(action, params) {
      if (!proxyUrl) throw new Error(`${envPrefix}_PROXY_URL not set`)
      const tokenClass = actionTokenClass(service, action, params)
      const proxyToken = selectProxyToken(envPrefix, tokenClass)
      if (!proxyToken.token) throw new Error(`${proxyToken.candidateEnvNames.join(', ')} not set`)
      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: proxyToken.token, action, params }),
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) throw new Error(`Proxy returned ${res.status} ${res.statusText}`)
      const body = await res.text()
      let json: unknown
      try {
        json = JSON.parse(body)
      } catch {
        throw new Error('Proxy returned malformed response: expected JSON')
      }
      const data = validateProxyResponse(json)
      if (!data.success) {
        const error = data.error
        if (!error) throw new Error('Proxy returned malformed response: error must be an object')
        const correlation = error.correlationId ? ` (correlationId: ${error.correlationId})` : ''
        throw new Error(`[${error.code}] ${error.message}${correlation}`)
      }
      return data
    },
  }
}
