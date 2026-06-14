import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import { registerTool } from '@workspace-lite/shared/tool-helpers'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  calendarCreateEventSchema, calendarUpdateEventSchema, calendarDeleteEventSchema,
  calendarRespondEventSchema, calendarCreateEventSeriesSchema, calendarSetEventColorSchema,
} from '@workspace-lite/shared/schemas'

const client = createProxyClient('calendar')

function validateDateOrder(args: Record<string, unknown>) {
  const start = typeof args.startTime === 'string' ? Date.parse(args.startTime) : null
  const end = typeof args.endTime === 'string' ? Date.parse(args.endTime) : null
  if (start !== null && Number.isNaN(start)) throw new Error('startTime must be a valid ISO datetime')
  if (end !== null && Number.isNaN(end)) throw new Error('endTime must be a valid ISO datetime')
  if (start !== null && end !== null && end <= start) throw new Error('endTime must be after startTime')
}

export function registerCalendarWriteTools(server: ToolServer) {
  registerTool(server, client, {
    name: 'calendar_create_event',
    description: 'Create a new calendar event. Requires title, startTime, endTime (ISO strings).',
    schema: calendarCreateEventSchema,
    action: 'createEvent',
    summary: 'Event created.',
    validate: validateDateOrder,
  })
  registerTool(server, client, {
    name: 'calendar_update_event',
    description: 'Update an existing calendar event. Only provided fields are changed.',
    schema: calendarUpdateEventSchema,
    action: 'updateEvent',
    summary: 'Event updated.',
    validate: validateDateOrder,
  })
  registerTool(server, client, {
    name: 'calendar_delete_event',
    description: 'Delete a calendar event permanently.',
    schema: calendarDeleteEventSchema,
    action: 'deleteEvent',
    summary: 'Event deleted.',
  })
  registerTool(server, client, {
    name: 'calendar_respond_to_event',
    description: 'RSVP to an event. Set your attendance status to YES, NO, or MAYBE.',
    schema: calendarRespondEventSchema,
    action: 'respondToEvent',
    summary: 'RSVP updated.',
  })
  registerTool(server, client, {
    name: 'calendar_create_event_series',
    description: 'Create a recurring event series. Recurrence rules follow RRULE format (e.g. "WEEKLY", "EVERY MONDAY", etc). Returns the event series ID.',
    schema: calendarCreateEventSeriesSchema,
    action: 'createEventSeries',
    summary: 'Event series created.',
    validate: validateDateOrder,
  })
  registerTool(server, client, {
    name: 'calendar_set_event_color',
    description: 'Set event color. Color is a string from the CalendarApp.EventColor enum.',
    schema: calendarSetEventColorSchema,
    action: 'setEventColor',
    summary: 'Event color set.',
  })
}
