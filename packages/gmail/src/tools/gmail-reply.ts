import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { gmailForwardSchema, gmailReplyAllSchema, gmailReplySchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerGmailReplyTools(server: ToolServer) {
  server.tool('gmail_reply', 'Reply to a message. Sends immediately.', gmailReplySchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('reply', args), { summary: 'Reply sent.' }) })
  server.tool('gmail_reply_all', 'Reply to a message and all recipients. Sends immediately.', gmailReplyAllSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('replyAll', args), { summary: 'Reply all sent.' }) })
  server.tool('gmail_forward', 'Forward a message to new recipients. Sends immediately.', gmailForwardSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('forward', args), { summary: 'Forwarded.' }) })
  server.tool('gmail_create_draft_reply', 'Create a draft reply without sending. Use this for review before sending.', gmailReplySchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('createDraftReply', args), { summary: 'Draft reply created.' }) })
  server.tool('gmail_create_draft_reply_all', 'Create a draft reply-all without sending. Use this for review before sending.', gmailReplyAllSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('createDraftReplyAll', args), { summary: 'Draft reply-all created.' }) })
}
