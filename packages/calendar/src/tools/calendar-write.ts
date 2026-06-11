import { formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerCalendarWriteTools(server: { tool: Function }) {
  server.tool('calendar_create_event', 'Create a new calendar event. Requires title, startTime, endTime (ISO strings).', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('createEvent', args), { summary: 'Event created.' }) })
  server.tool('calendar_update_event', 'Update an existing calendar event. Only provided fields are changed.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('updateEvent', args), { summary: 'Event updated.' }) })
  server.tool('calendar_delete_event', 'Delete a calendar event permanently.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('deleteEvent', args), { summary: 'Event deleted.' }) })
}
