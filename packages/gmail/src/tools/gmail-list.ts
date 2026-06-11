import { formatList, formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerGmailListTools(server: { tool: Function }) {
  server.tool(
    'gmail_profile',
    'Get Gmail profile info: authenticated email and remaining daily quota.',
    {},
    async () => {
      const result = await callProxy('profile')
      const d = result.data as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: `Gmail: ${d.email}`,
        }],
      }
    },
  )

  server.tool(
    'gmail_search_messages',
    'Search Gmail messages. Supports Gmail query syntax plus convenience filters: isUnread, isStarred, from, to, subject, before (YYYY/MM/DD), after (YYYY/MM/DD), label. Default: inbox. Paginate with page.',
    {
      query: { type: 'string', description: 'Gmail search query. Can use operators like from:email, subject:text, has:attachment. Leave empty for inbox.' },
      isUnread: { type: 'string', description: 'Set to "true" to show only unread messages.' },
      isStarred: { type: 'string', description: 'Set to "true" to show only starred messages.' },
      from: { type: 'string', description: 'Filter by sender email or name.' },
      to: { type: 'string', description: 'Filter by recipient.' },
      subject: { type: 'string', description: 'Filter by subject text.' },
      before: { type: 'string', description: 'Emails before date (YYYY/MM/DD).' },
      after: { type: 'string', description: 'Emails after date (YYYY/MM/DD).' },
      label: { type: 'string', description: 'Filter by label name.' },
      maxResults: { type: 'number', description: 'Max messages to return (default 20).' },
      page: { type: 'number', description: 'Page number for pagination (0-based).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('searchMessages', args)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'message',
        itemSummary: (m: unknown) => {
          const msg = m as Record<string, unknown>
          const unread = msg.isUnread ? '[UNREAD] ' : ''
          return `${unread}${msg.subject} — ${msg.from} — ${msg.date} (${msg.id})`
        },
        hint: 'Use gmail_get_message with a messageId to read full content.',
      })
    },
  )

  server.tool(
    'gmail_list_threads',
    'List Gmail threads. Same query/filter support as gmail_search_messages but groups by thread.',
    {
      query: { type: 'string', description: 'Gmail search query for threads.' },
      isUnread: { type: 'string', description: 'Show only unread threads.' },
      isStarred: { type: 'string', description: 'Show only starred threads.' },
      from: { type: 'string', description: 'Filter by sender.' },
      subject: { type: 'string', description: 'Filter by subject.' },
      label: { type: 'string', description: 'Filter by label.' },
      maxResults: { type: 'number', description: 'Max threads (default 20).' },
      page: { type: 'number', description: 'Page number (0-based).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('listThreads', args)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'thread',
        itemSummary: (t: unknown) => {
          const thread = t as Record<string, unknown>
          const unread = thread.isUnread ? '[UNREAD] ' : ''
          return `${unread}${thread.firstMessageSubject} — ${thread.messageCount} msgs — ${thread.lastUpdated} (${thread.id})`
        },
        hint: 'Use gmail_get_thread with a threadId to read all messages in the thread.',
      })
    },
  )

  server.tool(
    'gmail_list_labels',
    'List all Gmail labels with their names.',
    {},
    async () => {
      const result = await callProxy('listLabels')
      const labels = (result.data as Array<Record<string, unknown>>) || []
      const lines = labels.map((l: Record<string, unknown>) => `${l.name} (${l.unreadCount} unread)`)
      return { content: [{ type: 'text' as const, text: `Labels:\n\n${lines.join('\n')}` }] }
    },
  )
}
