var CalendarService = (function() {
  function handle(action, params) {
    switch (action) {
      // READ
      case 'listCalendars':        return listCalendars()
      case 'getCalendar':          return getCalendar(params)
      case 'listEvents':           return listEvents(params)
      case 'searchEvents':         return searchEvents(params)
      case 'getEvent':             return getEvent(params)

      // WRITE
      case 'createEvent':          return createEvent(params)
      case 'updateEvent':          return updateEvent(params)

      // DESTRUCTIVE
      case 'deleteEvent':          return deleteEvent(params)

      // AVAILABILITY
      case 'findFreeBusy':         return findFreeBusy(params)

      default: return err('UNKNOWN_ACTION', 'Unknown action: ' + action)
    }
  }

  function requireParam(params, name) {
    var val = params[name]
    if (typeof val !== 'string' || !val.trim()) throw new Error('Missing required parameter: ' + name)
    return val.trim()
  }

  function optionalString(params, name, def) {
    return typeof params[name] === 'string' ? params[name].trim() || def : def
  }

  function optionalNumber(params, name, def) {
    var val = params[name]
    if (typeof val === 'number' && !isNaN(val)) return val
    if (typeof val === 'string' && !isNaN(Number(val))) return Number(val)
    return def
  }

  function toString(val) {
    if (!val) return null
    if (typeof val === 'string') return val
    if (val.toISOString) return val.toISOString()
    return String(val)
  }

  function eventToJSON(e) {
    return {
      id: e.getId().replace(/@.*/, ''),
      title: e.getTitle(),
      description: e.getDescription(),
      location: e.getLocation(),
      start: toString(e.getStartTime()),
      end: toString(e.getEndTime()),
      isAllDay: e.isAllDayEvent(),
      guests: getGuestEmails(e),
      status: e.getMyStatus ? e.getMyStatus().toString() : null,
      created: toString(e.getDateCreated()),
      updated: toString(e.getLastUpdated()),
      color: e.getColor ? e.getColor() : null,
      calendarId: e.getOriginalCalendarId(),
      calendarName: null
    }
  }

  function getGuestEmails(e) {
    try {
      var guests = e.getGuestList()
      if (!guests) return []
      var result = []
      for (var i = 0; i < guests.length; i++) {
        result.push({ email: guests[i].getEmail(), status: guests[i].getStatus().toString() })
      }
      return result
    } catch(_) { return [] }
  }

  function calendarToJSON(cal) {
    return {
      id: cal.getId(),
      name: cal.getName(),
      description: cal.getDescription(),
      color: cal.getColor ? cal.getColor() : null,
      selected: cal.isSelected(),
      hidden: cal.isHidden()
    }
  }

  // ─── READ ───

  function listCalendars() {
    try {
      var cals = CalendarApp.getAllCalendars()
      var result = []
      for (var i = 0; i < cals.length; i++) {
        result.push(calendarToJSON(cals[i]))
      }
      return ok(result)
    } catch(e) {
      return err('LIST_FAILED', e.message || 'Could not list calendars')
    }
  }

  function getCalendar(params) {
    var id = optionalString(params, 'calendarId')
    try {
      var cals = CalendarApp.getAllCalendars()
      for (var i = 0; i < cals.length; i++) {
        if (cals[i].getId() === id) return ok({ calendar: calendarToJSON(cals[i]) })
      }
      if (!id) {
        var def = CalendarApp.getDefaultCalendar()
        return ok({ calendar: calendarToJSON(def) })
      }
      return err('NOT_FOUND', 'Calendar not found: ' + id)
    } catch(e) {
      return err('NOT_FOUND', e.message || 'Calendar not found')
    }
  }

  function listEvents(params) {
    var calendarId = optionalString(params, 'calendarId')
    var timeMin = optionalString(params, 'timeMin')
    var timeMax = optionalString(params, 'timeMax')
    var maxResults = optionalNumber(params, 'maxResults', 50)
    var page = optionalNumber(params, 'page', 0)

    try {
      var cal
      if (calendarId) {
        var cals = CalendarApp.getAllCalendars()
        cal = null
        for (var i = 0; i < cals.length; i++) {
          if (cals[i].getId() === calendarId) { cal = cals[i]; break }
        }
        if (!cal) {
          try { cal = CalendarApp.getCalendarById(calendarId) } catch(_) {}
        }
      }
      if (!cal) cal = CalendarApp.getDefaultCalendar()

      var start = new Date(timeMin || new Date().toISOString())
      var end = new Date(timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())

      var events = cal.getEvents(start, end)
      var results = []
      var offset = page * maxResults
      var limit = Math.min(offset + maxResults, events.length)

      for (var i = offset; i < limit; i++) {
        var e = eventToJSON(events[i])
        e.calendarName = cal.getName()
        results.push(e)
      }

      return ok(results, {
        nextPageToken: limit < events.length ? String(page + 1) : undefined,
        hasMore: limit < events.length,
        total: events.length
      })
    } catch(e) {
      return err('LIST_FAILED', e.message || 'Could not list events')
    }
  }

  function searchEvents(params) {
    var query = requireParam(params, 'query')
    var timeMin = optionalString(params, 'timeMin')
    var timeMax = optionalString(params, 'timeMax')
    var maxResults = optionalNumber(params, 'maxResults', 50)

    try {
      var start = new Date(timeMin || new Date().toISOString())
      var end = new Date(timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString())
      var events = CalendarApp.getDefaultCalendar().getEvents(start, end, { search: query })
      var results = []
      var limit = Math.min(maxResults, events.length)
      for (var i = 0; i < limit; i++) {
        results.push(eventToJSON(events[i]))
      }
      return ok(results, { hasMore: limit < events.length, total: events.length })
    } catch(e) {
      return err('SEARCH_FAILED', e.message || 'Search failed')
    }
  }

  function getEvent(params) {
    var id = requireParam(params, 'eventId')
    var calendarId = optionalString(params, 'calendarId')
    try {
      var cal
      if (calendarId) {
        try { cal = CalendarApp.getCalendarById(calendarId) } catch(_) {}
      }
      if (!cal) cal = CalendarApp.getDefaultCalendar()

      var event = cal.getEventById(id)
      if (!event) return err('NOT_FOUND', 'Event not found: ' + id)
      var e = eventToJSON(event)
      e.calendarName = cal.getName()
      return ok({ event: e })
    } catch(e) {
      return err('NOT_FOUND', e.message || 'Event not found: ' + id)
    }
  }

  // ─── WRITE ───

  function createEvent(params) {
    var title = requireParam(params, 'title')
    var startTime = requireParam(params, 'startTime')
    var endTime = requireParam(params, 'endTime')
    var calendarId = optionalString(params, 'calendarId')
    var description = optionalString(params, 'description', '')
    var location = optionalString(params, 'location', '')
    var guests = optionalString(params, 'guests', '')

    try {
      var cal
      if (calendarId) {
        try { cal = CalendarApp.getCalendarById(calendarId) } catch(_) {}
      }
      if (!cal) cal = CalendarApp.getDefaultCalendar()

      var event = cal.createEvent(title, new Date(startTime), new Date(endTime), {
        description: description,
        location: location
      })

      if (guests) {
        var emails = guests.split(',').map(function(e) { return e.trim() }).filter(Boolean)
        for (var i = 0; i < emails.length; i++) {
          try { event.addGuest(emails[i]) } catch(_) {}
        }
      }

      var e = eventToJSON(event)
      e.calendarName = cal.getName()
      return ok({ event: e })
    } catch(e) {
      return err('CREATE_FAILED', e.message || 'Could not create event')
    }
  }

  function updateEvent(params) {
    var id = requireParam(params, 'eventId')
    var calendarId = optionalString(params, 'calendarId')

    try {
      var cal
      if (calendarId) {
        try { cal = CalendarApp.getCalendarById(calendarId) } catch(_) {}
      }
      if (!cal) cal = CalendarApp.getDefaultCalendar()

      var event = cal.getEventById(id)
      if (!event) return err('NOT_FOUND', 'Event not found: ' + id)

      if (params.title !== undefined) event.setTitle(String(params.title))
      if (params.description !== undefined) event.setDescription(String(params.description))
      if (params.location !== undefined) event.setLocation(String(params.location))
      if (params.startTime) event.setTime(new Date(requireParam(params, 'startTime')), event.getEndTime())
      if (params.endTime) event.setTime(event.getStartTime(), new Date(requireParam(params, 'endTime')))

      var e = eventToJSON(event)
      e.calendarName = cal.getName()
      return ok({ event: e })
    } catch(e) {
      return err('UPDATE_FAILED', e.message || 'Could not update event')
    }
  }

  // ─── DESTRUCTIVE ───

  function deleteEvent(params) {
    var id = requireParam(params, 'eventId')
    var calendarId = optionalString(params, 'calendarId')

    try {
      var cal
      if (calendarId) {
        try { cal = CalendarApp.getCalendarById(calendarId) } catch(_) {}
      }
      if (!cal) cal = CalendarApp.getDefaultCalendar()

      var event = cal.getEventById(id)
      if (!event) return err('NOT_FOUND', 'Event not found: ' + id)
      event.deleteEvent()
      return ok({ deleted: true, eventId: id })
    } catch(e) {
      return err('DELETE_FAILED', e.message || 'Could not delete event')
    }
  }

  // ─── AVAILABILITY ───

  function findFreeBusy(params) {
    var timeMin = optionalString(params, 'timeMin', new Date().toISOString())
    var timeMax = optionalString(params, 'timeMax', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

    try {
      var cal = CalendarApp.getDefaultCalendar()
      var events = cal.getEvents(new Date(timeMin), new Date(timeMax))
      var slots = []

      for (var i = 0; i < events.length; i++) {
        if (events[i].getMyStatus && events[i].getMyStatus() === CalendarApp.GuestStatus.YES) {
          slots.push({
            start: toString(events[i].getStartTime()),
            end: toString(events[i].getEndTime()),
            title: events[i].getTitle()
          })
        }
      }

      return ok({
        busySlots: slots,
        totalBusy: slots.length,
        range: { from: timeMin, to: timeMax }
      })
    } catch(e) {
      return err('FREEBUSY_FAILED', e.message || 'Could not check availability')
    }
  }

  return { handle: handle }
})()
