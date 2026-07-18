/**
 * Gmail smoke suite. Send-class steps (send, replies, forward, drafts with
 * recipients) require --self-email and only ever target that address; the
 * harness recipient guard enforces this before any call is made.
 * gmail_get_attachment has no seedable positive path (sends can't attach
 * files); it runs as an expected NOT_FOUND. Vacation responder is exercised
 * as a no-op update that keeps auto-reply disabled.
 */
const needsSelf = (c) => (c.selfEmail ? null : 'requires --self-email')

export const suite = {
  service: 'gmail',
  steps: [
    { tool: 'gmail_profile', params: () => ({}) },
    { tool: 'gmail_send', params: (c) => ({ to: c.selfEmail, subject: `${c.prefix} seed`, body: 'smoke seed (self only)' }), gated: true, skip: needsSelf },
    { tool: 'gmail_search_messages', params: (c) => ({ query: `subject:"${c.prefix} seed"`, maxResults: 3 }), save: { key: 'msg', pick: 'data.0.id' }, retryUntilFound: 5, skip: needsSelf },
    { tool: 'gmail_get_message', params: (c) => ({ messageId: c.msg }), skip: needsSelf },
    { tool: 'gmail_get_thread', params: (c) => ({ threadId: c.msg }), skip: needsSelf },
    { tool: 'gmail_list_threads', params: (c) => ({ query: c.prefix, maxResults: 5 }) },
    { tool: 'gmail_list_labels', params: () => ({}) },
    { tool: 'gmail_add_label', params: (c) => ({ messageId: c.msg, labelName: `${c.prefix}-label` }), skip: needsSelf, note: 'creates a run label; Gmail has no label-delete tool — leftover label is empty and harmless' },
    { tool: 'gmail_remove_label', params: (c) => ({ messageId: c.msg, labelName: `${c.prefix}-label` }), skip: needsSelf },
    { tool: 'gmail_mark_read', params: (c) => ({ messageId: c.msg }), skip: needsSelf },
    { tool: 'gmail_mark_unread', params: (c) => ({ messageId: c.msg }), skip: needsSelf },
    { tool: 'gmail_star', params: (c) => ({ messageId: c.msg }), skip: needsSelf },
    { tool: 'gmail_unstar', params: (c) => ({ messageId: c.msg }), skip: needsSelf },
    { tool: 'gmail_archive', params: (c) => ({ messageId: c.msg }), skip: needsSelf },
    { tool: 'gmail_batch_modify', params: (c) => ({ messageIds: [c.msg], addLabels: ['INBOX'] }), skip: needsSelf },
    { tool: 'gmail_create_draft', params: (c) => ({ to: c.selfEmail, subject: `${c.prefix} draft`, body: 'smoke draft' }), skip: needsSelf,
      save: { key: 'draft', pick: (body) => body.data?.draft?.id ?? body.data?.id } },
    { tool: 'gmail_get_draft', params: (c) => ({ draftId: c.draft }), skip: needsSelf },
    { tool: 'gmail_update_draft', params: (c) => ({ draftId: c.draft, body: 'smoke draft v2' }), skip: needsSelf, note: 'Gmail rotates the draft ID on update' },
    // Re-find the rotated draft ID by run-prefixed subject, then exercise send_draft.
    { tool: 'gmail_list_drafts', params: () => ({ maxResults: 20 }), skip: needsSelf,
      save: { key: 'draft', pick: (body, c) => (body.data?.drafts ?? body.data ?? []).find?.((d) => String(d.message?.subject ?? '').includes(`${c.prefix} draft`))?.id } },
    { tool: 'gmail_send_draft', params: (c) => ({ draftId: c.draft }), gated: true, skip: needsSelf, note: 'sends to self; removes the draft' },
    { tool: 'gmail_create_draft_reply', params: (c) => ({ messageId: c.msg, body: 'smoke draft reply' }), skip: needsSelf },
    { tool: 'gmail_create_draft_reply_all', params: (c) => ({ messageId: c.msg, body: 'smoke draft reply all' }), skip: needsSelf },
    // Find one reply draft by threaded subject and delete it; the harness re-runs list in cleanup for any second one.
    { tool: 'gmail_list_drafts', params: () => ({ maxResults: 20 }), skip: needsSelf,
      save: { key: 'replyDraft', pick: (body, c) => (body.data?.drafts ?? body.data ?? []).find?.((d) => String(d.message?.subject ?? '').includes(`${c.prefix} seed`))?.id } },
    { tool: 'gmail_delete_draft', params: (c) => ({ draftId: c.replyDraft }), gated: true, skip: (c) => (c.selfEmail ? (c.replyDraft ? null : 'no reply draft found') : 'requires --self-email') },
    { tool: 'gmail_reply', params: (c) => ({ messageId: c.msg, body: 'smoke reply (self thread)' }), gated: true, skip: needsSelf },
    { tool: 'gmail_reply_all', params: (c) => ({ messageId: c.msg, body: 'smoke reply-all (self thread)' }), gated: true, skip: needsSelf },
    { tool: 'gmail_forward', params: (c) => ({ messageId: c.msg, to: c.selfEmail }), gated: true, skip: needsSelf },
    { tool: 'gmail_get_attachment', params: (c) => ({ messageId: c.msg, attachmentId: 'smoke-nonexistent' }), expect: 'NOT_FOUND', skip: needsSelf, note: 'attachments unseedable via send; negative path only' },
    { tool: 'gmail_trash_message', params: (c) => ({ messageId: c.msg }), gated: true, skip: needsSelf },
    { tool: 'gmail_untrash_message', params: (c) => ({ messageId: c.msg }), skip: needsSelf },
    { tool: 'gmail_trash_thread', params: (c) => ({ threadId: c.msg }), gated: true, skip: needsSelf },
    { tool: 'gmail_untrash_thread', params: (c) => ({ threadId: c.msg }), skip: needsSelf },
    { tool: 'gmail_create_filter', params: (c) => ({ subject: `${c.prefix}-filter-token`, addLabels: [`${c.prefix}-label`] }), save: { key: 'filter', pick: 'data.filter.id' } },
    { tool: 'gmail_list_filters', params: () => ({}) },
    { tool: 'gmail_get_filter', params: (c) => ({ filterId: c.filter }) },
    { tool: 'gmail_delete_filter', params: (c) => ({ filterId: c.filter }), gated: true },
    { tool: 'gmail_get_vacation_responder', params: () => ({}) },
    { tool: 'gmail_update_vacation_responder', params: () => ({ enableAutoReply: false }), gated: true, note: 'no-op update; keeps auto-reply disabled' },
    { tool: 'gmail_batch', params: (c) => ({ operations: [
      { action: 'profile', params: {} },
      { action: 'searchMessages', params: { query: c.prefix, maxResults: 5 } },
    ] }) },
    { tool: 'gmail_delete_message', params: (c) => ({ messageId: c.msg }), gated: true, skip: needsSelf, note: 'trash-only per product design' },
  ],
  cleanup: [
    // Delete any remaining run reply draft, then trash the whole run thread (seed + replies + forward).
    { tool: 'gmail_list_drafts', params: () => ({ maxResults: 20 }), skip: (c) => (c.msg ? null : 'no seed message'),
      save: { key: 'replyDraft2', pick: (body, c) => (body.data?.drafts ?? body.data ?? []).find?.((d) => String(d.message?.subject ?? '').includes(c.prefix))?.id ?? '' } },
    { tool: 'gmail_delete_draft', params: (c) => ({ draftId: c.replyDraft2 }), gated: true, skip: (c) => (c.replyDraft2 ? null : 'no remaining run drafts') },
    { tool: 'gmail_trash_thread', params: (c) => ({ threadId: c.msg }), gated: true, skip: (c) => (c.msg ? null : 'no seed message') },
  ],
  verify: [
    { tool: 'gmail_search_messages', params: (c) => ({ query: `subject:${c.prefix} in:inbox`, maxResults: 10 }),
      leftovers: (body) => (Array.isArray(body.data) ? body.data.length : 0) },
    { tool: 'gmail_list_filters', params: () => ({}),
      leftovers: (body, c) => JSON.stringify(body.data ?? []).includes(c.prefix) ? 1 : 0 },
  ],
}
