import { formatList, formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerCalendarListTools(server: { tool: Function }) {
  server.tool(
    'calendar_list_calendars',
    'List all calendars available to your account. Returns calendar id, name, description, color.',
    {},
    async () => {
      const result = await callProxy('listCalendars')
      const cals = (result.data as Array<Record<string, unknown>>) || []
      const lines = cals.map((c: Record<string, unknown>) => `${c.name} (${c.id})`)
      return { content: [{ type: 'text' as const, text: `Calendars:\n\n${lines.join('\n')}` }] }
    },
  )

  server.tool(
    'calendar_list_events',
    'List events from a calendar within a time range. Default: next 30 days from default calendar.',
    {
      calendarId: { type: 'string', description: 'Calendar ID. Omit for default calendar.' },
      timeMin: { type: 'string', description: 'Start time ISO string (default: now).' },
      timeMax: { type: 'string', description: 'End time ISO string (default: +30 days).' },
      maxResults: { type: 'number', description: 'Max events (default 50).' },
      page: { type: 'number', description: 'Page number for pagination (0-based).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('listEvents', args)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'event',
        itemSummary: (e: unknown) => {
          const ev = e as Record<string, unknown>
          return `${ev.start} — ${ev.title} (${ev.id}) ${ev.location ? '@ ' + ev.location : ''}`
        },
        hint: 'Use calendar_get_event with an eventId for full details.',
      })
    },
  )

  server.tool(
    'calendar_search_events',
    'Search events by title/description text query.',
    {
      query: { type: 'string', description: 'Text to search for in event titles and descriptions.' },
      timeMin: { type: 'string', description: 'Start time ISO string.' },
      timeMax: { type: 'string', description: 'End time ISO string (default: +90 days).' },
      maxResults: { type: 'number', description: 'Max results (default 50).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('searchEvents', args)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'result',
        itemSummary: (e: unknown) => {
          const ev = e as Record<string, unknown>
          return `${ev.start} — ${ev.title} (${ev.id})`
        },
        hint: 'Use calendar_get_event for full details of a specific event.',
      })
    },
  )

  server.tool(
    'calendar_find_freebusy',
    'Find busy slots in your calendar. Returns list of occupied times so you can find gaps. Default: next 7 days.',
    {
      timeMin: { type: 'string', description: 'Start time ISO string (default: now).' },
      timeMax: { type: 'string', description: 'End time ISO string (default: +7 days).' },
    },
    async (args: Record<string, unknown>) => {
      const result = await callProxy('findFreeBusy', args)
      const data = result.data as Record<string, unknown>
      const slots = (data.busySlots as Array<Record<string, unknown>>) || []
      const lines = slots.map((s: Record<string, unknown>) => `${s.start} → ${s.end} — ${s.title}`)
      const text = [
        `Busy slots: ${data.totalBusy} (${data.range ? (data.range as Record<string,string>).from + ' to ' + (data.range as Record<string,string>).to : ''})`,
        '',
        ...lines,
      ].join('\n')
      return { content: [{ type: 'text' as const, text }] }
    },
  )
}
