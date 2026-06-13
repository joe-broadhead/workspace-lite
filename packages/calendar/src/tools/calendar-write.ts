import { formatResponse } from '@workspace-lite/shared'
import {
  calendarCreateEventSchema, calendarUpdateEventSchema, calendarDeleteEventSchema,
  calendarRespondEventSchema, calendarCreateEventSeriesSchema, calendarSetEventColorSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerCalendarWriteTools(server: { tool: Function }) {
  server.tool('calendar_create_event', 'Create a new calendar event. Requires title, startTime, endTime (ISO strings).', calendarCreateEventSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('createEvent', args), { summary: 'Event created.' }) })
  server.tool('calendar_update_event', 'Update an existing calendar event. Only provided fields are changed.', calendarUpdateEventSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('updateEvent', args), { summary: 'Event updated.' }) })
  server.tool('calendar_delete_event', 'Delete a calendar event permanently.', calendarDeleteEventSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('deleteEvent', args), { summary: 'Event deleted.' }) })
  server.tool('calendar_respond_to_event', 'RSVP to an event. Set your attendance status to YES, NO, or MAYBE.', calendarRespondEventSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('respondToEvent', args), { summary: 'RSVP updated.' }) })
  server.tool('calendar_create_event_series', 'Create a recurring event series. Recurrence rules follow RRULE format (e.g. "WEEKLY", "EVERY MONDAY", etc). Returns the event series ID.', calendarCreateEventSeriesSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('createEventSeries', args), { summary: 'Event series created.' }) })
  server.tool('calendar_set_event_color', 'Set event color. Color is a string from the CalendarApp.EventColor enum.', calendarSetEventColorSchema,
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('setEventColor', args), { summary: 'Event color set.' }) })
}
