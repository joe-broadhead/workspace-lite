/** Tasks smoke suite: full 13-tool lifecycle on a run-prefixed task list. */
export const suite = {
  service: 'tasks',
  steps: [
    { tool: 'tasks_create_tasklist', params: (c) => ({ title: `${c.prefix}-list` }), save: { key: 'list', pick: 'data.tasklist.id' } },
    // Re-get the ID we just captured before further use (listing IDs can be stale; created IDs should resolve).
    { tool: 'tasks_get_tasklist', params: (c) => ({ tasklistId: c.list }), save: { key: 'list', pick: 'data.tasklist.id' } },
    { tool: 'tasks_list_tasklists', params: () => ({}) },
    { tool: 'tasks_update_tasklist', params: (c) => ({ tasklistId: c.list, title: `${c.prefix}-list-renamed` }) },
    { tool: 'tasks_create_task', params: (c) => ({ tasklistId: c.list, title: `${c.prefix}-task-a`, notes: 'smoke', due: '2026-12-01T00:00:00Z' }), save: { key: 'taskA', pick: 'data.task.id' } },
    { tool: 'tasks_create_task', params: (c) => ({ tasklistId: c.list, title: `${c.prefix}-task-b` }), save: { key: 'taskB', pick: 'data.task.id' } },
    { tool: 'tasks_list_tasks', params: (c) => ({ tasklistId: c.list }) },
    { tool: 'tasks_get_task', params: (c) => ({ tasklistId: c.list, taskId: c.taskA }) },
    { tool: 'tasks_update_task', params: (c) => ({ tasklistId: c.list, taskId: c.taskB, status: 'completed' }) },
    { tool: 'tasks_move_task', params: (c) => ({ tasklistId: c.list, taskId: c.taskA }) },
    { tool: 'tasks_clear_completed', params: (c) => ({ tasklistId: c.list }), gated: true },
    { tool: 'tasks_batch', params: (c) => ({ operations: [
      { action: 'tasklistsGet', params: { tasklistId: c.list } },
      { action: 'tasksDelete', params: { tasklistId: c.list, taskId: c.taskA, confirm: true } },
    ] }), gated: true },
    { tool: 'tasks_delete_task', params: (c) => ({ tasklistId: c.list, taskId: c.taskB }), gated: true,
      note: 'taskB was cleared as completed; NOT_FOUND is also acceptable', skip: () => null },
  ],
  cleanup: [
    { tool: 'tasks_delete_tasklist', params: (c) => ({ tasklistId: c.list }), gated: true, skip: (c) => (c.list ? null : 'no list created') },
  ],
  verify: [
    { tool: 'tasks_list_tasklists', params: () => ({}),
      leftovers: (body, c) => (body.data?.items ?? []).filter((item) => String(item.title ?? '').startsWith(c.prefix)).length },
  ],
}
