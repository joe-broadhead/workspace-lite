import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import { registerTool } from '@workspace-lite/shared/tool-helpers'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  tasksClearCompletedSchema,
  tasksCreateTaskSchema,
  tasksCreateTasklistSchema,
  tasksDeleteTaskSchema,
  tasksDeleteTasklistSchema,
  tasksMoveTaskSchema,
  tasksUpdateTaskSchema,
  tasksUpdateTasklistSchema,
} from '@workspace-lite/shared/schemas'

const client = createProxyClient('tasks')

export function registerTasksWriteTools(server: ToolServer) {
  registerTool(server, client, {
    name: 'tasks_create_tasklist',
    description: 'Create a new Google Tasks task list.',
    schema: tasksCreateTasklistSchema,
    action: 'tasklistsCreate',
    summary: 'Task list created.',
  })
  registerTool(server, client, {
    name: 'tasks_update_tasklist',
    description: 'Update a Google Tasks task list title.',
    schema: tasksUpdateTasklistSchema,
    action: 'tasklistsUpdate',
    summary: 'Task list updated.',
  })
  registerTool(server, client, {
    name: 'tasks_delete_tasklist',
    description: 'Delete a Google Tasks task list. Requires confirmation.',
    schema: tasksDeleteTasklistSchema,
    action: 'tasklistsDelete',
    summary: 'Task list deleted.',
  })
  registerTool(server, client, {
    name: 'tasks_create_task',
    description: 'Create a new task in a Google Tasks task list.',
    schema: tasksCreateTaskSchema,
    action: 'tasksCreate',
    summary: 'Task created.',
  })
  registerTool(server, client, {
    name: 'tasks_update_task',
    description: 'Update a task title, notes, due date, or status.',
    schema: tasksUpdateTaskSchema,
    action: 'tasksUpdate',
    summary: 'Task updated.',
  })
  registerTool(server, client, {
    name: 'tasks_delete_task',
    description: 'Delete a task from a Google Tasks task list. Requires confirmation.',
    schema: tasksDeleteTaskSchema,
    action: 'tasksDelete',
    summary: 'Task deleted.',
  })
  registerTool(server, client, {
    name: 'tasks_move_task',
    description: 'Move a task within a Google Tasks task list, optionally under a parent or after a previous task.',
    schema: tasksMoveTaskSchema,
    action: 'tasksMove',
    summary: 'Task moved.',
  })
  registerTool(server, client, {
    name: 'tasks_clear_completed',
    description: 'Clear completed tasks from a Google Tasks task list. Requires confirmation.',
    schema: tasksClearCompletedSchema,
    action: 'tasksClear',
    summary: 'Completed tasks cleared.',
  })
}
