import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  gmailArchiveSchema, gmailLabelSchema, gmailMarkReadSchema,
  gmailMarkUnreadSchema, gmailSendSchema, gmailStarSchema, gmailUnstarSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerGmailWriteTools(server: ToolServer) {
  server.tool('gmail_send', 'Send an email from your Gmail account. Requires to, subject, body.', gmailSendSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('send', args), { summary: 'Email sent.' }) })
  server.tool('gmail_mark_read', 'Mark a message as read.', gmailMarkReadSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('markRead', args), { summary: 'Marked read.' }) })
  server.tool('gmail_mark_unread', 'Mark a message as unread.', gmailMarkUnreadSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('markUnread', args), { summary: 'Marked unread.' }) })
  server.tool('gmail_archive', 'Archive a message (remove from inbox).', gmailArchiveSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('archive', args), { summary: 'Archived.' }) })
  server.tool('gmail_star', 'Star a message.', gmailStarSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('star', args), { summary: 'Starred.' }) })
  server.tool('gmail_unstar', 'Remove star from a message.', gmailUnstarSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('unstar', args), { summary: 'Unstarred.' }) })
  server.tool('gmail_add_label', 'Add a label to a message. Creates the label if new.', gmailLabelSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('addLabel', args), { summary: 'Label added.' }) })
  server.tool('gmail_remove_label', 'Remove a label from a message.', gmailLabelSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('removeLabel', args), { summary: 'Label removed.' }) })
}
