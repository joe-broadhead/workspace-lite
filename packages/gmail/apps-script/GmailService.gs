const GmailService = (() => {
  function handle(action, params) {
    switch (action) {
      // READ
      case 'profile':              return profile();
      case 'searchMessages':       return searchMessages(params);
      case 'getMessage':           return getMessage(params);
      case 'listThreads':          return listThreads(params);
      case 'getThread':            return getThread(params);
      case 'listLabels':           return listLabels();

      // WRITE
      case 'send':                 return send(params);
      case 'markRead':             return markRead(params);
      case 'markUnread':           return markUnread(params);
      case 'archive':              return archive(params);
      case 'star':                 return star(params);
      case 'unstar':               return unstar(params);
      case 'addLabel':             return addLabel(params);
      case 'removeLabel':          return removeLabel(params);

      // DRAFTS
      case 'listDrafts':           return listDrafts(params);
      case 'getDraft':             return getDraft(params);
      case 'createDraft':          return createDraft(params);
      case 'updateDraft':          return updateDraft(params);
      case 'deleteDraft':          return deleteDraft(params);
      case 'sendDraft':            return sendDraft(params);

      // REPLY & FORWARD
      case 'reply':                return reply(params);
      case 'replyAll':             return replyAll(params);
      case 'forward':              return forwardMsg(params);
      case 'createDraftReply':     return createDraftReply(params);
      case 'createDraftReplyAll':  return createDraftReplyAll(params);

      // DESTRUCTIVE
      case 'trashMessage':         return trashMessage(params);
      case 'untrashMessage':       return untrashMessage(params);
      case 'trashThread':          return trashThread(params);
      case 'untrashThread':        return untrashThread(params);
      case 'deleteMessage':        return deleteMessage(params);

      // BATCH
      case 'batch':                return batch(params);

      default: return err('UNKNOWN_ACTION', `Unknown action: ${action}`);
    }
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

  function ok(data) {
    return { success: true, data };
  }

  function err(code, message) {
    return { success: false, error: { code, message } };
  }

  function optionalBool(params, name, def) {
    if (typeof params[name] === 'boolean') return params[name];
    if (params[name] === 'true') return true;
    if (params[name] === 'false') return false;
    return def;
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
      return thread.getLabels().map(l => l.getName());
    } catch (e) {
      return [];
    }
  }

  function getAttachments(msg) {
    try {
      return msg.getAttachments().map(att => ({
        name: att.getName(),
        size: att.getSize(),
        mimeType: att.getContentType ? att.getContentType() : 'unknown',
      }));
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
    return {
      id: draft.getId(),
      message: {
        subject: msg.getSubject(),
        to: msg.getTo(),
        cc: msg.getCc(),
        body: msg.getPlainBody(),
        htmlBody: msg.getBody(),
      },
      updated: toString(draft.getLastUpdated ? draft.getLastUpdated() : msg.getDate()),
    };
  }

  function q(val) {
    return val ? (val.includes(' ') ? `"${val.replace(/"/g, '\\"')}"` : val) : '';
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
    if (from) query += ` from:${q(from)}`;
    if (to) query += ` to:${q(to)}`;
    if (subject) query += ` subject:${q(subject)}`;
    if (before) query += ` before:${q(before)}`;
    if (after) query += ` after:${q(after)}`;
    if (label) query += ` label:${q(label)}`;

    return query.trim() || 'in:inbox';
  }

  // ─── READ ───

  function profile() {
    return ok({ email: Session.getActiveUser().getEmail() });
  }

  function searchMessages(params) {
    const query = buildSearchQuery(params);
    const maxResults = optionalNumber(params, 'maxResults', 20);
    const page = optionalNumber(params, 'page', 0);

    let allThreads;
    try {
      allThreads = GmailApp.search(query);
    } catch (e) {
      return err('SEARCH_FAILED', e.message || 'Search query failed');
    }

    const results = [];
    const start = page * maxResults;
    const end = start + maxResults;
    let msgIdx = 0;
    let t = 0;

    for (; t < allThreads.length && msgIdx < end; t++) {
      const msgs = allThreads[t].getMessages();
      for (let m = 0; m < msgs.length && msgIdx < end; m++) {
        if (msgIdx >= start) {
          results.push(simpleMessageJSON(msgs[m]));
        }
        msgIdx++;
      }
    }

    return ok(results, {
      nextPageToken: String(page + 1),
      hasMore: t < allThreads.length,
      totalSearched: msgIdx,
    });
  }

  function getMessage(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    try {
      const msg = GmailApp.getMessageById(id);
      return ok({ message: messageToFullJSON(msg) });
    } catch (e) {
      return err('NOT_FOUND', `Message not found: ${id}`);
    }
  }

  function listThreads(params) {
    const query = buildSearchQuery(params);
    const maxResults = optionalNumber(params, 'maxResults', 20);
    const page = optionalNumber(params, 'page', 0);

    let allThreads;
    try {
      allThreads = GmailApp.search(query);
    } catch (e) {
      return err('SEARCH_FAILED', e.message || 'Search query failed');
    }

    const results = [];
    const start = page * maxResults;
    const end = Math.min(start + maxResults, allThreads.length);
    for (let i = start; i < end; i++) {
      results.push(threadToJSON(allThreads[i]));
    }

    return ok(results, {
      nextPageToken: String(page + 1),
      hasMore: end < allThreads.length,
    });
  }

  function getThread(params) {
    const id = requireParam(params, 'threadId');
    validateThreadId(id);
    try {
      const thread = GmailApp.getThreadById(id);
      const msgs = thread.getMessages();
      const messages = [];
      for (const m of msgs) {
        messages.push(messageToFullJSON(m));
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
    for (const l of labels) {
      results.push({
        name: l.getName(),
        unreadCount: l.getUnreadCount(),
        messageCount: l.getMessageCount(),
      });
    }
    return ok(results);
  }

  // ─── WRITE ───

  function send(params) {
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
    return ok({ sent: true, to, subject });
  }

  function markRead(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    try {
      GmailApp.getMessageById(id).markRead();
      return ok({ markedRead: true, messageId: id });
    } catch (e) {
      return err('NOT_FOUND', `Message not found: ${id}`);
    }
  }

  function markUnread(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    try {
      GmailApp.getMessageById(id).markUnread();
      return ok({ markedUnread: true, messageId: id });
    } catch (e) {
      return err('NOT_FOUND', `Message not found: ${id}`);
    }
  }

  function archive(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    try {
      GmailApp.getMessageById(id).getThread().moveToArchive();
      return ok({ archived: true, messageId: id });
    } catch (e) {
      return err('NOT_FOUND', `Message not found: ${id}`);
    }
  }

  function star(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    try {
      GmailApp.getMessageById(id).star();
      return ok({ starred: true, messageId: id });
    } catch (e) {
      return err('NOT_FOUND', `Message not found: ${id}`);
    }
  }

  function unstar(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    try {
      GmailApp.getMessageById(id).unstar();
      return ok({ unstarred: true, messageId: id });
    } catch (e) {
      return err('NOT_FOUND', `Message not found: ${id}`);
    }
  }

  function addLabel(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const labelName = requireParam(params, 'labelName');
    try {
      const thread = GmailApp.getMessageById(id).getThread();
      let label = GmailApp.getUserLabelByName(labelName);
      if (!label) label = GmailApp.createLabel(labelName);
      thread.addLabel(label);
      return ok({ labelAdded: true, messageId: id, label: labelName });
    } catch (e) {
      return err('LABEL_FAILED', `Could not add label: ${labelName} to ${id}`);
    }
  }

  function removeLabel(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const labelName = requireParam(params, 'labelName');
    try {
      const thread = GmailApp.getMessageById(id).getThread();
      const label = GmailApp.getUserLabelByName(labelName);
      if (label) thread.removeLabel(label);
      return ok({ labelRemoved: true, messageId: id, label: labelName });
    } catch (e) {
      return err('LABEL_FAILED', `Could not remove label from: ${id}`);
    }
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
    const maxResults = optionalNumber(params, 'maxResults', 20);
    const page = optionalNumber(params, 'page', 0);
    const start = page * maxResults;
    try {
      const drafts = GmailApp.getDrafts();
      const results = [];
      let hasMore = false;

      if (Array.isArray(drafts)) {
        const end = Math.min(start + maxResults, drafts.length);
        for (let i = start; i < end; i++) {
          results.push(draftToJSON(drafts[i]));
        }
        hasMore = end < drafts.length;
      } else if (drafts && typeof drafts.next === 'function') {
        let idx = 0;
        while (drafts.hasNext()) {
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
    try {
      const draft = findDraftById(id);
      if (!draft) return err('NOT_FOUND', `Draft not found: ${id}`);
      return ok({ draft: draftToJSON(draft) });
    } catch (e) {
      return err('NOT_FOUND', `Draft not found: ${id}`);
    }
  }

  function createDraft(params) {
    const to = requireParam(params, 'to');
    const subject = requireParam(params, 'subject');
    const body = requireParam(params, 'body');
    const cc = optionalString(params, 'cc');
    const bcc = optionalString(params, 'bcc');

    const options = {};
    if (cc) options.cc = cc;
    if (bcc) options.bcc = bcc;

    const draft = GmailApp.createDraft(to, subject, body, options);
    return ok({ draft: draftToJSON(draft) });
  }

  function updateDraft(params) {
    const id = requireParam(params, 'draftId');
    try {
      const draft = findDraftById(id);
      if (!draft) return err('NOT_FOUND', `Draft not found: ${id}`);

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
      return ok({ draft: draftToJSON(newDraft) });
    } catch (e) {
      return err('UPDATE_FAILED', `Could not update draft: ${id}`);
    }
  }

  function deleteDraft(params) {
    const id = requireParam(params, 'draftId');
    try {
      const draft = findDraftById(id);
      if (!draft) return err('NOT_FOUND', `Draft not found: ${id}`);
      draft.deleteDraft();
      return ok({ deleted: true, draftId: id });
    } catch (e) {
      return err('DELETE_FAILED', `Could not delete draft: ${id}`);
    }
  }

  function sendDraft(params) {
    const id = requireParam(params, 'draftId');
    try {
      const draft = findDraftById(id);
      if (!draft) return err('NOT_FOUND', `Draft not found: ${id}`);
      draft.send();
      return ok({ sent: true, draftId: id });
    } catch (e) {
      return err('SEND_FAILED', `Could not send draft: ${id}`);
    }
  }

  // ─── REPLY & FORWARD ───

  function reply(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const body = requireParam(params, 'body');
    const options = {};
    if (params.htmlBody) options.htmlBody = String(params.htmlBody);
    try {
      const msg = GmailApp.getMessageById(id);
      msg.reply(body, options);
      return ok({ replied: true, messageId: id });
    } catch (e) {
      return err('REPLY_FAILED', e.message || `Could not reply to message: ${id}`);
    }
  }

  function replyAll(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const body = requireParam(params, 'body');
    const options = {};
    if (params.htmlBody) options.htmlBody = String(params.htmlBody);
    try {
      const msg = GmailApp.getMessageById(id);
      msg.replyAll(body, options);
      return ok({ repliedAll: true, messageId: id });
    } catch (e) {
      return err('REPLY_FAILED', e.message || `Could not reply all to message: ${id}`);
    }
  }

  function forwardMsg(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const to = requireParam(params, 'to');
    const options = {};
    if (params.htmlBody) options.htmlBody = String(params.htmlBody);
    try {
      const msg = GmailApp.getMessageById(id);
      msg.forward(to, options);
      return ok({ forwarded: true, messageId: id, to });
    } catch (e) {
      return err('FORWARD_FAILED', e.message || `Could not forward message: ${id}`);
    }
  }

  function createDraftReply(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const body = requireParam(params, 'body');
    const options = {};
    if (params.htmlBody) options.htmlBody = String(params.htmlBody);
    if (params.cc) options.cc = String(params.cc);
    if (params.bcc) options.bcc = String(params.bcc);
    try {
      const msg = GmailApp.getMessageById(id);
      const draft = msg.createDraftReply(body, options);
      return ok({ draft: draftToJSON(draft) });
    } catch (e) {
      return err('DRAFT_FAILED', e.message || `Could not create draft reply: ${id}`);
    }
  }

  function createDraftReplyAll(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    const body = requireParam(params, 'body');
    const options = {};
    if (params.htmlBody) options.htmlBody = String(params.htmlBody);
    if (params.cc) options.cc = String(params.cc);
    if (params.bcc) options.bcc = String(params.bcc);
    try {
      const msg = GmailApp.getMessageById(id);
      const draft = msg.createDraftReplyAll(body, options);
      return ok({ draft: draftToJSON(draft) });
    } catch (e) {
      return err('DRAFT_FAILED', e.message || `Could not create draft reply all: ${id}`);
    }
  }

  // ─── DESTRUCTIVE ───

  function trashMessage(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    try {
      GmailApp.getMessageById(id).moveToTrash();
      return ok({ trashed: true, messageId: id });
    } catch (e) {
      return err('NOT_FOUND', `Message not found: ${id}`);
    }
  }

  function untrashMessage(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    try {
      GmailApp.getMessageById(id).getThread().moveToInbox();
      return ok({ untrashed: true, messageId: id });
    } catch (e) {
      return err('NOT_FOUND', `Message not found: ${id}`);
    }
  }

  function trashThread(params) {
    const id = requireParam(params, 'threadId');
    validateThreadId(id);
    try {
      GmailApp.getThreadById(id).moveToTrash();
      return ok({ trashed: true, threadId: id });
    } catch (e) {
      return err('NOT_FOUND', `Thread not found: ${id}`);
    }
  }

  function untrashThread(params) {
    const id = requireParam(params, 'threadId');
    validateThreadId(id);
    try {
      GmailApp.getThreadById(id).moveToInbox();
      return ok({ untrashed: true, threadId: id });
    } catch (e) {
      return err('NOT_FOUND', `Thread not found: ${id}`);
    }
  }

  function deleteMessage(params) {
    const id = requireParam(params, 'messageId');
    validateMessageId(id);
    try {
      GmailApp.getMessageById(id).getThread().moveToTrash();
      return ok({ deleted: true, messageId: id, note: 'Message moved to trash. Emptied after 30 days.' });
    } catch (e) {
      return err('DELETE_FAILED', `Could not delete message: ${id}`);
    }
  }

  // ─── BATCH ───

  function batch(params) {
    const operations = params.operations;
    if (!Array.isArray(operations) || operations.length === 0)
      return err('BAD_REQUEST', 'operations must be a non-empty array');
    if (operations.length > 20)
      return err('BAD_REQUEST', 'Max 20 operations per batch');

    const results = [];
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (!op.action) {
        results.push({
          index: i,
          success: false,
          error: { code: 'BAD_REQUEST', message: `Missing action at index ${i}` },
        });
        continue;
      }
      try {
        const result = handle(op.action, op.params || {});
        results.push({
          index: i,
          action: op.action,
          success: result.success,
          data: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error,
        });
      } catch (ex) {
        results.push({
          index: i,
          action: op.action,
          success: false,
          error: { code: 'INTERNAL_ERROR', message: ex.message || String(ex) },
        });
      }
    }
    return ok({ results });
  }

  return { handle };
})();
