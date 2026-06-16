import { formatList, formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  tasksGetTaskSchema,
  tasksGetTasklistSchema,
  tasksListTasklistsSchema,
  tasksListTasksSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerTasksListTools(server: ToolServer) {
  server.tool('tasks_list_tasklists', 'List Google Tasks task lists for the authenticated account.', tasksListTasklistsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('tasklistsList', args)
      if (!result.success) return formatResponse(result)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'task list',
        itemSummary: (item: unknown) => {
          const list = item as Record<string, unknown>
          return `${list.title} (${list.id})${list.updated ? ' updated ' + list.updated : ''}`
        },
        hint: 'Use tasks_get_tasklist with a tasklistId for metadata, or tasks_list_tasks to read tasks.',
      })
    })

  server.tool('tasks_get_tasklist', 'Get one Google Tasks task list by ID.', tasksGetTasklistSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('tasklistsGet', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Task list retrieved.' })
    })

  server.tool('tasks_list_tasks', 'List tasks in a Google Tasks task list.', tasksListTasksSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('tasksList', args)
      if (!result.success) return formatResponse(result)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'task',
        itemSummary: (item: unknown) => {
          const task = item as Record<string, unknown>
          const status = task.status ? ` [${task.status}]` : ''
          const due = task.due ? ` due ${task.due}` : ''
          return `${task.title || '(untitled)'}${status}${due} (${task.id})`
        },
        hint: 'Use tasks_get_task with tasklistId and taskId for full details.',
      })
    })

  server.tool('tasks_get_task', 'Get one task from a Google Tasks task list.', tasksGetTaskSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('tasksGet', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Task retrieved.' })
    })
}
