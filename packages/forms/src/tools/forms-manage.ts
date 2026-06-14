import { formatResponse } from '@workspace-lite/shared'
import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import { registerTool } from '@workspace-lite/shared/tool-helpers'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  formsCreateFormSchema,
  formsGetFormSchema,
  formsRemoveResponseDestinationSchema,
  formsSetAcceptingResponsesSchema,
  formsSetResponseDestinationSchema,
  formsUpdateFormSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

const client = createProxyClient('forms')

export function registerFormsManageTools(server: ToolServer) {
  registerTool(server, client, {
    name: 'forms_create_form',
    description: 'Create a new Google Form with an optional description and initial publish state.',
    schema: formsCreateFormSchema,
    action: 'formCreate',
    summary: 'Form created.',
  })
  server.tool('forms_get_form', 'Get Google Form metadata, settings, item summary, and response destination information.', formsGetFormSchema,
    async (args: Record<string, unknown>) => formatResponse(await callProxy('formGet', args), { summary: 'Form retrieved.' }))
  registerTool(server, client, {
    name: 'forms_update_form',
    description: 'Update Google Form title, description, confirmation and response settings supported by FormsApp.',
    schema: formsUpdateFormSchema,
    action: 'formUpdate',
    summary: 'Form updated.',
  })
  registerTool(server, client, {
    name: 'forms_set_accepting_responses',
    description: 'Open or close a Google Form for responses, optionally setting the custom closed-form message.',
    schema: formsSetAcceptingResponsesSchema,
    action: 'formSetAcceptingResponses',
    summary: 'Accepting-responses setting updated.',
  })
  registerTool(server, client, {
    name: 'forms_set_response_destination',
    description: 'Link a Google Form response destination to a Google Sheets spreadsheet.',
    schema: formsSetResponseDestinationSchema,
    action: 'formSetDestination',
    summary: 'Response destination set.',
  })
  registerTool(server, client, {
    name: 'forms_remove_response_destination',
    description: 'Unlink a Google Form from its current response destination.',
    schema: formsRemoveResponseDestinationSchema,
    action: 'formRemoveDestination',
    summary: 'Response destination removed.',
  })
}
