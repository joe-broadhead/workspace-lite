import { formatList, formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  gmailCreateFilterSchema, gmailDeleteFilterSchema, gmailGetFilterSchema,
  gmailUpdateVacationResponderSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

function filterSummary(item: unknown) {
  const filter = item as Record<string, unknown>
  const criteria = (filter.criteria || {}) as Record<string, unknown>
  const action = (filter.action || {}) as Record<string, unknown>
  const criteriaText = Object.entries(criteria).map(([key, value]) => `${key}=${String(value)}`).join(', ') || 'no criteria'
  const actionText = Object.entries(action).map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : String(value)}`).join(', ') || 'no action'
  return `${filter.id} — ${criteriaText} → ${actionText}`
}

export function registerGmailSettingsTools(server: ToolServer) {
  server.tool('gmail_list_filters', 'List Gmail filters configured for the authenticated account.', {},
    async () => {
      const result = await callProxy('filtersList')
      if (!result.success) return formatResponse(result)
      return formatList(result, { itemsKey: 'items', noun: 'filter', itemSummary: filterSummary,
        hint: 'Use gmail_get_filter with a filterId for the raw filter resource.' })
    })

  server.tool('gmail_get_filter', 'Get one Gmail filter by ID.', gmailGetFilterSchema,
    async (args: Record<string, unknown>) => formatResponse(await callProxy('filtersGet', args)))

  server.tool('gmail_create_filter', 'Create a Gmail filter. Criteria fields match Gmail API filter criteria. Label names or IDs in addLabels/removeLabels are resolved to label IDs; forwarding requires params.confirm=true.', gmailCreateFilterSchema,
    async (args: Record<string, unknown>) => formatResponse(await callProxy('filtersCreate', args), { summary: 'Filter created.' }))

  server.tool('gmail_delete_filter', 'Permanently delete a Gmail filter by ID. Requires confirmation.', gmailDeleteFilterSchema,
    async (args: Record<string, unknown>) => formatResponse(await callProxy('filtersDelete', args), { summary: 'Filter deleted.' }))

  server.tool('gmail_get_vacation_responder', 'Get Gmail vacation responder settings.', {},
    async () => formatResponse(await callProxy('vacationGet')))

  server.tool('gmail_update_vacation_responder', 'Update Gmail vacation responder settings. Enabling or changing an enabled responder requires params.confirm=true.', gmailUpdateVacationResponderSchema,
    async (args: Record<string, unknown>) => formatResponse(await callProxy('vacationUpdate', args), { summary: 'Vacation responder settings updated.' }))
}
