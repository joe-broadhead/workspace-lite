import { formatResponse, formatList } from '@workspace-lite/shared'
import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import { registerTool } from '@workspace-lite/shared/tool-helpers'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  formsAddItemSchema,
  formsDeleteItemSchema,
  formsListItemsSchema,
  formsMoveItemSchema,
  formsUpdateItemSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

const client = createProxyClient('forms')

export function registerFormsItemTools(server: ToolServer) {
  server.tool('forms_list_items', 'List items in a Google Form with concise metadata and supported item-specific fields.', formsListItemsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('itemsList', args)
      if (!result.success) return formatResponse(result)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const record = item as Record<string, unknown>
          return `${record.index}: ${record.title || '(untitled)'} [${record.type}] (${record.itemId})`
        },
        hint: 'Use forms_update_item, forms_move_item, or forms_delete_item with formId and itemId to manage items.',
      })
    })
  registerTool(server, client, {
    name: 'forms_add_item',
    description: 'Add a supported item type to a Google Form: text, paragraph, multiple choice, checkbox, list, scale, date, time, section header, or page break.',
    schema: formsAddItemSchema,
    action: 'itemAdd',
    summary: 'Form item added.',
  })
  registerTool(server, client, {
    name: 'forms_update_item',
    description: 'Update common Google Form item fields and supported item-specific fields such as choices or scale bounds.',
    schema: formsUpdateItemSchema,
    action: 'itemUpdate',
    summary: 'Form item updated.',
  })
  registerTool(server, client, {
    name: 'forms_move_item',
    description: 'Move a Google Form item to a new zero-based index.',
    schema: formsMoveItemSchema,
    action: 'itemMove',
    summary: 'Form item moved.',
  })
  registerTool(server, client, {
    name: 'forms_delete_item',
    description: 'Delete a Google Form item by item ID. Requires confirmation.',
    schema: formsDeleteItemSchema,
    action: 'itemDelete',
    summary: 'Form item deleted.',
  })
}
