const GmailService = (() => {
  const ACTION_POLICIES = {
    profile: { class: 'read' },
    searchMessages: { class: 'read' },
    getMessage: { class: 'read' },
    listThreads: { class: 'read' },
    getThread: { class: 'read' },
    listLabels: { class: 'read' },
    listDrafts: { class: 'read' },
    getDraft: { class: 'read' },
    attachmentGet: { class: 'read' },
    markRead: { class: 'write' },
    markUnread: { class: 'write' },
    archive: { class: 'write' },
    star: { class: 'write' },
    unstar: { class: 'write' },
    addLabel: { class: 'write' },
    removeLabel: { class: 'write' },
    batchModify: { class: 'write' },
    createDraft: { class: 'write', allowDraftToken: true, recipientParams: ['to', 'cc', 'bcc'] },
    updateDraft: { class: 'write', allowDraftToken: true, recipientParams: ['to', 'cc', 'bcc'] },
    createDraftReply: { class: 'write', allowDraftToken: true },
    createDraftReplyAll: { class: 'write', allowDraftToken: true },
    untrashMessage: { class: 'write' },
    untrashThread: { class: 'write' },
    send: { class: 'send', recipientParams: ['to', 'cc', 'bcc'], requiresKnownRecipients: true },
    sendDraft: { class: 'send', recipientParams: [], requiresKnownRecipients: true },
    reply: { class: 'send', recipientParams: [], requiresKnownRecipients: true },
    replyAll: { class: 'send', recipientParams: [], requiresKnownRecipients: true },
    forward: { class: 'send', recipientParams: ['to'], requiresKnownRecipients: true },
    trashMessage: { class: 'destructive' },
    trashThread: { class: 'destructive' },
    deleteMessage: { class: 'destructive' },
    deleteDraft: { class: 'destructive' },
    batch: { class: 'read' },
  }

  const BATCH_ACTIONS = {
    profile: true, searchMessages: true, getMessage: true, listThreads: true,
    getThread: true, listLabels: true, attachmentGet: true, send: true,
    markRead: true, markUnread: true, archive: true, star: true,
    unstar: true, addLabel: true, removeLabel: true, listDrafts: true,
    getDraft: true, createDraft: true, updateDraft: true, deleteDraft: true,
    sendDraft: true, reply: true, replyAll: true, forward: true,
    createDraftReply: true, createDraftReplyAll: true, trashMessage: true,
    untrashMessage: true, trashThread: true, untrashThread: true,
    deleteMessage: true, batchModify: true,
  }

  const LIMITS = {
    pageSize: 100,
    pageOffset: 5000,
    searchThreads: 200,
    threadMessages: 100,
    draftScan: 500,
    messageBodyChars: 100000,
    responseBytes: 1000000,
    attachmentBytes: 5000000,
    batchModifyMessages: 500,
  }

  function handle(action, params) {
    const fn = ACTIONS[action]
    if (!fn) return err('UNKNOWN_ACTION', `Unknown action: ${action}`)
    const policyError = enforceActionPolicy(action, params || {}, ACTION_POLICIES)
    if (policyError) return policyError
    return fn(params || {})
  }

  function requestWeight(action, params) {
    return requestWeightForPolicy(action, params || {}, ACTION_POLICIES)
  }

  function validateMessageId(id) {
    if (!/^[a-f0-9]+$/i.test(id)) throw new Error(`Invalid message ID: ${id}`);
  }

  function validateThreadId(id) {
    if (!/^[a-f0-9]+$/i.test(id)) throw new Error(`Invalid thread ID: ${id}`);
  }

  function requireParam(params, name) {
    const val = params[name];
    if (val === undefined || val === null) throw new Error(`Missing required parameter: ${name}`);
    if (typeof val === 'string' && !val.trim()) throw new Error(`Missing required parameter: ${name}`);
    return typeof val === 'string' ? val.trim() : val;
  }

  function optionalString(params, name, def) {
    return typeof params[name] === 'string' ? (params[name]).trim() || def : def;
  }

  function optionalNumber(params, name, def) {
    const val = params[name];
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
    return def;
  }

  function ok(data, pagination) {
    const payload = JSON.stringify(data || {});
    if (payload.length > LIMITS.responseBytes) {
      return limitExceeded('response bytes', payload.length, LIMITS.responseBytes);
    }
    return { success: true, data: data, pagination: pagination };
  }

  function err(code, message) {
    return { success: false, error: { code, message } };
  }

  function limitExceeded(name, requested, max) {
    return err('LIMIT_EXCEEDED', `${name} limit exceeded: requested ${requested}, max ${max}`);
  }

  function boundedPageSize(params, name, def) {
    const value = Math.floor(optionalNumber(params, name, def));
    if (value < 1) return { error: err('BAD_REQUEST', `${name} must be at least 1`) };
    if (value > LIMITS.pageSize) return { error: limitExceeded(name, value, LIMITS.pageSize) };
    return { value: value };
  }

  function boundedPage(params) {
    const page = Math.floor(optionalNumber(params, 'page', 0));
    if (page < 0) return { error: err('BAD_REQUEST', 'page must be non-negative') };
    return { value: page };
  }

  function truncateText(value, maxChars) {
    const text = String(value || '');
    return { text: text.substring(0, maxChars), truncated: text.length > maxChars, originalLength: text.length };
  }

  function optionalBool(params, name, def) {
    if (typeof params[name] === 'boolean') return params[name];
    if (params[name] === 'true') return true;
    if (params[name] === 'false') return false;
    return def;
  }

  function trap(fn, errorCode, errorMsg) {
    try {
      const result = fn();
      return result && result.success === false ? result : ok(result);
    }
    catch (e) { return err(errorCode, typeof errorMsg === 'function' ? errorMsg(e) : errorMsg); }
  }

  function toString(val) {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (val.toISOString) return val.toISOString();
    return String(val);
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
      snippet: msg.getPlainBody().substring(0, 200),
    };
  }

  function messageToFullJSON(msg) {
    const body = truncateText(msg.getPlainBody(), LIMITS.messageBodyChars);
    const htmlBody = truncateText(msg.getBody(), LIMITS.messageBodyChars);
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
      body: body.text,
      bodyTruncated: body.truncated,
      htmlBody: htmlBody.text,
      htmlBodyTruncated: htmlBody.truncated,
      attachments: getAttachments(msg),
    };
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
      isInTrash: thread.isInTrash(),
    };
  }

  function getThreadLabels(thread) {
    try {
      return thread.getLabels().map(function(l) { return l.getName(); });
    } catch (e) {
      return [];
    }
  }

  function getAttachments(msg) {
    try {
      return msg.getAttachments().map(function(att) { return {
        name: att.getName(),
        size: att.getSize(),
        mimeType: att.getContentType ? att.getContentType() : 'unknown',
      }; });
    } catch (e) {
      return [];
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
      snippet: msg.getPlainBody().substring(0, 100),
    };
  }

  function draftToJSON(draft) {
    const msg = draft.getMessage();
    const body = truncateText(msg.getPlainBody(), LIMITS.messageBodyChars);
    const htmlBody = truncateText(msg.getBody(), LIMITS.messageBodyChars);
    return {
      id: draft.getId(),
      message: {
        subject: msg.getSubject(),
        to: msg.getTo(),
        cc: msg.getCc(),
        body: body.text,
        bodyTruncated: body.truncated,
        htmlBody: htmlBody.text,
        htmlBodyTruncated: htmlBody.truncated,
      },
      updated: toString(draft.getLastUpdated ? draft.getLastUpdated() : msg.getDate()),
    };
  }

  function q(val) {
    return val ? (val.includes(' ') ? '"' + val.replace(/"/g, '\\"') + '"' : val) : '';
  }

  function buildSearchQuery(params) {
    let query = params.query || '';
    const isUnread = optionalString(params, 'isUnread');
    const isStarred = optionalString(params, 'isStarred');
    const from = optionalString(params, 'from');
    const to = optionalString(params, 'to');
    const subject = optionalString(params, 'subject');
    const before = optionalString(params, 'before');
    const after = optionalString(params, 'after');
    const label = optionalString(params, 'label');

    if (isUnread === 'true') query += ' is:unread';
    if (isStarred === 'true') query += ' is:starred';
    if (from) query += ' from:' + q(from);
    if (to) query += ' to:' + q(to);
    if (subject) query += ' subject:' + q(subject);
    if (before) query += ' before:' + q(before);
    if (after) query += ' after:' + q(after);
    if (label) query += ' label:' + q(label);

    return query.trim() || 'in:inbox';
  }

  function buildReplyOptions(params) {
    const options = {};
    if (params.htmlBody) options.htmlBody = String(params.htmlBody);
    if (params.cc) options.cc = String(params.cc);
    if (params.bcc) options.bcc = String(params.bcc);
    return options;
  }

  // ─── READ ───

  function profile() {
    return ok({ email: Session.getActiveUser().getEmail() });
  }

  function searchMessages(params) {
    const query = buildSearchQuery(params);
    const maxResultLimit = boundedPageSize(params, 'maxResults', 20);
    if (maxResultLimit.error) return maxResultLimit.error;
    const pageLimit = boundedPage(params);
    if (pageLimit.error) return pageLimit.error;
    const maxResults = maxResultLimit.value;
    const page = pageLimit.value;
    const threadScanLimit = LIMITS.searchThreads;
    const start = page * threadScanLimit;
    if (start > LIMITS.pageOffset) return limitExceeded('Gmail search offset', start, LIMITS.pageOffset);

    let threads;
    try {
      threads = GmailApp.search(query, start, threadScanLimit);
    } catch (e) {
      return err('SEARCH_FAILED', e.message || 'Search query failed');
    }

    const results = [];
    let messagesScanned = 0;
    for (let t = 0; t < threads.length && results.length < maxResults; t++) {
      const msgs = threads[t].getMessages();
      if (msgs.length > LIMITS.threadMessages) return limitExceeded('thread messages', msgs.length, LIMITS.threadMessages);
      for (let m = 0; m < msgs.length && results.length < maxResults; m++) {
        results.push(simpleMessageJSON(msgs[m]));
        messagesScanned++;
      }
    }

    return ok(results, {
      nextPageToken: String(page + 1),
      hasMore: threads.length === threadScanLimit,
      threadsScanned: threads.length,
      messagesScanned: messagesScanned,
    });
  }

  function getMessage(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    return trap(function() { return { message: messageToFullJSON(GmailApp.getMessageById(id)) }; }, 'NOT_FOUND', `Message not found: ${id}`);
  }

  function listThreads(params) {
    const query = buildSearchQuery(params);
    const maxResultLimit = boundedPageSize(params, 'maxResults', 20);
    if (maxResultLimit.error) return maxResultLimit.error;
    const pageLimit = boundedPage(params);
    if (pageLimit.error) return pageLimit.error;
    const maxResults = maxResultLimit.value;
    const page = pageLimit.value;
    const start = page * maxResults;
    if (start > LIMITS.pageOffset) return limitExceeded('Gmail thread offset', start, LIMITS.pageOffset);

    let threads;
    try {
      threads = GmailApp.search(query, start, maxResults);
    } catch (e) {
      return err('SEARCH_FAILED', e.message || 'Search query failed');
    }

    const results = [];
    for (let i = 0; i < threads.length; i++) {
      results.push(threadToJSON(threads[i]));
    }

    return ok(results, {
      nextPageToken: String(page + 1),
      hasMore: threads.length === maxResults,
    });
  }

  function getThread(params) {
    const id = requireParam(params, 'threadId');
    validateThreadId(id);
    try {
      const thread = GmailApp.getThreadById(id);
      const msgs = thread.getMessages();
      if (msgs.length > LIMITS.threadMessages) return limitExceeded('thread messages', msgs.length, LIMITS.threadMessages);
      const messages = [];
      for (let i = 0; i < msgs.length; i++) {
        messages.push(messageToFullJSON(msgs[i]));
      }
      const result = threadToJSON(thread);
      result.messages = messages;
      return ok({ thread: result });
    } catch (e) {
      return err('NOT_FOUND', `Thread not found: ${id}`);
    }
  }

  function listLabels() {
    const labels = GmailApp.getUserLabels();
    const results = [];
    for (let i = 0; i < labels.length; i++) {
      results.push({
        name: labels[i].getName(),
        unreadCount: labels[i].getUnreadCount(),
        messageCount: labels[i].getMessageCount(),
      });
    }
    return ok(results);
  }

  // ─── WRITE ───

  function send(params) {
    try {
      const to = requireParam(params, 'to');
      const subject = requireParam(params, 'subject');
      const body = requireParam(params, 'body');
      const cc = optionalString(params, 'cc');
      const bcc = optionalString(params, 'bcc');
      const htmlBody = optionalString(params, 'htmlBody');

      const options = {};
      if (cc) options.cc = cc;
      if (bcc) options.bcc = bcc;
      if (htmlBody) options.htmlBody = htmlBody;

      GmailApp.sendEmail(to, subject, body, options);
      return ok({ sent: true, to: to, subject: subject });
    } catch (e) {
      return err('SEND_FAILED', e.message || 'Could not send email');
    }
  }

  function markRead(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    return trap(function() { GmailApp.getMessageById(id).markRead(); return { markedRead: true, messageId: id }; }, 'NOT_FOUND', `Message not found: ${id}`);
  }

  function markUnread(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    return trap(function() { GmailApp.getMessageById(id).markUnread(); return { markedUnread: true, messageId: id }; }, 'NOT_FOUND', `Message not found: ${id}`);
  }

  function archive(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    return trap(function() { GmailApp.getMessageById(id).getThread().moveToArchive(); return { archived: true, messageId: id }; }, 'NOT_FOUND', `Message not found: ${id}`);
  }

  function star(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    return trap(function() { GmailApp.getMessageById(id).star(); return { starred: true, messageId: id }; }, 'NOT_FOUND', `Message not found: ${id}`);
  }

  function unstar(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    return trap(function() { GmailApp.getMessageById(id).unstar(); return { unstarred: true, messageId: id }; }, 'NOT_FOUND', `Message not found: ${id}`);
  }

  function addLabel(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const labelName = requireParam(params, 'labelName');
    return trap(function() {
      const thread = GmailApp.getMessageById(id).getThread();
      let label = GmailApp.getUserLabelByName(labelName);
      if (!label) label = GmailApp.createLabel(labelName);
      thread.addLabel(label);
      return { labelAdded: true, messageId: id, label: labelName };
    }, 'LABEL_FAILED', `Could not add label: ${labelName} to ${id}`);
  }

  function removeLabel(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const labelName = requireParam(params, 'labelName');
    return trap(function() {
      const thread = GmailApp.getMessageById(id).getThread();
      const label = GmailApp.getUserLabelByName(labelName);
      if (label) thread.removeLabel(label);
      return { labelRemoved: true, messageId: id, label: labelName };
    }, 'LABEL_FAILED', `Could not remove label from: ${id}`);
  }

  // ─── DRAFTS ───

  function findDraftById(id) {
    const drafts = GmailApp.getDrafts();
    if (Array.isArray(drafts)) {
      for (let i = 0; i < drafts.length; i++) {
        if (drafts[i].getId() === id) return drafts[i];
      }
    } else if (drafts && typeof drafts.next === 'function') {
      while (drafts.hasNext()) {
        const d = drafts.next();
        if (d.getId() === id) return d;
      }
    }
    return null;
  }

  function listDrafts(params) {
    const maxResultLimit = boundedPageSize(params, 'maxResults', 20);
    if (maxResultLimit.error) return maxResultLimit.error;
    const pageLimit = boundedPage(params);
    if (pageLimit.error) return pageLimit.error;
    const maxResults = maxResultLimit.value;
    const page = pageLimit.value;
    const start = page * maxResults;
    if (start > LIMITS.draftScan) return limitExceeded('draft scan offset', start, LIMITS.draftScan);
    try {
      const drafts = GmailApp.getDrafts();
      const results = [];
      let hasMore = false;

      if (Array.isArray(drafts)) {
        const end = Math.min(start + maxResults, drafts.length);
        if (end > LIMITS.draftScan) return limitExceeded('draft scan count', end, LIMITS.draftScan);
        for (let i = start; i < end; i++) {
          results.push(draftToJSON(drafts[i]));
        }
        hasMore = end < drafts.length;
      } else if (drafts && typeof drafts.next === 'function') {
        let idx = 0;
        while (drafts.hasNext()) {
          if (idx >= LIMITS.draftScan) return limitExceeded('draft scan count', idx + 1, LIMITS.draftScan);
          const draft = drafts.next();
          if (idx >= start && results.length < maxResults) {
            results.push(draftToJSON(draft));
          }
          idx++;
          if (idx >= start + maxResults) {
            hasMore = drafts.hasNext();
            break;
          }
        }
      }

      return ok(results, hasMore ? { nextPageToken: String(page + 1), hasMore } : undefined);
    } catch (e) {
      return err('LIST_FAILED', e.message || 'Could not list drafts');
    }
  }

  function getDraft(params) {
    const id = requireParam(params, 'draftId');
    return trap(function() {
      const draft = findDraftById(id);
      if (!draft) throw new Error('Not found');
      return { draft: draftToJSON(draft) };
    }, 'NOT_FOUND', `Draft not found: ${id}`);
  }

  function createDraft(params) {
    const to = requireParam(params, 'to');
    const subject = requireParam(params, 'subject');
    const body = requireParam(params, 'body');
    const options = {};
    const cc = optionalString(params, 'cc');
    const bcc = optionalString(params, 'bcc');
    if (cc) options.cc = cc;
    if (bcc) options.bcc = bcc;

    const draft = GmailApp.createDraft(to, subject, body, options);
    return ok({ draft: draftToJSON(draft) });
  }

  function updateDraft(params) {
    const id = requireParam(params, 'draftId');
    return trap(function() {
      const draft = findDraftById(id);
      if (!draft) throw new Error('Not found');

      const msg = draft.getMessage();
      const to = optionalString(params, 'to', msg.getTo());
      const subject = optionalString(params, 'subject', msg.getSubject());
      const body = optionalString(params, 'body', msg.getPlainBody());
      const cc = optionalString(params, 'cc', msg.getCc());
      const bcc = optionalString(params, 'bcc', msg.getBcc());

      const options = {};
      if (cc) options.cc = cc;
      if (bcc) options.bcc = bcc;

      draft.deleteDraft();
      const newDraft = GmailApp.createDraft(to, subject, body, options);
      return { draft: draftToJSON(newDraft) };
    }, 'UPDATE_FAILED', `Could not update draft: ${id}`);
  }

  function deleteDraft(params) {
    const id = requireParam(params, 'draftId');
    return trap(function() {
      const draft = findDraftById(id);
      if (!draft) throw new Error('Not found');
      draft.deleteDraft();
      return { deleted: true, draftId: id };
    }, 'DELETE_FAILED', `Could not delete draft: ${id}`);
  }

  function sendDraft(params) {
    const id = requireParam(params, 'draftId');
    return trap(function() {
      const draft = findDraftById(id);
      if (!draft) throw new Error('Not found');
      draft.send();
      return { sent: true, draftId: id };
    }, 'SEND_FAILED', `Could not send draft: ${id}`);
  }

  // ─── REPLY & FORWARD ───

  function reply(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const body = requireParam(params, 'body');
    const options = buildReplyOptions(params);
    return trap(function() {
      GmailApp.getMessageById(id).reply(body, options);
      return { replied: true, messageId: id };
    }, 'REPLY_FAILED', function(e) { return e.message || `Could not reply to message: ${id}`; });
  }

  function replyAll(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const body = requireParam(params, 'body');
    const options = buildReplyOptions(params);
    return trap(function() {
      GmailApp.getMessageById(id).replyAll(body, options);
      return { repliedAll: true, messageId: id };
    }, 'REPLY_FAILED', function(e) { return e.message || `Could not reply all to message: ${id}`; });
  }

  function forwardMsg(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const to = requireParam(params, 'to');
    const options = buildReplyOptions(params);
    return trap(function() {
      GmailApp.getMessageById(id).forward(to, options);
      return { forwarded: true, messageId: id, to: to };
    }, 'FORWARD_FAILED', function(e) { return e.message || `Could not forward message: ${id}`; });
  }

  function createDraftReply(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const body = requireParam(params, 'body');
    const options = buildReplyOptions(params);
    return trap(function() {
      const msg = GmailApp.getMessageById(id);
      const draft = msg.createDraftReply(body, options);
      return { draft: draftToJSON(draft) };
    }, 'DRAFT_FAILED', function(e) { return e.message || `Could not create draft reply: ${id}`; });
  }

  function createDraftReplyAll(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const body = requireParam(params, 'body');
    const options = buildReplyOptions(params);
    return trap(function() {
      const msg = GmailApp.getMessageById(id);
      const draft = msg.createDraftReplyAll(body, options);
      return { draft: draftToJSON(draft) };
    }, 'DRAFT_FAILED', function(e) { return e.message || `Could not create draft reply all: ${id}`; });
  }

  // ─── DESTRUCTIVE ───

  function trashMessage(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    return trap(function() { GmailApp.getMessageById(id).moveToTrash(); return { trashed: true, messageId: id }; }, 'NOT_FOUND', `Message not found: ${id}`);
  }

  function untrashMessage(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    return trap(function() { GmailApp.getMessageById(id).getThread().moveToInbox(); return { untrashed: true, messageId: id }; }, 'NOT_FOUND', `Message not found: ${id}`);
  }

  function trashThread(params) {
    const id = requireParam(params, 'threadId');
    validateThreadId(id);
    return trap(function() { GmailApp.getThreadById(id).moveToTrash(); return { trashed: true, threadId: id }; }, 'NOT_FOUND', `Thread not found: ${id}`);
  }

  function untrashThread(params) {
    const id = requireParam(params, 'threadId');
    validateThreadId(id);
    return trap(function() { GmailApp.getThreadById(id).moveToInbox(); return { untrashed: true, threadId: id }; }, 'NOT_FOUND', `Thread not found: ${id}`);
  }

  function deleteMessage(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    return trap(function() { GmailApp.getMessageById(id).getThread().moveToTrash(); return { deleted: true, messageId: id, note: 'Message moved to trash. Emptied after 30 days.' }; }, 'DELETE_FAILED', `Could not delete message: ${id}`);
  }

  // ─── ATTACHMENT ───

  function attachmentGet(params) {
    const messageId = requireParam(params, 'messageId');
    const attachmentId = requireParam(params, 'attachmentId');
    validateMessageId(messageId);
    try {
      const attachment = Gmail.Users.Messages.attachments.get('me', messageId, attachmentId);
      const size = attachment.size || 0;
      if (size > LIMITS.attachmentBytes) return limitExceeded('attachment bytes', size, LIMITS.attachmentBytes);
      const base64 = attachment.data || '';
      let text = null;
      try {
        text = Utilities.newBlob(Utilities.base64Decode(base64)).getDataAsString();
      } catch (_) { /* binary — return base64 */ }
      const result = {
        messageId: messageId,
        attachmentId: attachmentId,
        size: size,
        base64: text ? undefined : base64,
        text: text || undefined,
      };
      return ok(result);
    } catch (e) {
      return err('NOT_FOUND', `Attachment not found: ${attachmentId} for message ${messageId}`);
    }
  }

  // ─── BATCH MODIFY ───

  function batchModify(params) {
    const messageIds = params.messageIds;
    if (!Array.isArray(messageIds) || messageIds.length === 0)
      return err('BAD_REQUEST', 'messageIds must be a non-empty array');
    if (messageIds.length > LIMITS.batchModifyMessages) return limitExceeded('batchModify messageIds', messageIds.length, LIMITS.batchModifyMessages);
    const addLabelIds = Array.isArray(params.addLabels) ? params.addLabels : [];
    const removeLabelIds = Array.isArray(params.removeLabels) ? params.removeLabels : [];
    if (addLabelIds.length === 0 && removeLabelIds.length === 0)
      return err('BAD_REQUEST', 'At least one of addLabels or removeLabels must be provided');
    return trap(function() {
      Gmail.Users.Messages.batchModify({ ids: messageIds, addLabelIds: addLabelIds, removeLabelIds: removeLabelIds }, 'me');
      return {
        modified: messageIds.length,
        messageIds: messageIds,
        addedLabels: addLabelIds,
        removedLabels: removeLabelIds,
      };
    }, 'BATCH_MODIFY_FAILED', function(e) { return e.message || 'Batch modify failed'; });
  }

  // ─── BATCH ───

  function runBatch(params, handleFn) {
    const ops = params.operations;
    if (!Array.isArray(ops) || ops.length === 0) return err('BAD_REQUEST', 'operations must be a non-empty array');
    if (ops.length > 20) return limitExceeded('batch operations', ops.length, 20);
    const results = [];
    let operationWeight = 1;
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const invalid = validateBatchOperation_(op, i, BATCH_ACTIONS);
      if (invalid) { results.push(invalid); continue; }
      operationWeight += actionWeightForPolicy(op.action, ACTION_POLICIES);
      try {
        const result = handleFn(op.action, op.params || {});
        results.push({ index: i, action: op.action, success: result.success, data: result.success ? result.data : undefined, error: result.success ? undefined : result.error });
      } catch(ex) {
        results.push({ index: i, action: op.action, success: false, error: { code: 'INTERNAL_ERROR', message: ex.message || String(ex) }});
      }
    }
    return ok(batchResultData_(results, operationWeight));
  }

  function batch(params) {
    return runBatch(params, handle);
  }

  const ACTIONS = {
    profile, searchMessages, getMessage, listThreads, getThread,
    listLabels, attachmentGet, send, markRead, markUnread, archive,
    star, unstar, addLabel, removeLabel, listDrafts, getDraft,
    createDraft, updateDraft, deleteDraft, sendDraft, reply, replyAll,
    forward: forwardMsg, createDraftReply, createDraftReplyAll,
    trashMessage, untrashMessage, trashThread, untrashThread,
    deleteMessage, batchModify, batch,
  }

  return { handle: handle, requestWeight: requestWeight };
})();
