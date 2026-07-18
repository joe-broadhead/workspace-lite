/**
 * Calendar smoke suite: everything happens on run-created secondary calendars.
 * No guests are ever added; sendUpdates is always 'none'.
 * calendar_respond_to_event has no live-testable positive path without a real
 * invite from another account, so it is exercised as an expected failure.
 */
export const suite = {
  service: 'calendar',
  steps: [
    { tool: 'calendar_create_calendar', params: (c) => ({ summary: `${c.prefix}-cal`, timeZone: 'Etc/UTC' }), save: { key: 'cal', pick: 'data.calendar.id' } },
    { tool: 'calendar_create_calendar', params: (c) => ({ summary: `${c.prefix}-cal2` }), save: { key: 'cal2', pick: 'data.calendar.id' } },
    { tool: 'calendar_list_calendars', params: () => ({}) },
    { tool: 'calendar_get_calendar', params: (c) => ({ calendarId: c.cal }) },
    { tool: 'calendar_update_calendar', params: (c) => ({ calendarId: c.cal, description: 'smoke' }) },
    { tool: 'calendar_update_calendar', params: () => ({ calendarId: 'primary', description: 'refused' }), expect: 'BAD_REQUEST', note: 'primary-calendar guard' },
    { tool: 'calendar_get_colors', params: () => ({}) },
    { tool: 'calendar_list_settings', params: () => ({ maxResults: 3 }) },
    { tool: 'calendar_get_setting', params: () => ({ setting: 'timezone' }) },
    { tool: 'calendar_create_event', params: (c) => ({ calendarId: c.cal, title: `${c.prefix}-ev1`, startTime: '2026-12-07T10:00:00Z', endTime: '2026-12-07T11:00:00Z', sendUpdates: 'none' }), save: { key: 'ev1', pick: 'data.event.id' } },
    { tool: 'calendar_list_events', params: (c) => ({ calendarId: c.cal, timeMin: '2026-12-06T00:00:00Z', timeMax: '2026-12-12T00:00:00Z' }) },
    { tool: 'calendar_get_event', params: (c) => ({ calendarId: c.cal, eventId: c.ev1 }) },
    { tool: 'calendar_update_event', params: (c) => ({ calendarId: c.cal, eventId: c.ev1, title: `${c.prefix}-ev1-renamed`, sendUpdates: 'none' }) },
    { tool: 'calendar_search_events', params: (c) => ({ query: c.prefix, timeMin: '2026-12-06T00:00:00Z', timeMax: '2026-12-12T00:00:00Z' }), note: 'searches default calendar; 0 results acceptable' },
    { tool: 'calendar_set_event_color', params: (c) => ({ calendarId: c.cal, eventId: c.ev1, color: 'PALE_BLUE' }) },
    { tool: 'calendar_quick_add_event', params: (c) => ({ calendarId: c.cal, text: `${c.prefix} quickadd December 8 2026 2pm` }), save: { key: 'quick', pick: 'data.event.id' } },
    { tool: 'calendar_create_event_series', params: (c) => ({ calendarId: c.cal, title: `${c.prefix}-series`, startTime: '2026-12-09T09:00:00Z', endTime: '2026-12-09T09:30:00Z', recurrence: 'DAILY' }), save: { key: 'seriesFull', pick: 'data.seriesId' } },
    { tool: 'calendar_get_event_instances', params: (c) => ({ calendarId: c.cal, eventId: String(c.seriesFull).replace('@google.com', ''), timeMin: '2026-12-09T00:00:00Z', timeMax: '2026-12-12T00:00:00Z' }) },
    { tool: 'calendar_find_freebusy', params: () => ({ timeMin: '2026-12-07T00:00:00Z', timeMax: '2026-12-10T00:00:00Z' }) },
    { tool: 'calendar_move_event', params: (c) => ({ calendarId: c.cal, eventId: c.ev1, destinationCalendarId: c.cal2, sendUpdates: 'none' }), gated: true },
    { tool: 'calendar_respond_to_event', params: (c) => ({ calendarId: c.cal, eventId: c.quick, status: 'YES' }), expect: 'UPDATE_FAILED', note: 'no attendee entry on own event; positive path needs a real invite' },
    { tool: 'calendar_delete_event', params: (c) => ({ calendarId: c.cal, eventId: String(c.seriesFull).replace('@google.com', '') }), gated: true },
    { tool: 'calendar_batch', params: (c) => ({ operations: [
      { action: 'getCalendar', params: { calendarId: c.cal } },
      { action: 'listEvents', params: { calendarId: c.cal, timeMin: '2026-12-06T00:00:00Z', timeMax: '2026-12-12T00:00:00Z' } },
    ] }) },
  ],
  cleanup: [
    { tool: 'calendar_delete_calendar', params: (c) => ({ calendarId: c.cal }), gated: true, skip: (c) => (c.cal ? null : 'no calendar created') },
    { tool: 'calendar_delete_calendar', params: (c) => ({ calendarId: c.cal2 }), gated: true, skip: (c) => (c.cal2 ? null : 'no calendar created') },
  ],
  verify: [
    { tool: 'calendar_list_calendars', params: () => ({}),
      leftovers: (body, c) => JSON.stringify(body.data ?? {}).includes(c.prefix) ? 1 : 0 },
  ],
}
