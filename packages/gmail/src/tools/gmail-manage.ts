import { formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerGmailManageTools(server: { tool: Function }) {
  server.tool(
    'gmail_trash_message',
    'Move a message to trash.',
    {
      messageId: { type: 'string', description: 'The Gmail message ID to trash.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('trashMessage', args)
      return formatResponse(result, { summary: 'Message moved to trash.', hint: 'Use gmail_untrash_message to restore.' })
    },
  )

  server.tool(
    'gmail_untrash_message',
    'Restore a message from trash back to inbox.',
    {
      messageId: { type: 'string', description: 'The Gmail message ID to restore.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('untrashMessage', args)
      return formatResponse(result, { summary: 'Message restored from trash.' })
    },
  )

  server.tool(
    'gmail_trash_thread',
    'Move an entire thread to trash.',
    {
      threadId: { type: 'string', description: 'The Gmail thread ID to trash.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('trashThread', args)
      return formatResponse(result, { summary: 'Thread moved to trash.' })
    },
  )

  server.tool(
    'gmail_untrash_thread',
    'Restore an entire thread from trash.',
    {
      threadId: { type: 'string', description: 'The Gmail thread ID to restore.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('untrashThread', args)
      return formatResponse(result, { summary: 'Thread restored from trash.' })
    },
  )

  server.tool(
    'gmail_delete_message',
    'Permanently delete a message (moves to trash first, auto-emptied after 30 days).',
    {
      messageId: { type: 'string', description: 'The Gmail message ID to delete.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('deleteMessage', args)
      return formatResponse(result, { summary: 'Message deleted (moved to trash).' })
    },
  )
}
