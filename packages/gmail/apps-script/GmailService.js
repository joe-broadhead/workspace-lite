var GmailService = (function() {
  function handle(action, params) {
    switch (action) {
      // READ
      case 'profile':              return profile()
      case 'searchMessages':       return searchMessages(params)
      case 'getMessage':           return getMessage(params)
      case 'listThreads':          return listThreads(params)
      case 'getThread':            return getThread(params)
      case 'listLabels':           return listLabels()

      // WRITE
      case 'send':                 return send(params)
      case 'markRead':             return markRead(params)
      case 'markUnread':           return markUnread(params)
      case 'archive':              return archive(params)
      case 'star':                 return star(params)
      case 'unstar':               return unstar(params)
      case 'addLabel':             return addLabel(params)
      case 'removeLabel':          return removeLabel(params)

      // DRAFTS
      case 'listDrafts':           return listDrafts(params)
      case 'getDraft':             return getDraft(params)
      case 'createDraft':          return createDraft(params)
      case 'updateDraft':          return updateDraft(params)
      case 'deleteDraft':          return deleteDraft(params)
      case 'sendDraft':            return sendDraft(params)

      // REPLY & FORWARD
      case 'reply':                return reply(params)
      case 'replyAll':             return replyAll(params)
      case 'forward':              return forwardMsg(params)
      case 'createDraftReply':     return createDraftReply(params)
      case 'createDraftReplyAll':  return createDraftReplyAll(params)

      // DESTRUCTIVE
      case 'trashMessage':         return trashMessage(params)
      case 'untrashMessage':       return untrashMessage(params)
      case 'trashThread':          return trashThread(params)
      case 'untrashThread':        return untrashThread(params)
      case 'deleteMessage':        return deleteMessage(params)

      default: return err('UNKNOWN_ACTION', 'Unknown action: ' + action)
    }
  }

  function requireParam(params, name) {
    const val = params[name]
    if (typeof val !== 'string' || !val.trim()) {
      throw new Error('Missing required parameter: ' + name)
    }
    return val.trim()
  }

  function optionalString(params, name, def) {
    return typeof params[name] === 'string' ? (params[name]).trim() || def : def
  }

  function optionalNumber(params, name, def) {
    const val = params[name]
    if (typeof val === 'number' && !isNaN(val)) return val
    if (typeof val === 'string' && !isNaN(Number(val))) return Number(val)
    return def
  }

  function toString(val) {
    if (!val) return null
    if (typeof val === 'string') return val
    if (val.toISOString) return val.toISOString()
    return String(val)
  }

  function messageToJSON(msg) {
    return {
      id: msg.getId(),
      threadId: msg.getThread().getId(),
      subject: msg.getSubject(),
      from: msg.getFrom(),
      to: msg.getTo(),
      cc: msg.getCc(),
      date: toString(msg.getDate()),
      isUnread: msg.isUnread(),
      isStarred: msg.isStarred(),
      isDraft: msg.isDraft(),
      isInInbox: msg.isInInbox(),
      isInTrash: msg.isInTrash(),
      snippet: msg.getPlainBody().substring(0, 200)
    }
  }

  function messageToFullJSON(msg) {
    return {
      id: msg.getId(),
      threadId: msg.getThread().getId(),
      subject: msg.getSubject(),
      from: msg.getFrom(),
      to: msg.getTo(),
      cc: msg.getCc(),
      bcc: msg.getBcc(),
      date: toString(msg.getDate()),
      isUnread: msg.isUnread(),
      isStarred: msg.isStarred(),
      isDraft: msg.isDraft(),
      isInInbox: msg.isInInbox(),
      isInTrash: msg.isInTrash(),
      body: msg.getPlainBody(),
      htmlBody: msg.getBody(),
      attachments: getAttachments(msg)
    }
  }

  function threadToJSON(thread) {
    return {
      id: thread.getId(),
      firstMessageSubject: thread.getFirstMessageSubject(),
      messageCount: thread.getMessageCount(),
      lastUpdated: toString(thread.getLastMessageDate()),
      labels: getThreadLabels(thread),
      hasStarredMessages: thread.hasStarredMessages(),
      isUnread: thread.isUnread(),
      isInInbox: thread.isInInbox(),
      isInTrash: thread.isInTrash()
    }
  }

  function getThreadLabels(thread) {
    try {
      return thread.getLabels().map(function(l) { return l.getName() })
    } catch(e) {
      return []
    }
  }

  function getAttachments(msg) {
    try {
      return msg.getAttachments().map(function(att) {
        return { name: att.getName(), size: att.getSize(), mimeType: att.getContentType ? att.getContentType() : 'unknown' }
      })
    } catch(e) {
      return []
    }
  }

  function simpleMessageJSON(msg) {
    return {
      id: msg.getId(),
      threadId: msg.getThread().getId(),
      subject: msg.getSubject(),
      from: msg.getFrom(),
      date: toString(msg.getDate()),
      isUnread: msg.isUnread(),
      snippet: msg.getPlainBody().substring(0, 100)
    }
  }

  function draftToJSON(draft) {
    const msg = draft.getMessage()
    return {
      id: draft.getId(),
      message: {
        subject: msg.getSubject(),
        to: msg.getTo(),
        cc: msg.getCc(),
        body: msg.getPlainBody(),
        htmlBody: msg.getBody()
      },
      updated: toString(draft.getLastUpdated ? draft.getLastUpdated() : msg.getDate())
    }
  }

  function q(val) { return val ? (val.indexOf(' ') >= 0 ? '"' + val.replace(/"/g, '\\"') + '"' : val) : '' }

  function buildSearchQuery(params) {
    var query = params.query || ''
    var isUnread = optionalString(params, 'isUnread')
    var isStarred = optionalString(params, 'isStarred')
    var from = optionalString(params, 'from')
    var to = optionalString(params, 'to')
    var subject = optionalString(params, 'subject')
    var before = optionalString(params, 'before')
    var after = optionalString(params, 'after')
    var label = optionalString(params, 'label')

    if (isUnread === 'true') query += ' is:unread'
    if (isStarred === 'true') query += ' is:starred'
    if (from) query += ' from:' + q(from)
    if (to) query += ' to:' + q(to)
    if (subject) query += ' subject:' + q(subject)
    if (before) query += ' before:' + q(before)
    if (after) query += ' after:' + q(after)
    if (label) query += ' label:' + q(label)

    return query.trim() || 'in:inbox'
  }

  // ─── READ ───

  function profile() {
    return ok({
      email: Session.getActiveUser().getEmail()
    })
  }

  function searchMessages(params) {
    const query = buildSearchQuery(params)
    const maxResults = optionalNumber(params, 'maxResults', 20)
    const page = optionalNumber(params, 'page', 0)

    var allThreads
    try {
      allThreads = GmailApp.search(query)
    } catch(e) {
      return err('SEARCH_FAILED', e.message || 'Search query failed')
    }

    const results = []
    var msgIdx = 0
    var start = page * maxResults
    var end = start + maxResults

    for (var t = 0; t < allThreads.length && msgIdx < end; t++) {
      var msgs = allThreads[t].getMessages()
      for (var m = 0; m < msgs.length && msgIdx < end; m++) {
        if (msgIdx >= start) {
          results.push(simpleMessageJSON(msgs[m]))
        }
        msgIdx++
      }
    }

    return ok(results, { nextPageToken: String(page + 1), hasMore: msgIdx > end, totalSearched: msgIdx })
  }

  function getMessage(params) {
    const id = requireParam(params, 'messageId')
    try {
      const msg = GmailApp.getMessageById(id)
      return ok({ message: messageToFullJSON(msg) })
    } catch(e) {
      return err('NOT_FOUND', 'Message not found: ' + id)
    }
  }

  function listThreads(params) {
    const query = buildSearchQuery(params)
    const maxResults = optionalNumber(params, 'maxResults', 20)
    const page = optionalNumber(params, 'page', 0)

    var allThreads
    try {
      allThreads = GmailApp.search(query)
    } catch(e) {
      return err('SEARCH_FAILED', e.message || 'Search query failed')
    }

    var results = []
    var start = page * maxResults
    var end = Math.min(start + maxResults, allThreads.length)
    for (var i = start; i < end; i++) {
      results.push(threadToJSON(allThreads[i]))
    }

    return ok(results, { nextPageToken: String(page + 1), hasMore: end < allThreads.length })
  }

  function getThread(params) {
    const id = requireParam(params, 'threadId')
    try {
      const thread = GmailApp.getThreadById(id)
      var messages = []
      var msgs = thread.getMessages()
      for (var i = 0; i < msgs.length; i++) {
        messages.push(messageToFullJSON(msgs[i]))
      }
      var result = threadToJSON(thread)
      result.messages = messages
      return ok({ thread: result })
    } catch(e) {
      return err('NOT_FOUND', 'Thread not found: ' + id)
    }
  }

  function listLabels() {
    var labels = GmailApp.getUserLabels()
    var results = []
    for (var i = 0; i < labels.length; i++) {
      results.push({
        name: labels[i].getName(),
        unreadCount: labels[i].getUnreadCount(),
        messageCount: labels[i].getMessageCount ? null : null
      })
    }
    return ok(results)
  }

  // ─── WRITE ───

  function send(params) {
    const to = requireParam(params, 'to')
    const subject = requireParam(params, 'subject')
    const body = requireParam(params, 'body')
    const cc = optionalString(params, 'cc')
    const bcc = optionalString(params, 'bcc')
    const htmlBody = optionalString(params, 'htmlBody')

    var options = {}
    if (cc) options.cc = cc
    if (bcc) options.bcc = bcc
    if (htmlBody) options.htmlBody = htmlBody

    GmailApp.sendEmail(to, subject, body, options)
    return ok({ sent: true, to: to, subject: subject })
  }

  function markRead(params) {
    const id = requireParam(params, 'messageId')
    try {
      GmailApp.getMessageById(id).markRead()
      return ok({ markedRead: true, messageId: id })
    } catch(e) {
      return err('NOT_FOUND', 'Message not found: ' + id)
    }
  }

  function markUnread(params) {
    const id = requireParam(params, 'messageId')
    try {
      GmailApp.getMessageById(id).markUnread()
      return ok({ markedUnread: true, messageId: id })
    } catch(e) {
      return err('NOT_FOUND', 'Message not found: ' + id)
    }
  }

  function archive(params) {
    const id = requireParam(params, 'messageId')
    try {
      GmailApp.getMessageById(id).getThread().moveToArchive()
      return ok({ archived: true, messageId: id })
    } catch(e) {
      return err('NOT_FOUND', 'Message not found: ' + id)
    }
  }

  function star(params) {
    const id = requireParam(params, 'messageId')
    try {
      GmailApp.getMessageById(id).star()
      return ok({ starred: true, messageId: id })
    } catch(e) {
      return err('NOT_FOUND', 'Message not found: ' + id)
    }
  }

  function unstar(params) {
    const id = requireParam(params, 'messageId')
    try {
      GmailApp.getMessageById(id).unstar()
      return ok({ unstarred: true, messageId: id })
    } catch(e) {
      return err('NOT_FOUND', 'Message not found: ' + id)
    }
  }

  function addLabel(params) {
    const id = requireParam(params, 'messageId')
    const labelName = requireParam(params, 'labelName')
    try {
      var thread = GmailApp.getMessageById(id).getThread()
      var label = GmailApp.getUserLabelByName(labelName)
      if (!label) label = GmailApp.createLabel(labelName)
      thread.addLabel(label)
      return ok({ labelAdded: true, messageId: id, label: labelName })
    } catch(e) {
      return err('LABEL_FAILED', 'Could not add label: ' + labelName + ' to ' + id)
    }
  }

  function removeLabel(params) {
    const id = requireParam(params, 'messageId')
    const labelName = requireParam(params, 'labelName')
    try {
      var thread = GmailApp.getMessageById(id).getThread()
      var label = GmailApp.getUserLabelByName(labelName)
      if (label) thread.removeLabel(label)
      return ok({ labelRemoved: true, messageId: id, label: labelName })
    } catch(e) {
      return err('LABEL_FAILED', 'Could not remove label from: ' + id)
    }
  }

  // ─── DRAFTS ───

  function findDraftById(id) {
    var drafts = GmailApp.getDrafts()
    if (Array.isArray(drafts)) {
      for (var i = 0; i < drafts.length; i++) {
        if (drafts[i].getId() === id) return drafts[i]
      }
    } else if (drafts && typeof drafts.next === 'function') {
      while (drafts.hasNext()) {
        var d = drafts.next()
        if (d.getId() === id) return d
      }
    }
    return null
  }

  function listDrafts(params) {
    const maxResults = optionalNumber(params, 'maxResults', 20)
    try {
      var drafts = GmailApp.getDrafts()
      var results = []
      var count = 0
      var draftArray = Array.isArray(drafts) ? drafts : []
      while (!Array.isArray(drafts) && drafts.hasNext && drafts.hasNext() && count < maxResults) {
        results.push(draftToJSON(drafts.next()))
        count++
      }
      for (var i = 0; i < draftArray.length && count < maxResults; i++) {
        results.push(draftToJSON(draftArray[i]))
        count++
      }
      return ok(results)
    } catch(e) {
      return err('LIST_FAILED', e.message || 'Could not list drafts')
    }
  }

  function getDraft(params) {
    const id = requireParam(params, 'draftId')
    try {
      var draft = findDraftById(id)
      if (!draft) return err('NOT_FOUND', 'Draft not found: ' + id)
      return ok({ draft: draftToJSON(draft) })
    } catch(e) {
      return err('NOT_FOUND', 'Draft not found: ' + id)
    }
  }

  function createDraft(params) {
    const to = requireParam(params, 'to')
    const subject = requireParam(params, 'subject')
    const body = requireParam(params, 'body')
    const cc = optionalString(params, 'cc')
    const bcc = optionalString(params, 'bcc')

    var options = {}
    if (cc) options.cc = cc
    if (bcc) options.bcc = bcc

    var draft = GmailApp.createDraft(to, subject, body, options)
    return ok({ draft: draftToJSON(draft) })
  }

  function updateDraft(params) {
    const id = requireParam(params, 'draftId')
    try {
      var draft = findDraftById(id)
      if (!draft) return err('NOT_FOUND', 'Draft not found: ' + id)

      var msg = draft.getMessage()
      var to = optionalString(params, 'to', msg.getTo())
      var subject = optionalString(params, 'subject', msg.getSubject())
      var body = optionalString(params, 'body', msg.getPlainBody())
      var cc = optionalString(params, 'cc', msg.getCc())
      var bcc = optionalString(params, 'bcc', msg.getBcc())

      var options = {}
      if (cc) options.cc = cc
      if (bcc) options.bcc = bcc

      draft.deleteDraft()
      var newDraft = GmailApp.createDraft(to, subject, body, options)
      return ok({ draft: draftToJSON(newDraft) })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not update draft: ' + id)
    }
  }

  function deleteDraft(params) {
    const id = requireParam(params, 'draftId')
    try {
      var draft = findDraftById(id)
      if (!draft) return err('NOT_FOUND', 'Draft not found: ' + id)
      draft.deleteDraft()
      return ok({ deleted: true, draftId: id })
    } catch(e) {
      return err('DELETE_FAILED', 'Could not delete draft: ' + id)
    }
  }

  function sendDraft(params) {
    const id = requireParam(params, 'draftId')
    try {
      var draft = findDraftById(id)
      if (!draft) return err('NOT_FOUND', 'Draft not found: ' + id)
      draft.send()
      return ok({ sent: true, draftId: id })
    } catch(e) {
      return err('SEND_FAILED', 'Could not send draft: ' + id)
    }
  }

  // ─── REPLY & FORWARD ───

  function reply(params) {
    var id = requireParam(params, 'messageId')
    var body = requireParam(params, 'body')
    var options = {}
    if (params.htmlBody) options.htmlBody = String(params.htmlBody)
    try {
      var msg = GmailApp.getMessageById(id)
      msg.reply(body, options)
      return ok({ replied: true, messageId: id })
    } catch(e) {
      return err('REPLY_FAILED', e.message || 'Could not reply to message: ' + id)
    }
  }

  function replyAll(params) {
    var id = requireParam(params, 'messageId')
    var body = requireParam(params, 'body')
    var options = {}
    if (params.htmlBody) options.htmlBody = String(params.htmlBody)
    try {
      var msg = GmailApp.getMessageById(id)
      msg.replyAll(body, options)
      return ok({ repliedAll: true, messageId: id })
    } catch(e) {
      return err('REPLY_FAILED', e.message || 'Could not reply all to message: ' + id)
    }
  }

  function forwardMsg(params) {
    var id = requireParam(params, 'messageId')
    var to = requireParam(params, 'to')
    var options = {}
    if (params.htmlBody) options.htmlBody = String(params.htmlBody)
    try {
      var msg = GmailApp.getMessageById(id)
      msg.forward(to, options)
      return ok({ forwarded: true, messageId: id, to: to })
    } catch(e) {
      return err('FORWARD_FAILED', e.message || 'Could not forward message: ' + id)
    }
  }

  function createDraftReply(params) {
    var id = requireParam(params, 'messageId')
    var body = requireParam(params, 'body')
    var options = {}
    if (params.htmlBody) options.htmlBody = String(params.htmlBody)
    if (params.cc) options.cc = String(params.cc)
    if (params.bcc) options.bcc = String(params.bcc)
    try {
      var msg = GmailApp.getMessageById(id)
      var draft = msg.createDraftReply(body, options)
      return ok({ draft: draftToJSON(draft) })
    } catch(e) {
      return err('DRAFT_FAILED', e.message || 'Could not create draft reply: ' + id)
    }
  }

  function createDraftReplyAll(params) {
    var id = requireParam(params, 'messageId')
    var body = requireParam(params, 'body')
    var options = {}
    if (params.htmlBody) options.htmlBody = String(params.htmlBody)
    if (params.cc) options.cc = String(params.cc)
    if (params.bcc) options.bcc = String(params.bcc)
    try {
      var msg = GmailApp.getMessageById(id)
      var draft = msg.createDraftReplyAll(body, options)
      return ok({ draft: draftToJSON(draft) })
    } catch(e) {
      return err('DRAFT_FAILED', e.message || 'Could not create draft reply all: ' + id)
    }
  }

  // ─── DESTRUCTIVE ───

  function trashMessage(params) {
    const id = requireParam(params, 'messageId')
    try {
      GmailApp.getMessageById(id).moveToTrash()
      return ok({ trashed: true, messageId: id })
    } catch(e) {
      return err('NOT_FOUND', 'Message not found: ' + id)
    }
  }

  function untrashMessage(params) {
    const id = requireParam(params, 'messageId')
    try {
      GmailApp.getMessageById(id).getThread().moveToInbox()
      return ok({ untrashed: true, messageId: id })
    } catch(e) {
      return err('NOT_FOUND', 'Message not found: ' + id)
    }
  }

  function trashThread(params) {
    const id = requireParam(params, 'threadId')
    try {
      GmailApp.getThreadById(id).moveToTrash()
      return ok({ trashed: true, threadId: id })
    } catch(e) {
      return err('NOT_FOUND', 'Thread not found: ' + id)
    }
  }

  function untrashThread(params) {
    const id = requireParam(params, 'threadId')
    try {
      GmailApp.getThreadById(id).moveToInbox()
      return ok({ untrashed: true, threadId: id })
    } catch(e) {
      return err('NOT_FOUND', 'Thread not found: ' + id)
    }
  }

  function deleteMessage(params) {
    const id = requireParam(params, 'messageId')
    try {
      GmailApp.getMessageById(id).getThread().moveToTrash()
      return ok({ deleted: true, messageId: id, note: 'Message moved to trash. Emptied after 30 days.' })
    } catch(e) {
      return err('DELETE_FAILED', 'Could not delete message: ' + id)
    }
  }

  return { handle: handle }
})()
