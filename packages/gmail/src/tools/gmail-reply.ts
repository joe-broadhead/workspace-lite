import { formatResponse } from '@workspace-lite/shared'
import { callProxy } from '../proxy.js'

export function registerGmailReplyTools(server: { tool: Function }) {
  server.tool('gmail_reply', 'Reply to a message. Sends immediately.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('reply', args), { summary: 'Reply sent.' }) })
  server.tool('gmail_reply_all', 'Reply to a message and all recipients. Sends immediately.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('replyAll', args), { summary: 'Reply all sent.' }) })
  server.tool('gmail_forward', 'Forward a message to new recipients. Sends immediately.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('forward', args), { summary: 'Forwarded.' }) })
  server.tool('gmail_create_draft_reply', 'Create a draft reply without sending. Use this for review before sending.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('createDraftReply', args), { summary: 'Draft reply created.' }) })
  server.tool('gmail_create_draft_reply_all', 'Create a draft reply-all without sending. Use this for review before sending.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('createDraftReplyAll', args), { summary: 'Draft reply-all created.' }) })
}
