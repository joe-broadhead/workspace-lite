const CalendarService = (() => {
  function handle(action, params) {
    switch (action) {
      // READ
      case 'listCalendars':    return listCalendars();
      case 'getCalendar':      return calendarGet(params);
      case 'listEvents':       return listEvents(params);
      case 'searchEvents':     return searchEvents(params);
      case 'getEvent':         return getEvent(params);

      // WRITE
      case 'createEvent':      return createEvent(params);
      case 'updateEvent':      return updateEvent(params);
      case 'respondToEvent':   return respondToEvent(params);
      case 'createEventSeries':return createEventSeries(params);
      case 'setEventColor':    return setEventColor(params);

      // DESTRUCTIVE
      case 'deleteEvent':      return deleteEvent(params);

      // AVAILABILITY
      case 'findFreeBusy':     return findFreeBusy(params);

      // BATCH
      case 'batch':            return batch(params);

      default: return err('UNKNOWN_ACTION', `Unknown action: ${action}`);
    }
  }

  function ok(data) {
    return { success: true, data };
  }

  function err(code, message) {
    return { success: false, error: { code, message } };
  }

  // ─── Parameter helpers ───

  function requireParam(params, name) {
    const val = params[name];
    if (val === undefined || val === null) {
      throw new Error(`Missing required parameter: ${name}`);
    }
    if (typeof val === 'string' && !val.trim()) {
      throw new Error(`Missing required parameter: ${name}`);
    }
    return typeof val === 'string' ? val.trim() : val;
  }

  function optionalString(params, name, def) {
    return typeof params[name] === 'string' ? params[name].trim() || def : def;
  }

  function optionalNumber(params, name, def) {
    const val = params[name];
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    if (typeof val === 'string' && !Number.isNaN(Number(val))) return Number(val);
    return def;
  }

  function optionalBool(params, name, def) {
    if (typeof params[name] === 'boolean') return params[name];
    if (params[name] === 'true') return true;
    if (params[name] === 'false') return false;
    return def;
  }

  // ─── Calendar helpers ───

  function validateCalendarId(id) {
    if (!id || typeof id !== 'string') throw new Error(`Invalid calendar ID: ${id}`);
  }

  function getCalendar(id) {
    validateCalendarId(id);
    try { return CalendarApp.getCalendarById(id); } catch (_) { return null; }
  }

  function resolveCalendar(calendarId) {
    if (calendarId) {
      const cal = getCalendar(calendarId);
      if (cal) return cal;
    }
    return CalendarApp.getDefaultCalendar();
  }

  // ─── Value helpers ───

  function toString(val) {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (val.toISOString) return val.toISOString();
    return String(val);
  }

  // ─── Serialization ───

  function eventToJSON(e) {
    const fullId = e.getId();
    return {
      id: fullId.replace(/@.*/, ''), // strip @google.com suffix for UI presentation
      fullId,
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
      calendarName: null,
    };
  }

  function getGuestEmails(e) {
    try {
      const guests = e.getGuestList();
      if (!guests) return [];
      return guests.map(g => ({ email: g.getEmail(), status: g.getStatus().toString() }));
    } catch (_) { return []; }
  }

  function calendarToJSON(cal) {
    return {
      id: cal.getId(),
      name: cal.getName(),
      description: cal.getDescription(),
      color: cal.getColor ? cal.getColor() : null,
      selected: cal.isSelected(),
      hidden: cal.isHidden(),
    };
  }

  // ─── READ ───

  function listCalendars() {
    try {
      const cals = CalendarApp.getAllCalendars();
      const result = [];
      for (const cal of cals) {
        result.push(calendarToJSON(cal));
      }
      return ok(result);
    } catch (e) {
      return err('LIST_FAILED', e.message || 'Could not list calendars');
    }
  }

  function calendarGet(params) {
    const id = optionalString(params, 'calendarId');
    try {
      if (id) {
        const cal = getCalendar(id);
        if (cal) return ok({ calendar: calendarToJSON(cal) });
        return err('NOT_FOUND', `Calendar not found: ${id}`);
      }
      const def = CalendarApp.getDefaultCalendar();
      return ok({ calendar: calendarToJSON(def) });
    } catch (e) {
      return err('NOT_FOUND', e.message || 'Calendar not found');
    }
  }

  function listEvents(params) {
    const calendarId = optionalString(params, 'calendarId');
    const timeMin = optionalString(params, 'timeMin');
    const timeMax = optionalString(params, 'timeMax');
    const maxResults = optionalNumber(params, 'maxResults', 50);
    const page = optionalNumber(params, 'page', 0);

    try {
      const cal = resolveCalendar(calendarId);
      const start = new Date(timeMin || new Date().toISOString());
      const end = new Date(timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

      const events = cal.getEvents(start, end);
      const offset = page * maxResults;
      const limit = Math.min(offset + maxResults, events.length);
      const results = [];

      for (let i = offset; i < limit; i++) {
        const e = eventToJSON(events[i]);
        e.calendarName = cal.getName();
        results.push(e);
      }

      return ok({
        events: results,
        nextPageToken: limit < events.length ? String(page + 1) : undefined,
        hasMore: limit < events.length,
        total: events.length,
      });
    } catch (e) {
      return err('LIST_FAILED', e.message || 'Could not list events');
    }
  }

  function searchEvents(params) {
    const query = requireParam(params, 'query');
    const calendarId = optionalString(params, 'calendarId');
    const timeMin = optionalString(params, 'timeMin');
    const timeMax = optionalString(params, 'timeMax');
    const maxResults = optionalNumber(params, 'maxResults', 50);

    try {
      const cal = resolveCalendar(calendarId);
      const start = new Date(timeMin || new Date().toISOString());
      const end = new Date(timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());
      const events = cal.getEvents(start, end, { search: query });
      const limit = Math.min(maxResults, events.length);
      const results = [];

      for (let i = 0; i < limit; i++) {
        results.push(eventToJSON(events[i]));
      }

      return ok({
        events: results,
        hasMore: limit < events.length,
        total: events.length,
      });
    } catch (e) {
      return err('SEARCH_FAILED', e.message || 'Search failed');
    }
  }

  function getEvent(params) {
    const id = requireParam(params, 'eventId');
    const calendarId = optionalString(params, 'calendarId');

    try {
      const cal = resolveCalendar(calendarId);
      const event = cal.getEventById(id);
      if (!event) return err('NOT_FOUND', `Event not found: ${id}`);
      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return ok({ event: e });
    } catch (e) {
      return err('NOT_FOUND', e.message || `Event not found: ${id}`);
    }
  }

  // ─── WRITE ───

  function createEvent(params) {
    const title = requireParam(params, 'title');
    const startTime = requireParam(params, 'startTime');
    const endTime = requireParam(params, 'endTime');
    const calendarId = optionalString(params, 'calendarId');
    const description = optionalString(params, 'description', '');
    const location = optionalString(params, 'location', '');
    const guests = optionalString(params, 'guests', '');

    try {
      const cal = resolveCalendar(calendarId);

      const event = cal.createEvent(title, new Date(startTime), new Date(endTime), {
        description,
        location,
      });

      const addedGuests = [];
      const failedGuests = [];

      if (guests) {
        const emails = guests.split(',').map(e => e.trim()).filter(Boolean);
        for (const email of emails) {
          try {
            event.addGuest(email);
            addedGuests.push(email);
          } catch (_) {
            failedGuests.push(email);
          }
        }
      }

      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return ok({
        event: e,
        addedGuests,
        failedGuests,
      });
    } catch (e) {
      return err('CREATE_FAILED', e.message || 'Could not create event');
    }
  }

  function updateEvent(params) {
    const id = requireParam(params, 'eventId');
    const calendarId = optionalString(params, 'calendarId');

    try {
      const cal = resolveCalendar(calendarId);

      const event = cal.getEventById(id);
      if (!event) return err('NOT_FOUND', `Event not found: ${id}`);

      if (params.title !== undefined) event.setTitle(String(params.title));
      if (params.description !== undefined) event.setDescription(String(params.description));
      if (params.location !== undefined) event.setLocation(String(params.location));
      if (params.startTime) event.setTime(new Date(requireParam(params, 'startTime')), event.getEndTime());
      if (params.endTime) event.setTime(event.getStartTime(), new Date(requireParam(params, 'endTime')));

      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return ok({ event: e });
    } catch (e) {
      return err('UPDATE_FAILED', e.message || 'Could not update event');
    }
  }

  // ─── DESTRUCTIVE ───

  function deleteEvent(params) {
    const id = requireParam(params, 'eventId');
    const calendarId = optionalString(params, 'calendarId');

    try {
      const cal = resolveCalendar(calendarId);

      const event = cal.getEventById(id);
      if (!event) return err('NOT_FOUND', `Event not found: ${id}`);
      event.deleteEvent();
      return ok({ deleted: true, eventId: id });
    } catch (e) {
      return err('DELETE_FAILED', e.message || 'Could not delete event');
    }
  }

  // ─── AVAILABILITY ───

  function findFreeBusy(params) {
    const calendarId = optionalString(params, 'calendarId');
    const timeMin = optionalString(params, 'timeMin', new Date().toISOString());
    const timeMax = optionalString(params, 'timeMax', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

    try {
      const cal = resolveCalendar(calendarId);
      const events = cal.getEvents(new Date(timeMin), new Date(timeMax));
      const slots = [];

      for (const ev of events) {
        if (ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.YES) {
          slots.push({
            start: toString(ev.getStartTime()),
            end: toString(ev.getEndTime()),
            title: ev.getTitle(),
          });
        }
      }

      return ok({
        busySlots: slots,
        totalBusy: slots.length,
        range: { from: timeMin, to: timeMax },
      });
    } catch (e) {
      return err('FREEBUSY_FAILED', e.message || 'Could not check availability');
    }
  }

  // ─── RSVP / EVENT SERIES / COLOR ───

  function respondToEvent(params) {
    const id = requireParam(params, 'eventId');
    const statusStr = requireParam(params, 'status');
    const calendarId = optionalString(params, 'calendarId');

    const STATUS_MAP = {
      YES: CalendarApp.GuestStatus.YES,
      NO: CalendarApp.GuestStatus.NO,
      MAYBE: CalendarApp.GuestStatus.MAYBE,
    };

    const guestStatus = STATUS_MAP[statusStr.toUpperCase()];
    if (!guestStatus) return err('BAD_REQUEST', `Invalid status: ${statusStr}. Must be YES, NO, or MAYBE.`);

    try {
      const cal = resolveCalendar(calendarId);
      const event = cal.getEventById(id);
      if (!event) return err('NOT_FOUND', `Event not found: ${id}`);

      event.setMyStatus(guestStatus);
      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return ok({ event: e, status: statusStr.toUpperCase() });
    } catch (e) {
      return err('UPDATE_FAILED', e.message || 'Could not update RSVP status');
    }
  }

  function createEventSeries(params) {
    const title = requireParam(params, 'title');
    const startTime = requireParam(params, 'startTime');
    const endTime = requireParam(params, 'endTime');
    const recurrence = requireParam(params, 'recurrence');
    const calendarId = optionalString(params, 'calendarId');
    const description = optionalString(params, 'description', '');
    const location = optionalString(params, 'location', '');

    try {
      const cal = resolveCalendar(calendarId);

      const recBuilder = CalendarApp.newRecurrence();
      const recUpper = recurrence.toUpperCase();
      const until = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      if (recUpper === 'WEEKLY' || recUpper.startsWith('WEEKLY')) {
        recBuilder.addWeeklyRule().onlyOnWeekdays([CalendarApp.Weekday.MONDAY, CalendarApp.Weekday.TUESDAY, CalendarApp.Weekday.WEDNESDAY, CalendarApp.Weekday.THURSDAY, CalendarApp.Weekday.FRIDAY]).until(until);
      } else if (recUpper === 'DAILY' || recUpper.startsWith('DAILY')) {
        recBuilder.addDailyRule().until(until);
      } else if (recUpper === 'MONTHLY' || recUpper.startsWith('MONTHLY')) {
        recBuilder.addMonthlyRule().until(until);
      } else if (recUpper === 'YEARLY' || recUpper.startsWith('YEARLY')) {
        recBuilder.addYearlyRule().until(until);
      } else if (recUpper.startsWith('EVERY ')) {
        const parts = recUpper.replace('EVERY ', '').split(' ');
        const dayName = parts[0];
        const DAY_MAP = {
          SUNDAY: CalendarApp.Weekday.SUNDAY,
          MONDAY: CalendarApp.Weekday.MONDAY,
          TUESDAY: CalendarApp.Weekday.TUESDAY,
          WEDNESDAY: CalendarApp.Weekday.WEDNESDAY,
          THURSDAY: CalendarApp.Weekday.THURSDAY,
          FRIDAY: CalendarApp.Weekday.FRIDAY,
          SATURDAY: CalendarApp.Weekday.SATURDAY,
        };
        const weekday = DAY_MAP[dayName];
        if (weekday) {
          recBuilder.addWeeklyRule().onlyOnWeekday(weekday).until(until);
        } else {
          recBuilder.addWeeklyRule().until(until);
        }
      } else {
        recBuilder.addWeeklyRule().until(until);
      }

      const eventSeries = cal.createEventSeries(title, new Date(startTime), new Date(endTime), recBuilder);

      return ok({
        seriesId: eventSeries.getId(),
        title: title,
        start: startTime,
        end: endTime,
        recurrence: recurrence,
      });
    } catch (e) {
      return err('CREATE_FAILED', e.message || 'Could not create event series');
    }
  }

  function setEventColor(params) {
    const id = requireParam(params, 'eventId');
    const color = requireParam(params, 'color');
    const calendarId = optionalString(params, 'calendarId');

    const COLOR_MAP = {
      PALE_BLUE: CalendarApp.EventColor.PALE_BLUE,
      PALE_GREEN: CalendarApp.EventColor.PALE_GREEN,
      MAUVE: CalendarApp.EventColor.MAUVE,
      PALE_RED: CalendarApp.EventColor.PALE_RED,
      YELLOW: CalendarApp.EventColor.YELLOW,
      ORANGE: CalendarApp.EventColor.ORANGE,
      CYAN: CalendarApp.EventColor.CYAN,
      GRAY: CalendarApp.EventColor.GRAY,
      BLUE: CalendarApp.EventColor.BLUE,
      GREEN: CalendarApp.EventColor.GREEN,
      RED: CalendarApp.EventColor.RED,
    };

    const eventColor = COLOR_MAP[color];
    if (!eventColor) return err('BAD_REQUEST', `Invalid color: ${color}. Must be one of: ${Object.keys(COLOR_MAP).join(', ')}.`);

    try {
      const cal = resolveCalendar(calendarId);
      const event = cal.getEventById(id);
      if (!event) return err('NOT_FOUND', `Event not found: ${id}`);

      event.setColor(eventColor);
      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return ok({ event: e, color: color });
    } catch (e) {
      return err('UPDATE_FAILED', e.message || 'Could not set event color');
    }
  }

  // ─── BATCH ───

  function batch(params) {
    const operations = params.operations;
    if (!Array.isArray(operations) || operations.length === 0) {
      return err('BAD_REQUEST', 'operations must be a non-empty array');
    }
    if (operations.length > 20) return err('BAD_REQUEST', 'Max 20 operations per batch');

    const results = [];
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      if (!op.action) {
        results.push({
          index: i,
          success: false,
          error: { code: 'BAD_REQUEST', message: `Missing action at index ${i}` },
        });
        continue;
      }
      try {
        const result = handle(op.action, op.params || {});
        results.push({
          index: i,
          action: op.action,
          success: result.success,
          data: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error,
        });
      } catch (ex) {
        results.push({
          index: i,
          action: op.action,
          success: false,
          error: { code: 'INTERNAL_ERROR', message: ex.message || String(ex) },
        });
      }
    }
    return ok({ results });
  }

  return { handle };
})();
