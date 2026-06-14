# Google Calendar

Create, search, update, and delete calendar events. Check availability across multiple calendars.

## Tools

| Tool Name | Description |
|---|---|
| `calendar_list_calendars` | List all calendars available to the authenticated account. |
| `calendar_get_colors` | Get Calendar API color definitions for calendars and events. |
| `calendar_list_settings` | List Calendar user settings such as timezone. |
| `calendar_get_setting` | Get a single Calendar user setting by ID. |
| `calendar_get_calendar` | Get metadata for a specific calendar by ID. |
| `calendar_create_calendar` | Create a secondary calendar. |
| `calendar_update_calendar` | Update secondary calendar metadata. |
| `calendar_delete_calendar` | Delete a secondary calendar. |
| `calendar_list_events` | List events from a calendar within a time range. |
| `calendar_search_events` | Search events by title or description text across calendars. |
| `calendar_get_event` | Retrieve full details of a single event. |
| `calendar_create_event` | Create a new event with title, start/end times, description, location, and guests. |
| `calendar_update_event` | Update an existing event's fields (partial update). |
| `calendar_move_event` | Move an event from one calendar to another. |
| `calendar_delete_event` | Permanently delete an event. |
| `calendar_find_freebusy` | Find busy slots across calendars to identify available times. |
| `calendar_respond_to_event` | RSVP to an event (YES, NO, MAYBE). |
| `calendar_create_event_series` | Create a recurring event series with RRULE recurrence rules. |
| `calendar_set_event_color` | Set the color of an event (e.g. PALE_BLUE, PALE_GREEN, MAUVE). |
| `calendar_get_event_instances` | Expand recurring events into concrete instances within a time window. |
| `calendar_quick_add_event` | Create an event from a natural language description (e.g. "Lunch with Sarah tomorrow at noon"). |
| `calendar_batch` | Execute up to 20 calendar operations in a single round-trip. |

## Key Features

- **Multi-calendar support** — `list_calendars` surfaces all calendars (primary, secondary, shared, holiday, and subscribed). All event operations accept an optional `calendarId` to target specific calendars.
- **Calendar metadata** — Read color definitions and user settings, including timezone, through Advanced Calendar service methods.
- **Secondary calendar management** — Create, update, and delete secondary calendars. Primary/default calendar deletion is rejected server-side.
- **Meet conference links** — `calendar_create_event` and `calendar_update_event` can set `createMeetLink: true`, which creates Google Meet conference data through the Calendar API event resource.
- **Event moves** — `calendar_move_event` moves events between calendars using the Calendar API, subject to ownership and ACL constraints.
- **Partial field updates** — `update_event` accepts only the fields you want to change; omitted fields remain unchanged.
- **Free/busy lookup** — `find_freebusy` scans across calendars to find open slots, making it easy to schedule without conflicts.
- **Flexible guest management** — `create_event` accepts a comma-separated list of guest emails and automatically sends invitations.
- **Batch operations** — Use `calendar_batch` to chain up to 20 calendar operations in a single round-trip.

## Examples

**List events across the next 7 days on a specific calendar:**

```pseudo
# First, find the calendar
calendar_list_calendars()
// Returns all calendars with IDs

# Then list events on the team calendar
calendar_list_events({
  calendarId: "team@group.calendar.google.com",
  timeMin: "2026-06-13T00:00:00Z",
  timeMax: "2026-06-20T00:00:00Z"
})
```

**Create an event with guests:**

```pseudo
calendar_create_event({
  title: "Sprint Planning",
  startTime: "2026-06-15T10:00:00-07:00",
  endTime: "2026-06-15T11:00:00-07:00",
  description: "Biweekly sprint planning session.",
  location: "Conference Room B",
  guests: "alice@example.com,bob@example.com"
})
// Event created; invitations sent to Alice and Bob
```

**Create an event with a Google Meet link:**

```pseudo
calendar_create_event({
  title: "Design Review",
  startTime: "2026-06-15T10:00:00-07:00",
  endTime: "2026-06-15T11:00:00-07:00",
  createMeetLink: true
})
// Meet link is returned in hangoutLink/conferenceData when Calendar API creates it
```

**Find open slots before scheduling:**

```pseudo
# Check busy times over the next 5 business days
calendar_find_freebusy({
  timeMin: "2026-06-15T00:00:00Z",
  timeMax: "2026-06-20T00:00:00Z"
})
// Returns busy periods; gaps indicate available slots
```

## Limits & Considerations

- Events must have `title`, `startTime`, and `endTime` at minimum. Times should be ISO 8601 strings.
- `delete_event` is permanent — there is no trash/recovery for calendar events.
- `calendar_delete_calendar` only targets secondary calendars and rejects the primary/default calendar. Calendar deletion is permanent and requires confirmation.
- Calendar timezone settings are user-specific. Use `calendar_get_setting({ setting: "timezone" })` to read the account setting; secondary calendars also carry their own `timeZone` field.
- Secondary calendar create/update/delete and event moves require sufficient ownership or ACL permissions. Shared, subscribed, holiday, and primary calendars may reject these operations.
- Meet links are created through Calendar event `conferenceData`; there is no direct Meet API surface in this service.
- `find_freebusy` returns busy periods; determining available slots requires computing the gaps.
- Recurring event instances are listed as separate items; modifying a recurring series requires the recurrence rule from the parent event.
- Calendar IDs for shared/group calendars must be obtained from `list_calendars`; they are not discoverable by name.
- For retry and partial-success behavior of event creation, guest invitation failures, and `idempotencyKey`, see [Mutation Safety](../operations/mutation-safety.md).
