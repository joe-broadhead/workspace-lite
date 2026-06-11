import { formatList, formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerGmailListTools(server: { tool: Function }) {
  server.tool('gmail_profile', 'Get Gmail profile info: authenticated email.', {},
    async () => {
      const result = await callProxy('profile')
      const d = result.data as Record<string, unknown>
      return { content: [{ type: 'text' as const, text: `Gmail: ${d.email}` }] }
    })

  server.tool('gmail_search_messages', 'Search Gmail messages. Supports query syntax: isUnread, isStarred, from, to, subject, before, after, label. Paginate with page.', {},
    async (args: Record<string, unknown>) => {
      const result = await callProxy('searchMessages', args)
      return formatList(result, { itemsKey: 'items', noun: 'message',
        itemSummary: (m: unknown) => { const msg = m as Record<string, unknown>; return `${msg.isUnread ? '[UNREAD] ' : ''}${msg.subject} — ${msg.from} — ${msg.date} (${msg.id})` },
        hint: 'Use gmail_get_message with a messageId to read full content.' })
    })

  server.tool('gmail_list_threads', 'List Gmail threads. Same query/filter support as gmail_search_messages but groups by thread.', {},
    async (args: Record<string, unknown>) => {
      const result = await callProxy('listThreads', args)
      return formatList(result, { itemsKey: 'items', noun: 'thread',
        itemSummary: (t: unknown) => { const th = t as Record<string, unknown>; return `${th.isUnread ? '[UNREAD] ' : ''}${th.firstMessageSubject} — ${th.messageCount} msgs (${th.id})` },
        hint: 'Use gmail_get_thread with a threadId to read all messages.' })
    })

  server.tool('gmail_list_labels', 'List all Gmail labels.', {},
    async () => {
      const result = await callProxy('listLabels')
      const labels = (result.data as Array<Record<string, unknown>>) || []
      return { content: [{ type: 'text' as const, text: 'Labels:\n\n' + labels.map((l: Record<string, unknown>) => `${l.name} (${l.unreadCount} unread)`).join('\n') }] }
    })
}
