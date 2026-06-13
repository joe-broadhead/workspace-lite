import { formatResponse } from '@workspace-lite/shared'
import { callProxy } from '../proxy.js'

export function registerGmailReadTools(server: { tool: Function }) {
  server.tool('gmail_get_message', 'Get full details of a Gmail message by ID. Returns subject, from, to, cc, bcc, date, body, attachments.', {},
    async (args: Record<string, unknown>) => {
      const result = await callProxy('getMessage', args)
      const msg = (result.data as Record<string, unknown>)?.message as Record<string, unknown>
      return { content: [{ type: 'text' as const, text: [`Subject: ${msg?.subject}`, `From: ${msg?.from}`, `To: ${msg?.to}`, msg?.cc ? `CC: ${msg.cc}` : '', `Date: ${msg?.date}`, `Unread: ${msg?.isUnread} | Starred: ${msg?.isStarred}`, '', msg?.body || ''].filter(Boolean).join('\n') }] }
    })

  server.tool('gmail_get_thread', 'Get a complete Gmail thread by ID with all messages.', {},
    async (args: Record<string, unknown>) => {
      const result = await callProxy('getThread', args)
      const thread = (result.data as Record<string, unknown>)?.thread as Record<string, unknown>
      const messages = (thread?.messages as Array<Record<string, unknown>>) || []
      const text = [`Thread: ${thread?.firstMessageSubject}`, `${thread?.messageCount} messages — Unread: ${thread?.isUnread}`, '', ...messages.map((m, i) => [`--- Message ${i + 1} ---`, `From: ${m.from} | Date: ${m.date}`, '', m.body].join('\n'))].join('\n')
      return { content: [{ type: 'text' as const, text }] }
    })
}
