const CalendarService = (() => {
  const ACTION_POLICIES = {
    listCalendars: { class: 'read' },
    getColors: { class: 'read' },
    settingsList: { class: 'read' },
    settingsGet: { class: 'read' },
    getCalendar: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    listEvents: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    searchEvents: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    findFreeBusy: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    getEvent: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    eventInstances: { class: 'read', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'primary' }] },
    quickAdd: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'primary' }] },
    createCalendar: { class: 'write' },
    updateCalendar: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'] }] },
    createEvent: { class: 'write', classResolver: calendarNotificationPolicyClass_, recipientParams: ['guests'], allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    updateEvent: { class: 'write', classResolver: calendarNotificationPolicyClass_, requiresKnownRecipients: true, allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    moveEvent: { class: 'write', classResolver: calendarNotificationPolicyClass_, requiresKnownRecipients: true, allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'] }, { property: 'ALLOWED_CALENDAR_IDS', params: ['destinationCalendarId'] }] },
    respondToEvent: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    createEventSeries: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    setEventColor: { class: 'write', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    deleteEvent: { class: 'destructive', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'], defaultValue: 'default' }] },
    deleteCalendar: { class: 'destructive', allowlists: [{ property: 'ALLOWED_CALENDAR_IDS', params: ['calendarId'] }] },
    batch: { class: 'read' },
  }

  const BATCH_ACTIONS = {
    listCalendars: true, getColors: true, settingsList: true,
    settingsGet: true, getCalendar: true, listEvents: true,
    searchEvents: true, getEvent: true, eventInstances: true,
    quickAdd: true, createCalendar: true, updateCalendar: true,
    deleteCalendar: true, createEvent: true, updateEvent: true,
    moveEvent: true, respondToEvent: true, createEventSeries: true,
    setEventColor: true, deleteEvent: true, findFreeBusy: true,
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

  function ok(data, pagination, warnings) {
    const payload = JSON.stringify({ data: data, pagination: pagination, warnings: warnings });
    if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes);
    return { success: true, data: data, pagination: pagination, warnings: warnings };
  }

  function err(code, message, correlationId) {
    return { success: false, error: { code: code, message: message, correlationId: correlationId } };
  }

  function limitExceeded(name, requested, max) {
    return err('LIMIT_EXCEEDED', `${name} limit exceeded: requested ${requested}, max ${max}`);
  }

  function partialOk(data, results, warnings) {
    const response = { success: true, data: data, partial: true, results: results, warnings: warnings };
    const payload = JSON.stringify(response);
    if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes);
    return response;
  }

  function withIdempotency(action, params, fn) {
    const key = optionalString(params || {}, 'idempotencyKey');
    if (!key) return fn();
    if (!/^[a-zA-Z0-9._:-]{1,128}$/.test(key)) return err('BAD_REQUEST', 'idempotencyKey must be 1-128 characters: letters, numbers, dot, underscore, colon, or dash');

    const store = PropertiesService.getScriptProperties();
    const prop = 'IDEMPOTENCY:calendar:' + action + ':' + key;
    const cached = store.getProperty(prop);
    if (cached) {
      try {
        const response = JSON.parse(cached);
        if (response && response.success === true) {
          response.warnings = (response.warnings || []).concat(['Idempotency key replayed; mutation was not repeated.']);
          return response;
        }
      } catch (_) {
        store.deleteProperty(prop);
      }
    }

    const response = fn();
    if (response && response.success === true) {
      const payload = JSON.stringify(response);
      if (payload.length <= 8000) {
        store.setProperty(prop, payload);
      } else {
        response.warnings = (response.warnings || []).concat(['Idempotency result was too large to cache; retry may repeat the mutation.']);
      }
    }
    return response;
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

  function calendarNotificationPolicyClass_(params) {
    const value = optionalString(params || {}, 'sendUpdates', 'none');
    return value === 'all' || value === 'externalOnly' ? 'send' : 'write';
  }

  function parseGuestEmails(guests) {
    const emails = guests ? guests.split(',').map(function(e) { return e.trim(); }).filter(Boolean) : [];
    const invalid = [];
    for (let i = 0; i < emails.length; i++) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emails[i])) invalid.push(emails[i]);
    }
    if (invalid.length > 0) return { error: err('BAD_REQUEST', 'Invalid guest email(s): ' + invalid.join(', ')) };
    return { emails: emails };
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
      return result && typeof result.success === 'boolean' ? result : ok(result);
    }
    catch (e) {
      if (e && e.proxyError) return e.proxyError;
      const correlationId = Utilities.getUuid();
      console.error('[calendar-proxy] correlationId=%s code=%s error=%s', correlationId, errorCode, e && e.message ? e.message : String(e));
      const message = typeof errorMsg === 'string' ? errorMsg : `${errorCode} failed. See Apps Script logs with correlationId ${correlationId}.`;
      return err(errorCode, message, correlationId);
    }
  }

  // ─── Calendar helpers ───

  function proxyError(code, message) {
    const error = new Error(message);
    error.proxyError = err(code, message);
    return error;
  }

  function validateCalendarId(id) {
    if (!/^[a-zA-Z0-9_\-@.]+$/.test(id)) throw proxyError('BAD_REQUEST', `Invalid calendarId: ${id}`);
  }

  function getCalendar(id) {
    validateCalendarId(id);
    try { return CalendarApp.getCalendarById(id); } catch (_) { return null; }
  }

  function resolveCalendar(calendarId) {
    if (!calendarId) return CalendarApp.getDefaultCalendar();
    const cal = getCalendar(calendarId);
    if (cal) return cal;
    throw proxyError('NOT_FOUND', `Calendar not found: ${calendarId}`);
  }

  function parseDateTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: err('BAD_REQUEST', 'startTime and endTime must be valid ISO datetime strings') };
    if (end.getTime() <= start.getTime()) return { error: err('BAD_REQUEST', 'endTime must be after startTime') };
    return { start: start, end: end };
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

  function calendarResourceToJSON(cal) {
    if (!cal) return null;
    return {
      id: cal.id || null,
      summary: cal.summary || null,
      description: cal.description || null,
      location: cal.location || null,
      timeZone: cal.timeZone || null,
      conferenceProperties: cal.conferenceProperties || undefined,
    };
  }

  function eventResourceToJSON(event) {
    if (!event) return null;
    return {
      id: event.id || null,
      title: event.summary || null,
      description: event.description || null,
      location: event.location || null,
      start: event.start ? (event.start.dateTime || event.start.date || null) : null,
      end: event.end ? (event.end.dateTime || event.end.date || null) : null,
      htmlLink: event.htmlLink || null,
      hangoutLink: event.hangoutLink || null,
      conferenceData: event.conferenceData || undefined,
      guests: event.attendees || [],
      status: event.status || null,
      created: event.created || null,
      updated: event.updated || null,
      calendarId: event.organizer ? (event.organizer.email || null) : null,
    };
  }

  function eventIdForApi(id) {
    return String(id).replace(/@.*/, '');
  }

  function advancedEventGet(calendarId, id) {
    try {
      return Calendar.Events.get(calendarId || 'primary', eventIdForApi(id), { conferenceDataVersion: 1 });
    } catch (_) {
      return null;
    }
  }

  function buildAdvancedEventResource(params, dateRange, guestList) {
    const resource = {};
    if (params.title !== undefined) resource.summary = String(params.title);
    if (params.description !== undefined) resource.description = String(params.description);
    if (params.location !== undefined) resource.location = String(params.location);
    if (dateRange) {
      resource.start = { dateTime: dateRange.start.toISOString() };
      resource.end = { dateTime: dateRange.end.toISOString() };
    }
    if (guestList && guestList.emails && guestList.emails.length > 0) {
      resource.attendees = guestList.emails.map(function(email) { return { email: email }; });
    }
    if (optionalBool(params, 'createMeetLink', false)) {
      resource.conferenceData = {
        createRequest: {
          requestId: optionalString(params, 'idempotencyKey', Utilities.getUuid()).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }
    return resource;
  }

  function calendarSendUpdates(params, def) {
    const value = optionalString(params || {}, 'sendUpdates', def || 'none');
    if (value !== 'all' && value !== 'externalOnly' && value !== 'none') {
      return { error: err('BAD_REQUEST', 'sendUpdates must be all, externalOnly, or none') };
    }
    return { value: value };
  }

  function advancedEventOptionalArgs(params, sendUpdates) {
    return {
      conferenceDataVersion: optionalBool(params, 'createMeetLink', false) ? 1 : 0,
      sendUpdates: sendUpdates || 'none',
    };
  }

  function ensureNotPrimaryCalendar(calendarId, action) {
    const verb = action || 'delete';
    if (!calendarId || calendarId === 'primary') return err('BAD_REQUEST', `Refusing to ${verb} the primary/default calendar. Provide a secondary calendarId.`);
    const def = CalendarApp.getDefaultCalendar();
    if (def && def.getId && def.getId() === calendarId) return err('BAD_REQUEST', `Refusing to ${verb} the primary/default calendar. Provide a secondary calendarId.`);
    return null;
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

  function getColors() {
    return trap(function() {
      return { colors: Calendar.Colors.get() };
    }, 'COLORS_FAILED', function(e) { return e.message || 'Could not get calendar colors'; });
  }

  function settingsList(params) {
    return trap(function() {
      const pageSizeLimit = boundedPageSize(params, 'maxResults', 100);
      if (pageSizeLimit.error) return pageSizeLimit.error;
      const result = Calendar.Settings.list({ maxResults: pageSizeLimit.value, pageToken: optionalString(params, 'pageToken') });
      return ok({ items: result.items || [] }, { nextPageToken: result.nextPageToken, hasMore: !!result.nextPageToken });
    }, 'SETTINGS_FAILED', function(e) { return e.message || 'Could not list Calendar settings'; });
  }

  function settingsGet(params) {
    const setting = requireParam(params, 'setting');
    return trap(function() {
      return { setting: Calendar.Settings.get(setting) };
    }, 'SETTING_FAILED', function(e) { return e.message || `Could not get Calendar setting: ${setting}`; });
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

      return ok({ items: results }, {
        nextPageToken: events.length === maxResults ? String(page + 1) : undefined,
        hasMore: events.length === maxResults,
      });
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

      return ok({ items: results }, { hasMore: events.length === maxResults });
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
      const advanced = advancedEventGet(calendarId || 'primary', id);
      if (advanced) {
        e.htmlLink = advanced.htmlLink || null;
        e.hangoutLink = advanced.hangoutLink || null;
        e.conferenceData = advanced.conferenceData || undefined;
      }
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
      return ok(
        { eventId: eventId, calendarId: calendarId, items: result.items || [] },
        { nextPageToken: result.nextPageToken, hasMore: !!result.nextPageToken },
      );
    }, 'LIST_FAILED', function(e) { return e.message || 'Could not get event instances'; });
  }

  // ─── QUICK ADD (Advanced Service) ───

  function quickAdd(params) {
    const text = requireParam(params, 'text');
    const calendarId = optionalString(params, 'calendarId', 'primary');

    return withIdempotency('quickAdd', params, function() { return trap(function() {
      const event = Calendar.Events.quickAdd(calendarId, text);
      return { event: event };
    }, 'CREATE_FAILED', function(e) { return e.message || 'Could not quick-add event'; }); });
  }

  // ─── WRITE ───

  function createCalendar(params) {
    const summary = requireParam(params, 'summary');
    return withIdempotency('createCalendar', params, function() { return trap(function() {
      const resource = { summary: summary };
      if (params.description !== undefined) resource.description = String(params.description);
      if (params.location !== undefined) resource.location = String(params.location);
      if (params.timeZone !== undefined) resource.timeZone = String(params.timeZone);
      const calendar = Calendar.Calendars.insert(resource);
      return { calendar: calendarResourceToJSON(calendar) };
    }, 'CREATE_FAILED', function(e) { return e.message || 'Could not create calendar'; }); });
  }

  function updateCalendar(params) {
    const calendarId = requireParam(params, 'calendarId');
    validateCalendarId(calendarId);
    const primaryError = ensureNotPrimaryCalendar(calendarId, 'update');
    if (primaryError) return primaryError;
    return trap(function() {
      const patch = {};
      if (params.summary !== undefined) patch.summary = String(params.summary);
      if (params.description !== undefined) patch.description = String(params.description);
      if (params.location !== undefined) patch.location = String(params.location);
      if (params.timeZone !== undefined) patch.timeZone = String(params.timeZone);
      if (Object.keys(patch).length === 0) return err('BAD_REQUEST', 'Provide summary, description, location, or timeZone to update a calendar.');
      const calendar = Calendar.Calendars.patch(patch, calendarId);
      return { calendar: calendarResourceToJSON(calendar) };
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not update calendar: ${calendarId}`; });
  }

  function deleteCalendar(params) {
    const calendarId = requireParam(params, 'calendarId');
    validateCalendarId(calendarId);
    const primaryError = ensureNotPrimaryCalendar(calendarId);
    if (primaryError) return primaryError;
    return trap(function() {
      Calendar.Calendars.remove(calendarId);
      return { deleted: true, calendarId: calendarId };
    }, 'DELETE_FAILED', function(e) { return e.message || `Could not delete calendar: ${calendarId}`; });
  }

  function createEvent(params) {
    const title = requireParam(params, 'title');
    const startTime = requireParam(params, 'startTime');
    const endTime = requireParam(params, 'endTime');
    const calendarId = optionalString(params, 'calendarId');
    const description = optionalString(params, 'description', '');
    const location = optionalString(params, 'location', '');
    const guests = optionalString(params, 'guests', '');
    const guestList = parseGuestEmails(guests);
    if (guestList.error) return guestList.error;
    const dateRange = parseDateTimeRange(startTime, endTime);
    if (dateRange.error) return dateRange.error;
    const sendUpdates = calendarSendUpdates(params, 'none');
    if (sendUpdates.error) return sendUpdates.error;

    return withIdempotency('createEvent', params, function() { return trap(function() {
      if (optionalBool(params, 'createMeetLink', false) || guestList.emails.length > 0 || sendUpdates.value !== 'none') {
        const targetCalendarId = calendarId || 'primary';
        const resource = buildAdvancedEventResource({ ...params, title: title, description: description, location: location }, dateRange, guestList);
        const event = Calendar.Events.insert(resource, targetCalendarId, advancedEventOptionalArgs(params, sendUpdates.value));
        return { event: eventResourceToJSON(event), addedGuests: guestList.emails, failedGuests: [] };
      }

      const cal = resolveCalendar(calendarId);

      const event = cal.createEvent(title, dateRange.start, dateRange.end, {
        description: description,
        location: location,
      });

      const addedGuests = [];
      const failedGuests = [];

      if (guestList.emails.length > 0) {
        for (let i = 0; i < guestList.emails.length; i++) {
          try {
            event.addGuest(guestList.emails[i]);
            addedGuests.push(guestList.emails[i]);
          } catch (_) {
            failedGuests.push(guestList.emails[i]);
          }
        }
      }

      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      const data = {
        event: e,
        addedGuests: addedGuests,
        failedGuests: failedGuests,
      };
      if (failedGuests.length > 0) {
        return partialOk(
          data,
          [{ action: 'addGuests', success: false, error: { code: 'GUEST_ADD_FAILED', message: 'Event was created, but one or more guests could not be added.' }, data: { eventId: e.id, failedGuests: failedGuests, addedGuests: addedGuests } }],
          ['Event was created; retry with the same idempotencyKey will not create a duplicate event.'],
        );
      }
      return data;
    }, 'CREATE_FAILED', function(e) { return e.message || 'Could not create event'; }); });
  }

  function updateEvent(params) {
    const id = requireParam(params, 'eventId');
    const calendarId = optionalString(params, 'calendarId');
    const sendUpdates = calendarSendUpdates(params, 'none');
    if (sendUpdates.error) return sendUpdates.error;

    return trap(function() {
      if (optionalBool(params, 'createMeetLink', false) || params.sendUpdates !== undefined) {
        const targetCalendarId = calendarId || 'primary';
        let dateRange = null;
        if (params.startTime || params.endTime) {
          const existing = Calendar.Events.get(targetCalendarId, eventIdForApi(id));
          const nextStart = params.startTime || (existing.start && (existing.start.dateTime || existing.start.date));
          const nextEnd = params.endTime || (existing.end && (existing.end.dateTime || existing.end.date));
          dateRange = parseDateTimeRange(nextStart, nextEnd);
          if (dateRange.error) return dateRange.error;
        }
        const resource = buildAdvancedEventResource(params, dateRange, null);
        const event = Calendar.Events.patch(resource, targetCalendarId, eventIdForApi(id), advancedEventOptionalArgs(params, sendUpdates.value));
        return { event: eventResourceToJSON(event) };
      }

      const cal = resolveCalendar(calendarId);

      const event = cal.getEventById(id);
      if (!event) throw new Error(`Event not found: ${id}`);

      if (params.title !== undefined) event.setTitle(String(params.title));
      if (params.description !== undefined) event.setDescription(String(params.description));
      if (params.location !== undefined) event.setLocation(String(params.location));
      const nextStart = params.startTime ? new Date(requireParam(params, 'startTime')) : event.getStartTime();
      const nextEnd = params.endTime ? new Date(requireParam(params, 'endTime')) : event.getEndTime();
      if (params.startTime || params.endTime) {
        if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) return err('BAD_REQUEST', 'startTime and endTime must be valid ISO datetime strings');
        if (nextEnd.getTime() <= nextStart.getTime()) return err('BAD_REQUEST', 'endTime must be after startTime');
        event.setTime(nextStart, nextEnd);
      }

      const e = eventToJSON(event);
      e.calendarName = cal.getName();
      return { event: e };
    }, 'UPDATE_FAILED', function(e) { return e.message || 'Could not update event'; });
  }

  function moveEvent(params) {
    const id = requireParam(params, 'eventId');
    const calendarId = requireParam(params, 'calendarId');
    const destinationCalendarId = requireParam(params, 'destinationCalendarId');
    validateCalendarId(calendarId);
    validateCalendarId(destinationCalendarId);
    const sendUpdates = calendarSendUpdates(params, 'none');
    if (sendUpdates.error) return sendUpdates.error;

    return trap(function() {
      const event = Calendar.Events.move(calendarId, eventIdForApi(id), destinationCalendarId, { sendUpdates: sendUpdates.value });
      return { event: eventResourceToJSON(event), sourceCalendarId: calendarId, destinationCalendarId: destinationCalendarId };
    }, 'MOVE_FAILED', function(e) { return e.message || 'Could not move event'; });
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
    const dateRange = parseDateTimeRange(startTime, endTime);
    if (dateRange.error) return dateRange.error;

    return withIdempotency('createEventSeries', params, function() { return trap(function() {
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

      const eventSeries = cal.createEventSeries(title, dateRange.start, dateRange.end, recBuilder);

      return {
        seriesId: eventSeries.getId(),
        title: title,
        start: startTime,
        end: endTime,
        recurrence: recurrence,
      };
    }, 'CREATE_FAILED', function(e) { return e.message || 'Could not create event series'; }); });
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
      operationWeight += actionWeightForPolicy(op.action, ACTION_POLICIES, op.params || {});
      try {
        const result = handleFn(op.action, op.params || {});
        results.push({ index: i, action: op.action, success: result.success, data: result.success ? result.data : undefined, error: result.success ? undefined : result.error });
      } catch(ex) {
        const correlationId = Utilities.getUuid();
        console.error('[calendar-proxy] correlationId=%s batchAction=%s error=%s', correlationId, op.action, ex && ex.message ? ex.message : String(ex));
        results.push({ index: i, action: op.action, success: false, error: { code: 'INTERNAL_ERROR', message: 'Batch operation failed. See Apps Script logs with correlationId ' + correlationId + '.', correlationId: correlationId }});
      }
    }
    const response = batchResponse_(results, operationWeight);
    const payload = JSON.stringify(response);
    if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes);
    return response;
  }

  function batch(params) {
    return runBatch(params, handle);
  }

  const ACTIONS = {
    listCalendars, getColors, settingsList, settingsGet,
    getCalendar: calendarGet, listEvents, searchEvents,
    getEvent, eventInstances, quickAdd, createCalendar, updateCalendar,
    deleteCalendar, createEvent, updateEvent, moveEvent,
    respondToEvent, createEventSeries, setEventColor, deleteEvent,
    findFreeBusy, batch,
  }

  return { handle: handle, requestWeight: requestWeight };
})();
