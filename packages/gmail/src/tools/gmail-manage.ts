import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  gmailBatchModifySchema, gmailDeleteMessageSchema, gmailTrashMessageSchema,
  gmailTrashThreadSchema, gmailUntrashMessageSchema, gmailUntrashThreadSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerGmailManageTools(server: ToolServer) {
  server.tool('gmail_trash_message', 'Move a message to trash.', gmailTrashMessageSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('trashMessage', args), { summary: 'Trashed.', hint: 'Use gmail_untrash_message to restore.' }) })
  server.tool('gmail_untrash_message', 'Restore a message from trash.', gmailUntrashMessageSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('untrashMessage', args), { summary: 'Restored.' }) })
  server.tool('gmail_trash_thread', 'Move an entire thread to trash.', gmailTrashThreadSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('trashThread', args), { summary: 'Thread trashed.' }) })
  server.tool('gmail_untrash_thread', 'Restore a thread from trash.', gmailUntrashThreadSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('untrashThread', args), { summary: 'Thread restored.' }) })
  server.tool('gmail_delete_message', 'Permanently delete a message.', gmailDeleteMessageSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('deleteMessage', args), { summary: 'Deleted.' }) })
  server.tool('gmail_batch_modify', 'Bulk label changes on multiple messages. Use messageIds, addLabels (optional), and removeLabels (optional). Labels can be names (INBOX, UNREAD, STARRED) or IDs.',
    gmailBatchModifySchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batchModify', args)
      return formatResponse(result, { summary: 'Batch modify executed.' })
    })
}
