import { formatList, formatResponse } from '@workspace-lite/shared'
import { callProxy } from '../proxy.js'

export function registerGmailDraftTools(server: { tool: Function }) {
  server.tool('gmail_list_drafts', 'List all email drafts.', {},
    async (args: Record<string, unknown>) => {
      const result = await callProxy('listDrafts', args)
      return formatList(result, { itemsKey: 'items', noun: 'draft',
        itemSummary: (d: unknown) => { const draft = d as Record<string, unknown>; const msg = draft.message as Record<string, unknown>; return `To: ${msg?.to} — ${msg?.subject || '(no subject)'} (${draft.id})` },
        hint: 'Use gmail_get_draft with a draftId to read full content.' })
    })
  server.tool('gmail_get_draft', 'Get a specific draft by ID.', {},
    async (args: Record<string, unknown>) => {
      const result = await callProxy('getDraft', args)
      const draft = (result.data as Record<string, unknown>)?.draft as Record<string, unknown>
      const msg = draft?.message as Record<string, unknown>
      return { content: [{ type: 'text' as const, text: [`Draft: ${draft?.id}`, `To: ${msg?.to}`, `Subject: ${msg?.subject || '(no subject)'}`, '', msg?.body || ''].join('\n') }] }
    })
  server.tool('gmail_create_draft', 'Create a new email draft.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('createDraft', args), { summary: 'Draft created.' }) })
  server.tool('gmail_update_draft', 'Update an existing draft.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('updateDraft', args), { summary: 'Draft updated.' }) })
  server.tool('gmail_delete_draft', 'Delete a draft permanently.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('deleteDraft', args), { summary: 'Draft deleted.' }) })
  server.tool('gmail_send_draft', 'Send an existing draft.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('sendDraft', args), { summary: 'Draft sent.' }) })
}
