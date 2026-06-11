import { formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerGmailWriteTools(server: { tool: Function }) {
  server.tool('gmail_send', 'Send an email from your Gmail account. Requires to, subject, body.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('send', args), { summary: 'Email sent.' }) })
  server.tool('gmail_mark_read', 'Mark a message as read.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('markRead', args), { summary: 'Marked read.' }) })
  server.tool('gmail_mark_unread', 'Mark a message as unread.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('markUnread', args), { summary: 'Marked unread.' }) })
  server.tool('gmail_archive', 'Archive a message (remove from inbox).', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('archive', args), { summary: 'Archived.' }) })
  server.tool('gmail_star', 'Star a message.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('star', args), { summary: 'Starred.' }) })
  server.tool('gmail_unstar', 'Remove star from a message.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('unstar', args), { summary: 'Unstarred.' }) })
  server.tool('gmail_add_label', 'Add a label to a message. Creates the label if new.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('addLabel', args), { summary: 'Label added.' }) })
  server.tool('gmail_remove_label', 'Remove a label from a message.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('removeLabel', args), { summary: 'Label removed.' }) })
}
