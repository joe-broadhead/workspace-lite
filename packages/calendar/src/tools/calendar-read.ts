import { formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerCalendarReadTools(server: { tool: Function }) {
  server.tool(
    'calendar_get_event',
    'Get full details of a calendar event. Returns title, description, location, start, end, guests, status.',
    {
      eventId: { type: 'string', description: 'The calendar event ID (from calendar_list_events).' },
      calendarId: { type: 'string', description: 'Calendar ID (optional).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('getEvent', args)
      const ev = (result.data as Record<string, unknown>)?.event as Record<string, unknown>
      const guests = (ev?.guests as Array<Record<string, string>>) || []
      return {
        content: [{
          type: 'text' as const,
          text: [
            `Title: ${ev?.title}`,
            `When: ${ev?.start} → ${ev?.end}`,
            ev?.location ? `Where: ${ev.location}` : '',
            ev?.isAllDay ? '(All day)' : '',
            `Status: ${ev?.status}`,
            ev?.description ? `\nDescription:\n${ev.description}` : '',
            guests.length ? `\nGuests:\n${guests.map(g => `  ${g.email} — ${g.status}`).join('\n')}` : '',
          ].filter(Boolean).join('\n'),
        }],
      }
    },
  )

  server.tool(
    'calendar_get_calendar',
    'Get details of a specific calendar.',
    {
      calendarId: { type: 'string', description: 'Calendar ID (optional, default calendar if omitted).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('getCalendar', args)
      return formatResponse(result, { summary: 'Calendar details retrieved.' })
    },
  )
}
