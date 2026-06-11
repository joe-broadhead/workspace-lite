import { formatList } from '@google-apps-script-mcp/shared'
import { calendarListEventsSchema, calendarSearchEventsSchema, calendarFreeBusySchema } from '@google-apps-script-mcp/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerCalendarListTools(server: { tool: Function }) {
  server.tool('calendar_list_calendars', 'List all calendars available to your account.', {},
    async () => {
      const result = await callProxy('listCalendars')
      const cals = (result.data as Array<Record<string, unknown>>) || []
      return { content: [{ type: 'text' as const, text: 'Calendars:\n\n' + cals.map((c: Record<string, unknown>) => `${c.name} (${c.id})`).join('\n') }] }
    })

  server.tool('calendar_list_events', 'List events from a calendar within a time range. Default: next 30 days from default calendar.', calendarListEventsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('listEvents', args)
      return formatList(result, { itemsKey: 'items', noun: 'event',
        itemSummary: (e: unknown) => { const ev = e as Record<string, unknown>; return `${ev.start} — ${ev.title} (${ev.id}) ${ev.location ? '@ ' + ev.location : ''}` },
        hint: 'Use calendar_get_event with an eventId for full details.' })
    })

  server.tool('calendar_search_events', 'Search events by title/description text query.', calendarSearchEventsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('searchEvents', args)
      return formatList(result, { itemsKey: 'items', noun: 'result',
        itemSummary: (e: unknown) => { const ev = e as Record<string, unknown>; return `${ev.start} — ${ev.title} (${ev.id})` },
        hint: 'Use calendar_get_event for full details.' })
    })

  server.tool('calendar_find_freebusy', 'Find busy slots in your calendar. Default: next 7 days.', calendarFreeBusySchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('findFreeBusy', args)
      const data = result.data as Record<string, unknown>
      const slots = (data.busySlots as Array<Record<string, unknown>>) || []
      const lines = slots.map((s: Record<string, unknown>) => `${s.start} → ${s.end} — ${s.title}`)
      const range = data.range as Record<string,string>
      return { content: [{ type: 'text' as const, text: [`Busy: ${data.totalBusy} (${range?.from} to ${range?.to})`, '', ...lines].join('\n') }] }
    })
}
