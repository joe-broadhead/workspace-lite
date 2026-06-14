# Google Tasks

Manage Google Tasks task lists and tasks through the Apps Script Advanced Tasks service.

## Tools

| Tool | Description |
|---|---|
| `tasks_list_tasklists` | List Google Tasks task lists for the authenticated account. |
| `tasks_get_tasklist` | Get one task list by ID. |
| `tasks_create_tasklist` | Create a new task list. |
| `tasks_update_tasklist` | Update a task list title. |
| `tasks_delete_tasklist` | Delete a task list. Requires confirmation. |
| `tasks_list_tasks` | List tasks in a task list with optional completion/deleted/hidden filters. |
| `tasks_get_task` | Get one task by ID. |
| `tasks_create_task` | Create a new task, optionally with notes, due date, status, parent, or previous sibling. |
| `tasks_update_task` | Update a task title, notes, due date, or status. |
| `tasks_delete_task` | Delete a task. Requires confirmation. |
| `tasks_move_task` | Move a task within a task list, optionally under a parent or after a previous task. |
| `tasks_clear_completed` | Clear completed tasks from a task list. Requires confirmation. |
| `tasks_batch` | Execute up to 20 Tasks operations in one round-trip. |

## Examples

List task lists:

```json
{
  "maxResults": 20
}
```

Create a task:

```json
{
  "tasklistId": "<tasklist-id>",
  "title": "Follow up with Alex",
  "notes": "Send recap and next steps.",
  "due": "2026-06-18T17:00:00Z",
  "idempotencyKey": "follow-up-alex-2026-06-18"
}
```

Complete a task:

```json
{
  "tasklistId": "<tasklist-id>",
  "taskId": "<task-id>",
  "status": "completed"
}
```

Delete a temporary task list:

```json
{
  "tasklistId": "<tasklist-id>",
  "confirm": true
}
```

## Implementation Notes

- The Apps Script project enables the Advanced Tasks service (`Tasks`, `v1`) and uses the official Tasks API resources: `Tasklists` and `Tasks`.
- Create operations support `idempotencyKey` to avoid duplicate task lists or tasks on retry.
- Delete and clear-completed actions are classified as `destructive` and require `confirm: true` plus a destructive or admin token.
- Google Tasks stores due dates as dates; the proxy accepts ISO/RFC3339 strings and sends normalized timestamps to the API.

## Limits & Considerations

- List calls return at most 100 task lists or tasks per request.
- Task titles are capped at 1,024 characters.
- Task notes are capped at 10,000 characters by the proxy.
- Batch operations are sequential and non-atomic; inspect per-operation results for partial failures.
- For live validation, create temporary task lists/tasks with a unique prefix and delete the temporary task list afterward.
