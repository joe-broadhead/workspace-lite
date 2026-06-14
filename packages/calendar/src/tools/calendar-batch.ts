import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { calendarBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerCalendarBatchTool(server: ToolServer) {
  server.tool(
    'calendar_batch',
    'Execute multiple Calendar operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (listCalendars, getColors, settingsList, settingsGet, getCalendar, listEvents, searchEvents, findFreeBusy, getEvent, eventInstances, quickAdd, createCalendar, updateCalendar, deleteCalendar, createEvent, updateEvent, moveEvent, deleteEvent, respondToEvent, createEventSeries, setEventColor). Operations execute sequentially; errors are collected per-operation. Up to 20 operations.',
    calendarBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
