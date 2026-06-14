# Google Forms

Create and manage Google Forms through the Apps Script `FormApp` service.

## Tools

| Tool | Description |
|---|---|
| `forms_create_form` | Create a new form with optional description and publish state. |
| `forms_get_form` | Get form metadata, settings, response destination, counts, and optional item metadata. |
| `forms_update_form` | Update supported form settings such as title, description, response messages, quiz mode, and login/summary flags. |
| `forms_set_accepting_responses` | Open or close a form for responses, optionally setting the closed-form message. |
| `forms_set_response_destination` | Link form responses to a Google Sheets spreadsheet. |
| `forms_remove_response_destination` | Remove the current form response destination. Requires confirmation. |
| `forms_list_items` | List form items with concise item-specific metadata. |
| `forms_add_item` | Add a supported form item type. |
| `forms_update_item` | Update common item fields and supported item-specific fields. |
| `forms_move_item` | Move an item to a new zero-based index. |
| `forms_delete_item` | Delete an item by item ID. Requires confirmation. |
| `forms_list_responses` | List recent form responses with optional capped answer details. |
| `forms_get_response` | Get one response by response ID. |
| `forms_delete_response` | Delete one form response. Requires confirmation. |
| `forms_delete_all_responses` | Delete all responses stored in the form. Requires confirmation. |
| `forms_batch` | Execute up to 20 Forms operations in one round-trip. |

## Examples

Create a form:

```json
{
  "title": "Customer Feedback",
  "description": "Short feedback form for Q3 pilots.",
  "idempotencyKey": "customer-feedback-q3"
}
```

Add a multiple choice item:

```json
{
  "formId": "<form-id>",
  "itemType": "MULTIPLE_CHOICE",
  "title": "How satisfied are you?",
  "choices": ["Very satisfied", "Satisfied", "Neutral", "Unsatisfied"],
  "required": true,
  "idempotencyKey": "satisfaction-question"
}
```

Link responses to a spreadsheet:

```json
{
  "formId": "<form-id>",
  "spreadsheetId": "<spreadsheet-id>"
}
```

Delete all test responses:

```json
{
  "formId": "<form-id>",
  "confirm": true
}
```

## Implementation Notes

- The Apps Script project uses the built-in `FormApp` service, not an Advanced Forms service.
- Supported item types are text, paragraph text, multiple choice, checkbox, list, scale, date, time, section header, and page break.
- Create operations support `idempotencyKey` to avoid duplicate forms or duplicate added items on retry.
- Response destination operations use `FormApp.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheetId)` and require the spreadsheet scope.
- Destination removal, item deletion, and response deletion are classified as `destructive` and require `confirm: true` plus a destructive or admin token.

## Limits & Considerations

- `forms_list_items` returns at most 200 items.
- `forms_list_responses` returns at most 100 responses per request.
- Each response includes at most 100 answers when answer details are requested.
- Choice items support up to 200 choices with 500 characters per choice.
- Batch operations are sequential and non-atomic; inspect per-operation results for partial failures.
- For live validation, create temporary forms with a unique prefix and move them to trash from Drive after probes.
