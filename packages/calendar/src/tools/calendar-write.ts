import { formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerCalendarWriteTools(server: { tool: Function }) {
  server.tool(
    'calendar_create_event',
    'Create a new calendar event. Requires title, startTime, endTime. Optionally set description, location, guests.',
    {
      title: { type: 'string', description: 'Event title.' },
      startTime: { type: 'string', description: 'Start time ISO string (e.g. 2026-06-12T10:00:00).' },
      endTime: { type: 'string', description: 'End time ISO string.' },
      calendarId: { type: 'string', description: 'Calendar ID. Omit for default calendar.' },
      description: { type: 'string', description: 'Event description.' },
      location: { type: 'string', description: 'Event location.' },
      guests: { type: 'string', description: 'Comma-separated email addresses to invite.' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('createEvent', args)
      return formatResponse(result, { summary: 'Event created.' })
    },
  )

  server.tool(
    'calendar_update_event',
    'Update an existing calendar event. Only provided fields are changed.',
    {
      eventId: { type: 'string', description: 'The event ID to update.' },
      calendarId: { type: 'string', description: 'Calendar ID (optional).' },
      title: { type: 'string', description: 'New title (optional).' },
      description: { type: 'string', description: 'New description (optional).' },
      location: { type: 'string', description: 'New location (optional).' },
      startTime: { type: 'string', description: 'New start time ISO string (optional).' },
      endTime: { type: 'string', description: 'New end time ISO string (optional).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('updateEvent', args)
      return formatResponse(result, { summary: 'Event updated.' })
    },
  )

  server.tool(
    'calendar_delete_event',
    'Delete a calendar event permanently.',
    {
      eventId: { type: 'string', description: 'The event ID to delete.' },
      calendarId: { type: 'string', description: 'Calendar ID (optional).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('deleteEvent', args)
      return formatResponse(result, { summary: 'Event deleted.' })
    },
  )
}
