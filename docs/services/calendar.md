# Google Calendar

Create, search, update, and delete calendar events. Check availability across multiple calendars.

## Tools

| Tool Name | Description |
|---|---|
| `calendar_list_calendars` | List all calendars available to the authenticated account. |
| `calendar_get_calendar` | Get metadata for a specific calendar by ID. |
| `calendar_list_events` | List events from a calendar within a time range. |
| `calendar_search_events` | Search events by title or description text across calendars. |
| `calendar_get_event` | Retrieve full details of a single event. |
| `calendar_create_event` | Create a new event with title, start/end times, description, location, and guests. |
| `calendar_update_event` | Update an existing event's fields (partial update). |
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
- `find_freebusy` returns busy periods; determining available slots requires computing the gaps.
- Recurring event instances are listed as separate items; modifying a recurring series requires the recurrence rule from the parent event.
- Calendar IDs for shared/group calendars must be obtained from `list_calendars`; they are not discoverable by name.
