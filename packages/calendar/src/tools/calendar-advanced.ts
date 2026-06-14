import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import { registerTool } from '@workspace-lite/shared/tool-helpers'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  calendarColorsSchema,
  calendarCreateCalendarSchema,
  calendarDeleteCalendarSchema,
  calendarMoveEventSchema,
  calendarSettingSchema,
  calendarSettingsListSchema,
  calendarUpdateCalendarSchema,
} from '@workspace-lite/shared/schemas'

const client = createProxyClient('calendar')

function requireOneOf(args: Record<string, unknown>, fields: string[], message: string) {
  if (!fields.some((field) => args[field] !== undefined)) throw new Error(message)
}

export function registerCalendarAdvancedTools(server: ToolServer) {
  registerTool(server, client, {
    name: 'calendar_get_colors',
    description: 'Get Calendar color definitions for calendars and events from the Calendar API.',
    schema: calendarColorsSchema,
    action: 'getColors',
    summary: 'Calendar colors retrieved.',
  })

  registerTool(server, client, {
    name: 'calendar_list_settings',
    description: 'List Calendar user settings such as timezone, locale, and week start.',
    schema: calendarSettingsListSchema,
    action: 'settingsList',
    summary: 'Calendar settings retrieved.',
  })

  registerTool(server, client, {
    name: 'calendar_get_setting',
    description: 'Get one Calendar user setting by ID, for example timezone.',
    schema: calendarSettingSchema,
    action: 'settingsGet',
    summary: 'Calendar setting retrieved.',
  })

  registerTool(server, client, {
    name: 'calendar_create_calendar',
    description: 'Create a secondary calendar. Does not create or modify the primary calendar.',
    schema: calendarCreateCalendarSchema,
    action: 'createCalendar',
    summary: 'Calendar created.',
  })

  registerTool(server, client, {
    name: 'calendar_update_calendar',
    description: 'Update secondary calendar metadata such as title, description, location, or timezone.',
    schema: calendarUpdateCalendarSchema,
    action: 'updateCalendar',
    summary: 'Calendar updated.',
    validate: (args) => requireOneOf(args, ['summary', 'description', 'location', 'timeZone'], 'Provide summary, description, location, or timeZone to update a calendar.'),
  })

  registerTool(server, client, {
    name: 'calendar_delete_calendar',
    description: 'Delete a secondary calendar. Primary/default calendars are rejected server-side. Requires confirmation.',
    schema: calendarDeleteCalendarSchema,
    action: 'deleteCalendar',
    summary: 'Calendar deleted.',
  })

  registerTool(server, client, {
    name: 'calendar_move_event',
    description: 'Move an event from one calendar to another using the Calendar API.',
    schema: calendarMoveEventSchema,
    action: 'moveEvent',
    summary: 'Event moved.',
  })
}
