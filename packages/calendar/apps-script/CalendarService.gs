const CalendarService = (() => {
  const ACTION_POLICIES = {
    listCalendars: { class: 'read' },
    getCalendar: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    listEvents: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    searchEvents: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    findFreeBusy: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    getEvent: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    eventInstances: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'primary' }] },
    quickAdd: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'primary' }] },
    createEvent: { class: 'write', recipientParams: ['guests'], allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    updateEvent: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    respondToEvent: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    createEventSeries: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    setEventColor: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    deleteEvent: { class: 'destructive', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    batch: { class: 'read' },
  }

  const BATCH_ACTIONS = {
    listCalendars: true, getCalendar: true, listEvents: true,
    searchEvents: true, getEvent: true, eventInstances: true,
    quickAdd: true, createEvent: true, updateEvent: true,
    respondToEvent: true, createEventSeries: true, setEventColor: true,
    deleteEvent: true, findFreeBusy: true,
  }

  const LIMITS = {
    pageSize: 100,
    pageOffset: 5000,
    listWindowDays: 31,
    searchWindowDays: 31,
    freeBusyWindowDays: 31,
    instanceWindowDays: 31,
    responseBytes: 1000000,
  }

  function handle(action, params) {
    const fn = ACTIONS[action]
    if (!fn) return err('UNKNOWN_ACTION', `Unknown action: ${action}`)
    const policyError = enforceActionPolicy(action, params || {}, ACTION_POLICIES)
    if (policyError) return policyError
    return fn(params || {})
  }

  function requestWeight(action, params) {
    return requestWeightForPolicy(action, params || {}, ACTION_POLICIES)
  }

  function ok(data) {
    const payload = JSON.stringify(data || {});
    if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes);
    return { success: true, data };
  }

  function err(code, message) {
    return { success: false, error: { code, message } };
  }

  function limitExceeded(name, requested, max) {
    return err('LIMIT_EXCEEDED', `${name} limit exceeded: requested ${requested}, max ${max}`);
  }

  // ─── Parameter helpers ───

  // NOTE: throws as implicit output — consider returning err() for testability
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

  function boundedPageSize(params, name, def) {
    const value = Math.floor(optionalNumber(params, name, def));
    if (value < 1) return { error: err('BAD_REQUEST', `${name} must be at least 1`) };
    if (value > LIMITS.pageSize) return { error: limitExceeded(name, value, LIMITS.pageSize) };
    return { value: value };
  }

  function boundedPage(params) {
    const page = Math.floor(optionalNumber(params, 'page', 0));
    if (page < 0) return { error: err('BAD_REQUEST', 'page must be non-negative') };
    return { value: page };
  }

  function boundedDateWindow(timeMin, timeMax, defaultDays, maxDays) {
    const now = Date.now();
    const start = new Date(timeMin || now);
    const end = new Date(timeMax || (now + defaultDays * 24 * 60 * 60 * 1000));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: err('BAD_REQUEST', 'timeMin/timeMax must be valid date strings') };
    if (end.getTime() <= start.getTime()) return { error: err('BAD_REQUEST', 'timeMax must be after timeMin') };
    const requestedDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (requestedDays > maxDays) return { error: limitExceeded('calendar date window days', requestedDays, maxDays) };
    return { start: start, end: end };
  }

  function trap(fn, errorCode, errorMsg) {
    try {
      const result = fn();
      return result && result.success === false ? result : ok(result);
    }
    catch (e) { return err(errorCode, typeof errorMsg === 'function' ? errorMsg(e) : errorMsg); }
  }

  // ─── Calendar helpers ───

  function validateCalendarId(id) {
    if (!/^[a-zA-Z0-9_\-@.]+$/.test(id)) throw new Error(`Invalid calendar ID: ${id}`);
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
      return guests.map(function(g) { return { email: g.getEmail(), status: g.getStatus().toString() }; });
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
    return trap(function() {
      const cals = CalendarApp.getAllCalendars();
      const result = [];
      for (let i = 0; i < cals.length; i++) {
        result.push(calendarToJSON(cals[i]));
      }
      return result;
    }, 'LIST_FAILED', function(e) { return e.message || 'Could not list calendars'; });
  }

  function calendarGet(params) {
    const id = optionalString(params, 'calendarId');
    return trap(function() {
      if (id) {
        const cal = getCalendar(id);
        if (cal) return { calendar: calendarToJSON(cal) };
        throw new Error(`Calendar not found: ${id}`);
      }
      const def = CalendarApp.getDefaultCalendar();
      return { calendar: calendarToJSON(def) };
    }, 'NOT_FOUND', function(e) { return e.message || 'Calendar not found'; });
  }

  function listEvents(params) {
    const calendarId = optionalString(params, 'calendarId');
    const timeMin = optionalString(params, 'timeMin');
    const timeMax = optionalString(params, 'timeMax');
    const maxResultLimit = boundedPageSize(params, 'maxResults', 50);
    if (maxResultLimit.error) return maxResultLimit.error;
    const pageLimit = boundedPage(params);
    if (pageLimit.error) return pageLimit.error;
    const maxResults = maxResultLimit.value;
    const page = pageLimit.value;
    const offset = page * maxResults;
    if (offset > LIMITS.pageOffset) return limitExceeded('calendar list offset', offset, LIMITS.pageOffset);
    const window = boundedDateWindow(timeMin, timeMax, 30, LIMITS.listWindowDays);
    if (window.error) return window.error;

    return trap(function() {
      const cal = resolveCalendar(calendarId);
      const events = cal.getEvents(window.start, window.end, { start: offset, max: maxResults });
      const results = [];

      for (let i = 0; i < events.length; i++) {
        const e = eventToJSON(events[i]);
        e.calendarName = cal.getName();
        results.push(e);
      }

      return {
        events: results,
        nextPageToken: events.length === maxResults ? String(page + 1) : undefined,
        hasMore: events.length === maxResults,
      };
    }, 'LIST_FAILED', function(e) { return e.message || 'Could not list events'; });
  }

  function searchEvents(params) {
    const query = requireParam(params, 'query');
    const calendarId = optionalString(params, 'calendarId');
    const timeMin = optionalString(params, 'timeMin');
    const timeMax = optionalString(params, 'timeMax');
    const maxResultLimit = boundedPageSize(params, 'maxResults', 50);
    if (maxResultLimit.error) return maxResultLimit.error;
    const maxResults = maxResultLimit.value;
    const window = boundedDateWindow(timeMin, timeMax, 30, LIMITS.searchWindowDays);
    if (window.error) return window.error;

    return trap(function() {
      const cal = resolveCalendar(calendarId);
      const events = cal.getEvents(window.start, window.end, { search: query, max: maxResults });
      const results = [];

      for (let i = 0; i < events.length; i++) {
        results.push(eventToJSON(events[i]));
      }

      return {
        events: results,
        hasMore: events.length === maxResults,
      };
    }, 'SEARCH_FAILED', function(e) { return e.message || 'Search failed'; });
  }

  function getEvent(params) {
    const id = requireParam(params, 'eventId');
    const calendarId = optionalString(params, 'calendarId');

    return trap(function() {
      const cal = resolveCalendar(calendarId);
      const event = cal.getEventById(id);
      if (!event) throw new Error(`Event not found: ${id}`);
      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return { event: e };
    }, 'NOT_FOUND', function(e) { return e.message || `Event not found: ${id}`; });
  }

  // ─── EVENT INSTANCES (Advanced Service) ───

  function eventInstances(params) {
    const eventId = requireParam(params, 'eventId');
    const calendarId = optionalString(params, 'calendarId', 'primary');
    const timeMin = optionalString(params, 'timeMin', null);
    const timeMax = optionalString(params, 'timeMax', null);
    const window = boundedDateWindow(timeMin, timeMax, LIMITS.instanceWindowDays, LIMITS.instanceWindowDays);
    if (window.error) return window.error;

    return trap(function() {
      const options = { timeMin: window.start.toISOString(), timeMax: window.end.toISOString(), maxResults: LIMITS.pageSize };
      const result = Calendar.Events.instances(calendarId, eventId, options);
      return { eventId: eventId, calendarId: calendarId, instances: result.items || [] };
    }, 'LIST_FAILED', function(e) { return e.message || 'Could not get event instances'; });
  }

  // ─── QUICK ADD (Advanced Service) ───

  function quickAdd(params) {
    const text = requireParam(params, 'text');
    const calendarId = optionalString(params, 'calendarId', 'primary');

    return trap(function() {
      const event = Calendar.Events.quickAdd(calendarId, text);
      return { event: event };
    }, 'CREATE_FAILED', function(e) { return e.message || 'Could not quick-add event'; });
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

    return trap(function() {
      const cal = resolveCalendar(calendarId);

      const event = cal.createEvent(title, new Date(startTime), new Date(endTime), {
        description: description,
        location: location,
      });

      const addedGuests = [];
      const failedGuests = [];

      if (guests) {
        const emails = guests.split(',').map(function(e) { return e.trim(); }).filter(Boolean);
        for (let i = 0; i < emails.length; i++) {
          try {
            event.addGuest(emails[i]);
            addedGuests.push(emails[i]);
          } catch (_) {
            failedGuests.push(emails[i]);
          }
        }
      }

      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return {
        event: e,
        addedGuests: addedGuests,
        failedGuests: failedGuests,
      };
    }, 'CREATE_FAILED', function(e) { return e.message || 'Could not create event'; });
  }

  function updateEvent(params) {
    const id = requireParam(params, 'eventId');
    const calendarId = optionalString(params, 'calendarId');

    return trap(function() {
      const cal = resolveCalendar(calendarId);

      const event = cal.getEventById(id);
      if (!event) throw new Error(`Event not found: ${id}`);

      if (params.title !== undefined) event.setTitle(String(params.title));
      if (params.description !== undefined) event.setDescription(String(params.description));
      if (params.location !== undefined) event.setLocation(String(params.location));
      if (params.startTime) event.setTime(new Date(requireParam(params, 'startTime')), event.getEndTime());
      if (params.endTime) event.setTime(event.getStartTime(), new Date(requireParam(params, 'endTime')));

      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return { event: e };
    }, 'UPDATE_FAILED', function(e) { return e.message || 'Could not update event'; });
  }

  // ─── DESTRUCTIVE ───

  function deleteEvent(params) {
    const id = requireParam(params, 'eventId');
    const calendarId = optionalString(params, 'calendarId');

    return trap(function() {
      const cal = resolveCalendar(calendarId);

      const event = cal.getEventById(id);
      if (!event) throw new Error(`Event not found: ${id}`);
      event.deleteEvent();
      return { deleted: true, eventId: id };
    }, 'DELETE_FAILED', function(e) { return e.message || 'Could not delete event'; });
  }

  // ─── AVAILABILITY ───

  function findFreeBusy(params) {
    const calendarId = optionalString(params, 'calendarId');
    const timeMin = optionalString(params, 'timeMin', new Date().toISOString());
    const timeMax = optionalString(params, 'timeMax', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
    const window = boundedDateWindow(timeMin, timeMax, 7, LIMITS.freeBusyWindowDays);
    if (window.error) return window.error;

    return trap(function() {
      const cal = resolveCalendar(calendarId);
      const events = cal.getEvents(window.start, window.end, { max: LIMITS.pageSize });
      const slots = [];

      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.YES) {
          slots.push({
            start: toString(ev.getStartTime()),
            end: toString(ev.getEndTime()),
            title: ev.getTitle(),
          });
        }
      }

      return {
        busySlots: slots,
        totalBusy: slots.length,
        range: { from: timeMin, to: timeMax },
      };
    }, 'FREEBUSY_FAILED', function(e) { return e.message || 'Could not check availability'; });
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

    return trap(function() {
      const cal = resolveCalendar(calendarId);
      const event = cal.getEventById(id);
      if (!event) throw new Error(`Event not found: ${id}`);

      event.setMyStatus(guestStatus);
      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return { event: e, status: statusStr.toUpperCase() };
    }, 'UPDATE_FAILED', function(e) { return e.message || 'Could not update RSVP status'; });
  }

  function createEventSeries(params) {
    const title = requireParam(params, 'title');
    const startTime = requireParam(params, 'startTime');
    const endTime = requireParam(params, 'endTime');
    const recurrence = requireParam(params, 'recurrence');
    const calendarId = optionalString(params, 'calendarId');
    const description = optionalString(params, 'description', '');
    const location = optionalString(params, 'location', '');

    return trap(function() {
      const cal = resolveCalendar(calendarId);

      const recBuilder = CalendarApp.newRecurrence();
      const recUpper = recurrence.toUpperCase();
      // implicit time dependency: Date.now()
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

      return {
        seriesId: eventSeries.getId(),
        title: title,
        start: startTime,
        end: endTime,
        recurrence: recurrence,
      };
    }, 'CREATE_FAILED', function(e) { return e.message || 'Could not create event series'; });
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

    return trap(function() {
      const cal = resolveCalendar(calendarId);
      const event = cal.getEventById(id);
      if (!event) throw new Error(`Event not found: ${id}`);

      event.setColor(eventColor);
      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return { event: e, color: color };
    }, 'UPDATE_FAILED', function(e) { return e.message || 'Could not set event color'; });
  }

  // ─── BATCH ───

  function runBatch(params, handleFn) {
    const ops = params.operations;
    if (!Array.isArray(ops) || ops.length === 0) return err('BAD_REQUEST', 'operations must be a non-empty array');
    if (ops.length > 20) return limitExceeded('batch operations', ops.length, 20);
    const results = [];
    let operationWeight = 1;
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const invalid = validateBatchOperation_(op, i, BATCH_ACTIONS);
      if (invalid) { results.push(invalid); continue; }
      operationWeight += actionWeightForPolicy(op.action, ACTION_POLICIES);
      try {
        const result = handleFn(op.action, op.params || {});
        results.push({ index: i, action: op.action, success: result.success, data: result.success ? result.data : undefined, error: result.success ? undefined : result.error });
      } catch(ex) {
        results.push({ index: i, action: op.action, success: false, error: { code: 'INTERNAL_ERROR', message: ex.message || String(ex) }});
      }
    }
    return ok(batchResultData_(results, operationWeight));
  }

  function batch(params) {
    return runBatch(params, handle);
  }

  const ACTIONS = {
    listCalendars, getCalendar: calendarGet, listEvents, searchEvents,
    getEvent, eventInstances, quickAdd, createEvent, updateEvent,
    respondToEvent, createEventSeries, setEventColor, deleteEvent,
    findFreeBusy, batch,
  }

  return { handle: handle, requestWeight: requestWeight };
})();
