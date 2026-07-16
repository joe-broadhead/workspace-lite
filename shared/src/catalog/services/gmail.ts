import { formatList } from '../../response.js'
import {
  gmailArchiveSchema,
  gmailAttachmentGetSchema,
  gmailBatchModifySchema,
  gmailBatchSchema,
  gmailCreateDraftSchema,
  gmailCreateFilterSchema,
  gmailDeleteDraftSchema,
  gmailDeleteFilterSchema,
  gmailDeleteMessageSchema,
  gmailForwardSchema,
  gmailGetDraftSchema,
  gmailGetFilterSchema,
  gmailGetMessageSchema,
  gmailGetThreadSchema,
  gmailLabelSchema,
  gmailListDraftsSchema,
  gmailListThreadsSchema,
  gmailMarkReadSchema,
  gmailMarkUnreadSchema,
  gmailReplyAllSchema,
  gmailReplySchema,
  gmailSearchMessagesSchema,
  gmailSendDraftSchema,
  gmailSendSchema,
  gmailStarSchema,
  gmailTrashMessageSchema,
  gmailTrashThreadSchema,
  gmailUnstarSchema,
  gmailUntrashMessageSchema,
  gmailUntrashThreadSchema,
  gmailUpdateDraftSchema,
  gmailUpdateVacationResponderSchema,
} from '../../schemas.js'
import type { ToolSpec } from '../types.js'

/** gmail service catalog — 39 tools. */
export const gmailTools: ToolSpec[] = [
  {
    name: 'gmail_add_label',
    service: 'gmail',
    action: 'addLabel',
    description: "Add a label to a message. Creates the label if new.",
    schema: gmailLabelSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Label added." },
  },
  {
    name: 'gmail_archive',
    service: 'gmail',
    action: 'archive',
    description: "Archive a message (remove from inbox).",
    schema: gmailArchiveSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Archived." },
  },
  {
    name: 'gmail_batch',
    service: 'gmail',
    action: 'batch',
    description: "Execute multiple Gmail operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (profile, searchMessages, listThreads, getMessage, getThread, listLabels, send, createDraft, createDraftReply, createDraftReplyAll, listDrafts, getDraft, updateDraft, deleteDraft, sendDraft, markRead, markUnread, archive, star, unstar, addLabel, removeLabel, trashMessage, untrashMessage, deleteMessage, trashThread, untrashThread, reply, replyAll, forward, attachmentGet, batchModify, filtersList, filtersGet, filtersCreate, filtersDelete, vacationGet, vacationUpdate). Operations execute sequentially; errors are collected per-operation. Up to 20 operations.",
    schema: gmailBatchSchema,
    batchEligible: false,
    isBatchTool: true,
    cli: { paramsJsonOnly: true },
    group: 'batch',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_batch_modify',
    service: 'gmail',
    action: 'batchModify',
    description: "Bulk label changes on multiple messages. Use messageIds, addLabels (optional), and removeLabels (optional). Labels can be names (INBOX, UNREAD, STARRED) or IDs.",
    schema: gmailBatchModifySchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Batch modify executed." },
  },
  {
    name: 'gmail_create_draft',
    service: 'gmail',
    action: 'createDraft',
    description: "Create a new email draft.",
    schema: gmailCreateDraftSchema,
    batchEligible: true,
    group: 'write',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_create_draft_reply',
    service: 'gmail',
    action: 'createDraftReply',
    description: "Create a draft reply without sending. Use this for review before sending.",
    schema: gmailReplySchema,
    batchEligible: true,
    group: 'write',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_create_draft_reply_all',
    service: 'gmail',
    action: 'createDraftReplyAll',
    description: "Create a draft reply-all without sending. Use this for review before sending.",
    schema: gmailReplyAllSchema,
    batchEligible: true,
    group: 'write',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_create_filter',
    service: 'gmail',
    action: 'filtersCreate',
    description: "Create a Gmail filter. Criteria fields match Gmail API filter criteria. Label names or IDs in addLabels/removeLabels are resolved to label IDs; forwarding requires params.confirm=true.",
    schema: gmailCreateFilterSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Filter created." },
  },
  {
    name: 'gmail_delete_draft',
    service: 'gmail',
    action: 'deleteDraft',
    description: "Delete a draft permanently.",
    schema: gmailDeleteDraftSchema,
    batchEligible: true,
    group: 'manage',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_delete_filter',
    service: 'gmail',
    action: 'filtersDelete',
    description: "Permanently delete a Gmail filter by ID. Requires confirmation.",
    schema: gmailDeleteFilterSchema,
    batchEligible: true,
    group: 'manage',
    formatter: { kind: 'text', summary: "Filter deleted." },
  },
  {
    name: 'gmail_delete_message',
    service: 'gmail',
    action: 'deleteMessage',
    description: "Delete a message by moving it to trash. Gmail permanently removes trashed messages after its retention period.",
    schema: gmailDeleteMessageSchema,
    batchEligible: true,
    group: 'manage',
    formatter: { kind: 'text', summary: "Moved to trash." },
  },
  {
    name: 'gmail_forward',
    service: 'gmail',
    action: 'forward',
    description: "Forward a message to new recipients. Sends immediately.",
    schema: gmailForwardSchema,
    batchEligible: true,
    group: 'write',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_get_attachment',
    service: 'gmail',
    action: 'attachmentGet',
    description: "Download an attachment from a Gmail message. Returns base64 for binary or plain text for text attachments. Requires messageId and attachmentId (from gmail_get_message).",
    schema: gmailAttachmentGetSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text' },
  },
  {
    name: 'gmail_get_draft',
    service: 'gmail',
    action: 'getDraft',
    description: "Get a specific draft by ID.",
    schema: gmailGetDraftSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text' },
  },
  {
    name: 'gmail_get_filter',
    service: 'gmail',
    action: 'filtersGet',
    description: "Get one Gmail filter by ID.",
    schema: gmailGetFilterSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text' },
  },
  {
    name: 'gmail_get_message',
    service: 'gmail',
    action: 'getMessage',
    description: "Get full details of a Gmail message by ID. Returns subject, from, to, cc, bcc, date, body, attachments.",
    schema: gmailGetMessageSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text' },
  },
  {
    name: 'gmail_get_thread',
    service: 'gmail',
    action: 'getThread',
    description: "Get a complete Gmail thread by ID with all messages.",
    schema: gmailGetThreadSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text' },
  },
  {
    name: 'gmail_get_vacation_responder',
    service: 'gmail',
    action: 'vacationGet',
    description: "Get Gmail vacation responder settings.",
    schema: {},
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text', summary: "Vacation responder settings updated." },
  },
  {
    name: 'gmail_list_drafts',
    service: 'gmail',
    action: 'listDrafts',
    description: "List all email drafts.",
    schema: gmailListDraftsSchema,
    batchEligible: true,
    group: 'list',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'draft',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_list_filters',
    service: 'gmail',
    action: 'filtersList',
    description: "List Gmail filters configured for the authenticated account.",
    schema: {},
    batchEligible: true,
    group: 'list',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'filter',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_list_labels',
    service: 'gmail',
    action: 'listLabels',
    description: "List all Gmail labels.",
    schema: {},
    batchEligible: true,
    group: 'list',
    formatter: { kind: 'text' },
  },
  {
    name: 'gmail_list_threads',
    service: 'gmail',
    action: 'listThreads',
    description: "List Gmail threads. Same filters as search_messages.",
    schema: gmailListThreadsSchema,
    batchEligible: true,
    group: 'list',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'thread',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_mark_read',
    service: 'gmail',
    action: 'markRead',
    description: "Mark a message as read.",
    schema: gmailMarkReadSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text', summary: "Marked read." },
  },
  {
    name: 'gmail_mark_unread',
    service: 'gmail',
    action: 'markUnread',
    description: "Mark a message as unread.",
    schema: gmailMarkUnreadSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Marked unread." },
  },
  {
    name: 'gmail_profile',
    service: 'gmail',
    action: 'profile',
    description: "Get Gmail profile info.",
    schema: {},
    batchEligible: true,
    group: 'read',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'message',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_remove_label',
    service: 'gmail',
    action: 'removeLabel',
    description: "Remove a label from a message.",
    schema: gmailLabelSchema,
    batchEligible: true,
    group: 'manage',
    formatter: { kind: 'text', summary: "Label removed." },
  },
  {
    name: 'gmail_reply',
    service: 'gmail',
    action: 'reply',
    description: "Reply to a message. Sends immediately.",
    schema: gmailReplySchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Reply sent." },
  },
  {
    name: 'gmail_reply_all',
    service: 'gmail',
    action: 'replyAll',
    description: "Reply to a message and all recipients. Sends immediately.",
    schema: gmailReplyAllSchema,
    batchEligible: true,
    group: 'write',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_search_messages',
    service: 'gmail',
    action: 'searchMessages',
    description: "Search Gmail messages. Supports query syntax, filters, pagination.",
    schema: gmailSearchMessagesSchema,
    batchEligible: true,
    group: 'list',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'message',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_send',
    service: 'gmail',
    action: 'send',
    description: "Send an email from your Gmail account. Requires to, subject, body.",
    schema: gmailSendSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Email sent." },
  },
  {
    name: 'gmail_send_draft',
    service: 'gmail',
    action: 'sendDraft',
    description: "Send an existing draft.",
    schema: gmailSendDraftSchema,
    batchEligible: true,
    group: 'write',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_star',
    service: 'gmail',
    action: 'star',
    description: "Star a message.",
    schema: gmailStarSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Starred." },
  },
  {
    name: 'gmail_trash_message',
    service: 'gmail',
    action: 'trashMessage',
    description: "Move a message to trash.",
    schema: gmailTrashMessageSchema,
    batchEligible: true,
    group: 'manage',
    formatter: { kind: 'text', summary: "Trashed." },
  },
  {
    name: 'gmail_trash_thread',
    service: 'gmail',
    action: 'trashThread',
    description: "Move an entire thread to trash.",
    schema: gmailTrashThreadSchema,
    batchEligible: true,
    group: 'manage',
    formatter: { kind: 'text', summary: "Thread trashed." },
  },
  {
    name: 'gmail_unstar',
    service: 'gmail',
    action: 'unstar',
    description: "Remove star from a message.",
    schema: gmailUnstarSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Unstarred." },
  },
  {
    name: 'gmail_untrash_message',
    service: 'gmail',
    action: 'untrashMessage',
    description: "Restore a message from trash.",
    schema: gmailUntrashMessageSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Restored." },
  },
  {
    name: 'gmail_untrash_thread',
    service: 'gmail',
    action: 'untrashThread',
    description: "Restore a thread from trash.",
    schema: gmailUntrashThreadSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Thread restored." },
  },
  {
    name: 'gmail_update_draft',
    service: 'gmail',
    action: 'updateDraft',
    description: "Update an existing draft.",
    schema: gmailUpdateDraftSchema,
    batchEligible: true,
    group: 'write',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'gmail_update_vacation_responder',
    service: 'gmail',
    action: 'vacationUpdate',
    description: "Update Gmail vacation responder settings. Enabling or changing an enabled responder requires params.confirm=true.",
    schema: gmailUpdateVacationResponderSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Vacation responder settings updated." },
  },
]
