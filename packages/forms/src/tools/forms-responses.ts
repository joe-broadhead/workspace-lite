import { formatList, formatResponse } from '@workspace-lite/shared'
import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import { registerTool } from '@workspace-lite/shared/tool-helpers'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  formsDeleteAllResponsesSchema,
  formsDeleteResponseSchema,
  formsGetResponseSchema,
  formsListResponsesSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

const client = createProxyClient('forms')

export function registerFormsResponseTools(server: ToolServer) {
  server.tool('forms_list_responses', 'List recent Google Form responses with concise answer metadata. Response content is capped by the proxy.', formsListResponsesSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('responsesList', args)
      if (!result.success) return formatResponse(result)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'response',
        itemSummary: (item: unknown) => {
          const response = item as Record<string, unknown>
          return `${response.timestamp || '(no timestamp)'} (${response.responseId}) answers=${response.answerCount}`
        },
        hint: 'Use forms_get_response with formId and responseId for one response.',
      })
    })
  server.tool('forms_get_response', 'Get one Google Form response by response ID.', formsGetResponseSchema,
    async (args: Record<string, unknown>) => formatResponse(await callProxy('responseGet', args), { summary: 'Response retrieved.' }))
  registerTool(server, client, {
    name: 'forms_delete_response',
    description: 'Delete one Google Form response from the form response store. Requires confirmation.',
    schema: formsDeleteResponseSchema,
    action: 'responseDelete',
    summary: 'Response deleted.',
  })
  registerTool(server, client, {
    name: 'forms_delete_all_responses',
    description: 'Delete all responses from a Google Form response store. Requires confirmation.',
    schema: formsDeleteAllResponsesSchema,
    action: 'responsesDeleteAll',
    summary: 'All responses deleted.',
  })
}
