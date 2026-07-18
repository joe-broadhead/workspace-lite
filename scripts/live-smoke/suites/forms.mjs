/**
 * Forms smoke suite. Responses are unseedable via the API (no create-response
 * tool), so forms_get_response / forms_delete_response are documented skips;
 * forms_delete_all_responses is safe on an empty store.
 * The form file itself is trashed via drive in the drive-independent cleanup here.
 */
export const suite = {
  service: 'forms',
  steps: [
    { tool: 'forms_create_form', params: (c) => ({ title: `${c.prefix}-form`, description: 'smoke' }), save: { key: 'form', pick: 'data.form.id' } },
    { tool: 'forms_get_form', params: (c) => ({ formId: c.form, includeItems: true }) },
    { tool: 'forms_update_form', params: (c) => ({ formId: c.form, description: 'smoke updated', confirmationMessage: 'thanks' }) },
    { tool: 'forms_add_item', params: (c) => ({ formId: c.form, itemType: 'TEXT', title: `${c.prefix}-q1` }), save: { key: 'item', pick: 'data.item.itemId' } },
    { tool: 'forms_list_items', params: (c) => ({ formId: c.form }) },
    { tool: 'forms_update_item', params: (c) => ({ formId: c.form, itemId: c.item, title: `${c.prefix}-q1-renamed`, required: true }) },
    { tool: 'forms_move_item', params: (c) => ({ formId: c.form, itemId: c.item, index: 0 }) },
    { tool: 'forms_set_accepting_responses', params: (c) => ({ formId: c.form, acceptingResponses: false, customClosedFormMessage: 'closed for smoke' }) },
    { tool: 'forms_list_responses', params: (c) => ({ formId: c.form }) },
    { tool: 'forms_get_response', params: (c) => ({ formId: c.form, responseId: 'smoke-nonexistent' }), expect: 'NOT_FOUND', note: 'responses unseedable; negative path only' },
    { tool: 'forms_delete_response', params: (c) => ({ formId: c.form, responseId: 'smoke-nonexistent' }), gated: true, expect: 'DELETE_FAILED', note: 'responses unseedable; negative path only' },
    { tool: 'forms_delete_all_responses', params: (c) => ({ formId: c.form }), gated: true, note: 'empty store' },
    { tool: 'forms_delete_item', params: (c) => ({ formId: c.form, itemId: c.item }), gated: true },
    { tool: 'forms_batch', params: (c) => ({ operations: [
      { action: 'formGet', params: { formId: c.form } },
      { action: 'itemsList', params: { formId: c.form } },
    ] }) },
    // Destination lifecycle needs a spreadsheet (cross-service seed, trashed in cleanup).
    { tool: 'sheets_create_spreadsheet', params: (c) => ({ name: `${c.prefix}-form-dest` }), save: { key: 'dest', pick: 'data.spreadsheet.id' } },
    { tool: 'forms_set_response_destination', params: (c) => ({ formId: c.form, spreadsheetId: c.dest }) },
    { tool: 'forms_remove_response_destination', params: (c) => ({ formId: c.form }), gated: true },
  ],
  cleanup: [
    { tool: 'drive_delete_file', params: (c) => ({ fileId: c.form }), gated: true, skip: (c) => (c.form ? null : 'no form created') },
    { tool: 'drive_delete_file', params: (c) => ({ fileId: c.dest }), gated: true, skip: (c) => (c.dest ? null : 'no destination created') },
  ],
  verify: [
    { tool: 'drive_search_files', params: (c) => ({ query: `name contains '${c.prefix}' and trashed=false` }),
      leftovers: (body) => (Array.isArray(body.data) ? body.data.length : (body.data?.files ?? []).length) },
  ],
}
