import { formatList } from '../../response.js'
import {
  calendarBatchSchema,
  calendarColorsSchema,
  calendarCreateCalendarSchema,
  calendarCreateEventSchema,
  calendarCreateEventSeriesSchema,
  calendarDeleteCalendarSchema,
  calendarDeleteEventSchema,
  calendarEventInstancesSchema,
  calendarFreeBusySchema,
  calendarGetCalendarSchema,
  calendarGetEventSchema,
  calendarListEventsSchema,
  calendarMoveEventSchema,
  calendarQuickAddSchema,
  calendarRespondEventSchema,
  calendarSearchEventsSchema,
  calendarSetEventColorSchema,
  calendarSettingSchema,
  calendarSettingsListSchema,
  calendarUpdateCalendarSchema,
  calendarUpdateEventSchema,
} from '../../schemas.js'
import type { ToolSpec } from '../types.js'

function validateDateOrder(args: Record<string, unknown>) {
  const start = typeof args.startTime === 'string' ? Date.parse(args.startTime) : null
  const end = typeof args.endTime === 'string' ? Date.parse(args.endTime) : null
  if (start !== null && Number.isNaN(start)) throw new Error('startTime must be a valid ISO datetime')
  if (end !== null && Number.isNaN(end)) throw new Error('endTime must be a valid ISO datetime')
  if (start !== null && end !== null && end <= start) throw new Error('endTime must be after startTime')
}

/** calendar service catalog — 22 tools. */
export const calendarTools: ToolSpec[] = [
  {
    name: 'calendar_batch',
    service: 'calendar',
    action: 'batch',
    description: "Execute multiple Calendar operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (listCalendars, getColors, settingsList, settingsGet, getCalendar, listEvents, searchEvents, findFreeBusy, getEvent, eventInstances, quickAdd, createCalendar, updateCalendar, deleteCalendar, createEvent, updateEvent, moveEvent, deleteEvent, respondToEvent, createEventSeries, setEventColor). Operations execute sequentially; errors are collected per-operation. Up to 20 operations.",
    schema: calendarBatchSchema,
    batchEligible: false,
    isBatchTool: true,
    cli: { paramsJsonOnly: true },
    group: 'batch',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'item',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'calendar_create_calendar',
    service: 'calendar',
    action: 'createCalendar',
    description: "Create a secondary calendar. Does not create or modify the primary calendar.",
    schema: calendarCreateCalendarSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Calendar created." },
  },
  {
    name: 'calendar_create_event',
    service: 'calendar',
    action: 'createEvent',
    description: "Create a new calendar event. Requires title, startTime, endTime (ISO strings).",
    schema: calendarCreateEventSchema,
    validate: validateDateOrder,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Event created." },
  },
  {
    name: 'calendar_create_event_series',
    service: 'calendar',
    action: 'createEventSeries',
    description: "Create a recurring event series. Recurrence rules follow RRULE format (e.g. \"WEEKLY\", \"EVERY MONDAY\", etc). Returns the event series ID.",
    schema: calendarCreateEventSeriesSchema,
    validate: validateDateOrder,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Event series created." },
  },
  {
    name: 'calendar_delete_calendar',
    service: 'calendar',
    action: 'deleteCalendar',
    description: "Delete a secondary calendar. Primary/default calendars are rejected server-side. Requires confirmation.",
    schema: calendarDeleteCalendarSchema,
    batchEligible: true,
    group: 'manage',
    formatter: { kind: 'text', summary: "Calendar deleted." },
  },
  {
    name: 'calendar_delete_event',
    service: 'calendar',
    action: 'deleteEvent',
    description: "Delete a calendar event permanently.",
    schema: calendarDeleteEventSchema,
    batchEligible: true,
    group: 'manage',
    formatter: { kind: 'text', summary: "Event deleted." },
  },
  {
    name: 'calendar_find_freebusy',
    service: 'calendar',
    action: 'findFreeBusy',
    description: "Find busy slots in your calendar. Default: next 7 days.",
    schema: calendarFreeBusySchema,
    batchEligible: true,
    group: 'list',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'instance',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'calendar_get_calendar',
    service: 'calendar',
    action: 'getCalendar',
    description: "Get details of a specific calendar.",
    schema: calendarGetCalendarSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text', summary: "Calendar details." },
  },
  {
    name: 'calendar_get_colors',
    service: 'calendar',
    action: 'getColors',
    description: "Get Calendar color definitions for calendars and events from the Calendar API.",
    schema: calendarColorsSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text', summary: "Calendar colors retrieved." },
  },
  {
    name: 'calendar_get_event',
    service: 'calendar',
    action: 'getEvent',
    description: "Get full details of a calendar event.",
    schema: calendarGetEventSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text' },
  },
  {
    name: 'calendar_get_event_instances',
    service: 'calendar',
    action: 'eventInstances',
    description: "Expand recurring events into concrete instances within a time window. Uses the Calendar Advanced Service. Returns an array of event instances.",
    schema: calendarEventInstancesSchema,
    batchEligible: true,
    group: 'read',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'instance',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'calendar_get_setting',
    service: 'calendar',
    action: 'settingsGet',
    description: "Get one Calendar user setting by ID, for example timezone.",
    schema: calendarSettingSchema,
    batchEligible: true,
    group: 'read',
    formatter: { kind: 'text', summary: "Calendar setting retrieved." },
  },
  {
    name: 'calendar_list_calendars',
    service: 'calendar',
    action: 'listCalendars',
    description: "List all calendars available to your account.",
    schema: {},
    batchEligible: true,
    group: 'list',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'event',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'calendar_list_events',
    service: 'calendar',
    action: 'listEvents',
    description: "List events from a calendar within a time range. Default: next 30 days from default calendar.",
    schema: calendarListEventsSchema,
    batchEligible: true,
    group: 'list',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'event',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'calendar_list_settings',
    service: 'calendar',
    action: 'settingsList',
    description: "List Calendar user settings such as timezone, locale, and week start.",
    schema: calendarSettingsListSchema,
    batchEligible: true,
    group: 'list',
    formatter: { kind: 'text', summary: "Calendar settings retrieved." },
  },
  {
    name: 'calendar_move_event',
    service: 'calendar',
    action: 'moveEvent',
    description: "Move an event from one calendar to another using the Calendar API.",
    schema: calendarMoveEventSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Event moved." },
  },
  {
    name: 'calendar_quick_add_event',
    service: 'calendar',
    action: 'quickAdd',
    description: "Create an event from a natural language description using the Calendar Advanced Service (e.g. \"Lunch with Sarah tomorrow at noon\"). Returns the created event.",
    schema: calendarQuickAddSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Event created from natural language." },
  },
  {
    name: 'calendar_respond_to_event',
    service: 'calendar',
    action: 'respondToEvent',
    description: "RSVP to an event. Set your attendance status to YES, NO, or MAYBE.",
    schema: calendarRespondEventSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "RSVP updated." },
  },
  {
    name: 'calendar_search_events',
    service: 'calendar',
    action: 'searchEvents',
    description: "Search events by title/description text query.",
    schema: calendarSearchEventsSchema,
    batchEligible: true,
    group: 'list',
    formatter: {
      kind: 'list',
      formatMcp: (result) => formatList(result, {
        itemsKey: 'items',
        noun: 'result',
        itemSummary: (item: unknown) => {
          const r = item as Record<string, unknown>
          return String(r.title ?? r.name ?? r.id ?? r.summary ?? JSON.stringify(r).slice(0, 120))
        },
      }),
    },
  },
  {
    name: 'calendar_set_event_color',
    service: 'calendar',
    action: 'setEventColor',
    description: "Set event color. Color is a string from the CalendarApp.EventColor enum.",
    schema: calendarSetEventColorSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Event color set." },
  },
  {
    name: 'calendar_update_calendar',
    service: 'calendar',
    action: 'updateCalendar',
    description: "Update secondary calendar metadata such as title, description, location, or timezone.",
    schema: calendarUpdateCalendarSchema,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Calendar updated." },
  },
  {
    name: 'calendar_update_event',
    service: 'calendar',
    action: 'updateEvent',
    description: "Update an existing calendar event. Only provided fields are changed.",
    schema: calendarUpdateEventSchema,
    validate: validateDateOrder,
    batchEligible: true,
    group: 'write',
    formatter: { kind: 'text', summary: "Event updated." },
  },
]
