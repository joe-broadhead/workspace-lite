import { formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerGmailWriteTools(server: { tool: Function }) {
  server.tool(
    'gmail_send',
    'Send an email from your Gmail account. Requires to, subject, and body.',
    {
      to: { type: 'string', description: 'Recipient email address.' },
      subject: { type: 'string', description: 'Email subject line.' },
      body: { type: 'string', description: 'Plain text email body.' },
      cc: { type: 'string', description: 'CC recipient (optional).' },
      bcc: { type: 'string', description: 'BCC recipient (optional).' },
      htmlBody: { type: 'string', description: 'HTML body (optional, overrides plain text for HTML clients).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('send', args)
      return formatResponse(result, { summary: 'Email sent successfully.' })
    },
  )

  server.tool(
    'gmail_mark_read',
    'Mark a message as read.',
    {
      messageId: { type: 'string', description: 'The Gmail message ID to mark as read.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('markRead', args)
      return formatResponse(result, { summary: 'Message marked as read.' })
    },
  )

  server.tool(
    'gmail_mark_unread',
    'Mark a message as unread.',
    {
      messageId: { type: 'string', description: 'The Gmail message ID to mark as unread.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('markUnread', args)
      return formatResponse(result, { summary: 'Message marked as unread.' })
    },
  )

  server.tool(
    'gmail_archive',
    'Archive a message (move to All Mail, remove from inbox).',
    {
      messageId: { type: 'string', description: 'The Gmail message ID to archive.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('archive', args)
      return formatResponse(result, { summary: 'Message archived.' })
    },
  )

  server.tool(
    'gmail_star',
    'Star a message.',
    {
      messageId: { type: 'string', description: 'The Gmail message ID to star.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('star', args)
      return formatResponse(result, { summary: 'Message starred.' })
    },
  )

  server.tool(
    'gmail_unstar',
    'Remove star from a message.',
    {
      messageId: { type: 'string', description: 'The Gmail message ID to unstar.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('unstar', args)
      return formatResponse(result, { summary: 'Message unstarred.' })
    },
  )

  server.tool(
    'gmail_add_label',
    'Add a label to a message. Creates the label if it does not exist.',
    {
      messageId: { type: 'string', description: 'The Gmail message ID.' },
      labelName: { type: 'string', description: 'Label name to add.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('addLabel', args)
      return formatResponse(result, { summary: 'Label added.' })
    },
  )

  server.tool(
    'gmail_remove_label',
    'Remove a label from a message.',
    {
      messageId: { type: 'string', description: 'The Gmail message ID.' },
      labelName: { type: 'string', description: 'Label name to remove.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('removeLabel', args)
      return formatResponse(result, { summary: 'Label removed.' })
    },
  )
}
