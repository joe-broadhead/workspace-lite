import { formatList, formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerGmailDraftTools(server: { tool: Function }) {
  server.tool(
    'gmail_list_drafts',
    'List all email drafts.',
    {
      maxResults: { type: 'number', description: 'Max drafts to return (default 20).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('listDrafts', args)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'draft',
        itemSummary: (d: unknown) => {
          const draft = d as Record<string, unknown>
          const msg = draft.message as Record<string, unknown>
          return `To: ${msg?.to} — Subject: ${msg?.subject || '(no subject)'} — ${draft.id}`
        },
        hint: 'Use gmail_get_draft with a draftId to read full content.',
      })
    },
  )

  server.tool(
    'gmail_get_draft',
    'Get a specific draft by ID with full content.',
    {
      draftId: { type: 'string', description: 'The draft ID.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('getDraft', args)
      const draft = (result.data as Record<string, unknown>)?.draft as Record<string, unknown>
      const msg = draft?.message as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: [
            `Draft: ${draft?.id}`,
            `To: ${msg?.to}`,
            msg?.cc ? `CC: ${msg.cc}` : '',
            `Subject: ${msg?.subject || '(no subject)'}`,
            '',
            msg?.body || '(empty body)',
          ].filter(Boolean).join('\n'),
        }],
      }
    },
  )

  server.tool(
    'gmail_create_draft',
    'Create a new email draft.',
    {
      to: { type: 'string', description: 'Recipient email.' },
      subject: { type: 'string', description: 'Email subject.' },
      body: { type: 'string', description: 'Email body text.' },
      cc: { type: 'string', description: 'CC recipient (optional).' },
      bcc: { type: 'string', description: 'BCC recipient (optional).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('createDraft', args)
      return formatResponse(result, { summary: 'Draft created.' })
    },
  )

  server.tool(
    'gmail_update_draft',
    'Update an existing draft. Only specified fields are changed.',
    {
      draftId: { type: 'string', description: 'The draft ID to update.' },
      to: { type: 'string', description: 'New recipient (optional).' },
      subject: { type: 'string', description: 'New subject (optional).' },
      body: { type: 'string', description: 'New body (optional).' },
      cc: { type: 'string', description: 'New CC (optional).' },
      bcc: { type: 'string', description: 'New BCC (optional).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('updateDraft', args)
      return formatResponse(result, { summary: 'Draft updated.' })
    },
  )

  server.tool(
    'gmail_delete_draft',
    'Delete a draft permanently.',
    {
      draftId: { type: 'string', description: 'The draft ID to delete.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('deleteDraft', args)
      return formatResponse(result, { summary: 'Draft deleted.' })
    },
  )

  server.tool(
    'gmail_send_draft',
    'Send an existing draft immediately.',
    {
      draftId: { type: 'string', description: 'The draft ID to send.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('sendDraft', args)
      return formatResponse(result, { summary: 'Draft sent.' })
    },
  )
}
