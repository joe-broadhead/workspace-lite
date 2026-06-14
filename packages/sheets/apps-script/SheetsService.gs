const SheetsService = (() => {
  const BORDER_STYLE_MAP = {
    SOLID: SpreadsheetApp.BorderStyle.SOLID,
    DOTTED: SpreadsheetApp.BorderStyle.DOTTED,
    DASHED: SpreadsheetApp.BorderStyle.DASHED,
    DOUBLE: SpreadsheetApp.BorderStyle.DOUBLE
  };

  const CHART_TYPE_MAP = {
    AREA: Charts.ChartType.AREA, BAR: Charts.ChartType.BAR, COLUMN: Charts.ChartType.COLUMN,
    COMBO: Charts.ChartType.COMBO, HISTOGRAM: Charts.ChartType.HISTOGRAM,
    LINE: Charts.ChartType.LINE, PIE: Charts.ChartType.PIE, SCATTER: Charts.ChartType.SCATTER,
    TABLE: Charts.ChartType.TABLE, TIMELINE: Charts.ChartType.TIMELINE, WATERFALL: Charts.ChartType.WATERFALL
  };

  const LEGEND_POSITION_MAP = {
    BOTTOM: 'bottom', TOP: 'top', LEFT: 'left', RIGHT: 'right', NONE: 'none', LABELED: 'labeled'
  };

  const ACTION_POLICIES = {
    spreadsheetGet: { class: 'read', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rangeRead: { class: 'read', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rangeGetFormulas: { class: 'read', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rangeGetNotes: { class: 'read', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    valuesBatchGet: { class: 'read', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    textFind: { class: 'read', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    protectionsList: { class: 'read', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    conditionalFormatGet: { class: 'read', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    spreadsheetCreate: { class: 'write' },
    sheetAdd: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    sheetRename: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    sheetCopy: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId', 'destSpreadsheetId'] }] },
    rangeWrite: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rowsAppend: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rangeFormat: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rangeMerge: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rangeUnmerge: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    columnWidth: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    freezeRows: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rangeSort: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    formulaSet: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    chartCreate: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    noteSet: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    dataValidationSet: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rowsInsert: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    textReplace: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rangeProtect: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    sheetProtect: { class: 'write', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    sheetDelete: { class: 'destructive', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rangeClear: { class: 'destructive', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    rowsDelete: { class: 'destructive', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    protectionRemove: { class: 'destructive', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
    batch: { class: 'read', allowlists: [{ property: 'ALLOWED_SPREADSHEET_IDS', params: ['spreadsheetId'] }] },
  }

  const BATCH_ACTIONS = {
    spreadsheetGet: true, sheetAdd: true, sheetDelete: true,
    sheetRename: true, sheetCopy: true, rangeRead: true,
    rangeWrite: true, rowsAppend: true, rangeClear: true,
    rangeGetFormulas: true, rangeGetNotes: true, valuesBatchGet: true,
    rangeFormat: true, rangeMerge: true, rangeUnmerge: true,
    columnWidth: true, freezeRows: true, rangeSort: true,
    formulaSet: true, chartCreate: true, noteSet: true,
    conditionalFormatGet: true, dataValidationSet: true,
    rowsInsert: true, rowsDelete: true, textFind: true,
    textReplace: true, protectionsList: true, rangeProtect: true,
    sheetProtect: true, protectionRemove: true,
  }

  const LIMITS = {
    readCells: 10000,
    writeCells: 10000,
    batchRanges: 10,
    responseBytes: 1000000,
    rowsMutated: 5000,
  }

  function parseCellReference(cellRef) {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { col: 1, row: 1 };
    let col = 0;
    for (const ch of match[1]) {
      col = col * 26 + (ch.charCodeAt(0) - 64);
    }
    return { col: col, row: parseInt(match[2], 10) };
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

  function validateA1Range(rangeStr, name) {
    const text = String(rangeStr || '').trim();
    if (!text) return err('BAD_REQUEST', `${name} must be a non-empty A1 range`);
    if (text.length > 200) return err('BAD_REQUEST', `${name} is too long`);
    const sheetPrefix = "(?:'[^']+'|[A-Za-z0-9_ .-]+)!";
    const cell = '\\$?[A-Z]{1,3}\\$?\\d{1,7}';
    const row = '\\d{1,7}';
    const col = '\\$?[A-Z]{1,3}';
    const pattern = new RegExp('^(?:' + sheetPrefix + ')?(?:' + cell + '(?::' + cell + ')?|' + col + ':' + col + '|' + row + ':' + row + ')$');
    if (!pattern.test(text)) return err('BAD_REQUEST', `${name} must be valid A1 notation`);
    return null;
  }

  function validateFiniteNumber(value, name, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return { error: err('BAD_REQUEST', `${name} must be a finite number`) };
    if (min !== undefined && number < min) return { error: err('BAD_REQUEST', `${name} must be at least ${min}`) };
    if (max !== undefined && number > max) return { error: err('BAD_REQUEST', `${name} must be at most ${max}`) };
    return { value: number };
  }

  function validateCssColor(value, name) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    if (/^#[0-9a-fA-F]{3,8}$/.test(text)) return null;
    if (/^[a-zA-Z]{1,32}$/.test(text)) return null;
    return err('BAD_REQUEST', `${name} must be a named color or hex color`);
  }

  function formulaInjectionError(values, action) {
    for (let i = 0; i < values.length; i++) {
      const row = Array.isArray(values[i]) ? values[i] : [];
      for (let j = 0; j < row.length; j++) {
        if (typeof row[j] === 'string' && /^[=+\-@]/.test(row[j].trim())) {
          return err('BAD_REQUEST', `${action} values cannot start with formula metacharacters. Use sheets_set_formula for formulas.`);
        }
      }
    }
    return null;
  }

  function trap(fn, errorCode, errorMsg) {
    try {
      const result = fn();
      return result && typeof result.success === 'boolean' ? result : ok(result);
    }
    catch (e) {
      const correlationId = Utilities.getUuid();
      console.error('[sheets-proxy] correlationId=%s code=%s error=%s', correlationId, errorCode, e && e.message ? e.message : String(e));
      const message = typeof errorMsg === 'string' ? errorMsg : `${errorCode} failed. See Apps Script logs with correlationId ${correlationId}.`;
      return err(errorCode, message, correlationId);
    }
  }

  function runBatch(handle) {
    return function batch(params) {
      const spreadsheetId = requireParam(params, 'spreadsheetId')
      const operations = params.operations;
      if (!Array.isArray(operations) || operations.length === 0) {
        return err('BAD_REQUEST', 'operations must be a non-empty array');
      }
      if (operations.length > 20) return limitExceeded('batch operations', operations.length, 20);

      const results = [];
      let operationWeight = 1;
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        const invalid = validateBatchOperation_(op, i, BATCH_ACTIONS);
        if (invalid) { results.push(invalid); continue; }
        operationWeight += actionWeightForPolicy(op.action, ACTION_POLICIES);
        const opParams = op.params || {}
        if (!opParams.spreadsheetId) opParams.spreadsheetId = spreadsheetId
        try {
          const result = handle(op.action, opParams);
          results.push({ index: i, action: op.action, success: result.success, data: result.success ? result.data : undefined, error: result.success ? undefined : result.error });
        } catch(ex) {
          const correlationId = Utilities.getUuid();
          console.error('[sheets-proxy] correlationId=%s batchAction=%s error=%s', correlationId, op.action, ex && ex.message ? ex.message : String(ex));
          results.push({ index: i, action: op.action, success: false, error: { code: 'INTERNAL_ERROR', message: 'Batch operation failed. See Apps Script logs with correlationId ' + correlationId + '.', correlationId: correlationId }});
        }
      }
      const response = batchResponse_(results, operationWeight);
      const payload = JSON.stringify(response);
      if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes);
      return response;
    };
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
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
    return def;
  }

  function optionalBool(params, name, def) {
    if (typeof params[name] === 'boolean') return params[name];
    if (params[name] === 'true') return true;
    if (params[name] === 'false') return false;
    return def;
  }

  function valueCellCount(values) {
    let cells = 0;
    for (let i = 0; i < values.length; i++) cells += Array.isArray(values[i]) ? values[i].length : 0;
    return cells;
  }

  function rangeCellCount(range) {
    return range.getNumRows() * range.getNumColumns();
  }

  function enforceRangeLimit(range, max, label) {
    const cells = rangeCellCount(range);
    if (cells > max) return limitExceeded(label, cells, max);
    return null;
  }

  function validateSpreadsheetId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Invalid spreadsheet ID: ${id}`);
  }

  function getSpreadsheet(id) {
    validateSpreadsheetId(id);
    try { return SpreadsheetApp.openById(id); }
    catch(e) { return null; }
  }

  function getSheet(ss, sheetName) {
    if (sheetName) return ss.getSheetByName(sheetName);
    return ss.getSheets()[0];
  }

  function resolveSheet(spreadsheetId, sheetName) {
    const ss = getSpreadsheet(spreadsheetId);
    if (!ss) return { err: 'NOT_FOUND', msg: `Spreadsheet not found: ${spreadsheetId}` };
    const sheet = getSheet(ss, sheetName || null);
    if (!sheet) return { err: 'NOT_FOUND', msg: `Sheet not found: ${sheetName || 'first'}` };
    return { ss: ss, sheet: sheet };
  }

  function safeValue(fn, fallback) {
    try { return fn(); }
    catch (e) { return fallback; }
  }

  function normalizeFindText(text, name) {
    if (text === undefined || text === null) return { error: err('BAD_REQUEST', `Missing required parameter: ${name}`) };
    const value = String(text);
    if (!value) return { error: err('BAD_REQUEST', `${name} must be non-empty`) };
    if (value.length > 500) return { error: err('BAD_REQUEST', `${name} must be 500 characters or fewer`) };
    return { value: value };
  }

  function validateTextReplacement(value) {
    const text = value === undefined || value === null ? '' : String(value);
    if (text.length > 5000) return { error: err('BAD_REQUEST', 'replaceText must be 5,000 characters or fewer') };
    if (/^[=+\-@]/.test(text.trim())) {
      return { error: err('BAD_REQUEST', 'replaceText cannot start with formula metacharacters. Use sheets_set_formula for formulas.') };
    }
    return { value: text };
  }

  function resolveSearchRanges(ss, sheetName, rangeStr, maxCells, label) {
    const ranges = [];
    let totalCells = 0;

    if (rangeStr) {
      const rangeError = validateA1Range(rangeStr, 'range');
      if (rangeError) return { error: rangeError };
      let range;
      try {
        if (rangeStr.indexOf('!') >= 0) {
          range = ss.getRange(rangeStr);
        } else {
          const sheet = getSheet(ss, sheetName || null);
          if (!sheet) return { error: err('NOT_FOUND', `Sheet not found: ${sheetName || 'first'}`) };
          range = sheet.getRange(rangeStr);
        }
      } catch(e) {
        return { error: err('BAD_REQUEST', `Invalid range: ${rangeStr}`) };
      }
      totalCells = rangeCellCount(range);
      if (totalCells > maxCells) return { error: limitExceeded(label, totalCells, maxCells) };
      return { ranges: [range], scope: 'range', totalCells: totalCells };
    }

    if (sheetName) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return { error: err('NOT_FOUND', `Sheet not found: ${sheetName}`) };
      const range = sheet.getDataRange();
      totalCells = rangeCellCount(range);
      if (totalCells > maxCells) return { error: limitExceeded(label, totalCells, maxCells) };
      return { ranges: [range], scope: 'sheet', totalCells: totalCells };
    }

    const sheets = ss.getSheets();
    for (const sheet of sheets) {
      const range = sheet.getDataRange();
      totalCells += rangeCellCount(range);
      if (totalCells > maxCells) return { error: limitExceeded(label, totalCells, maxCells) };
      ranges.push(range);
    }
    return { ranges: ranges, scope: 'spreadsheet', totalCells: totalCells };
  }

  function configureTextFinder(finder, params) {
    finder.matchCase(optionalBool(params, 'matchCase', false));
    finder.matchEntireCell(optionalBool(params, 'matchEntireCell', false));
    finder.matchFormulaText(optionalBool(params, 'matchFormulaText', false));
    finder.useRegularExpression(optionalBool(params, 'useRegularExpression', false));
    finder.ignoreDiacritics(optionalBool(params, 'ignoreDiacritics', false));
    return finder;
  }

  function protectionTypeFromName(typeName) {
    const normalized = String(typeName || '').toUpperCase();
    if (normalized === 'RANGE') return { name: 'RANGE', value: SpreadsheetApp.ProtectionType.RANGE };
    if (normalized === 'SHEET') return { name: 'SHEET', value: SpreadsheetApp.ProtectionType.SHEET };
    return { error: err('BAD_REQUEST', 'type must be RANGE or SHEET') };
  }

  function userEmails(users) {
    const emails = [];
    for (const user of users || []) {
      const email = safeValue(function() { return user.getEmail(); }, '');
      if (email) emails.push(email);
    }
    return emails;
  }

  function serializeProtection(protection, index) {
    const range = protection.getRange();
    const type = protection.getProtectionType().toString();
    const unprotectedRanges = [];
    const unprotected = type === 'SHEET' ? safeValue(function() { return protection.getUnprotectedRanges(); }, []) : [];
    for (const unprotectedRange of unprotected || []) {
      unprotectedRanges.push(unprotectedRange.getA1Notation());
    }
    return {
      index: index,
      type: type,
      sheetName: range.getSheet().getName(),
      range: range.getA1Notation(),
      description: protection.getDescription() || '',
      rangeName: safeValue(function() { return protection.getRangeName(); }, null),
      warningOnly: protection.isWarningOnly(),
      canEdit: protection.canEdit(),
      domainEdit: safeValue(function() { return protection.canDomainEdit(); }, false),
      editors: userEmails(safeValue(function() { return protection.getEditors(); }, [])),
      unprotectedRanges: unprotectedRanges,
    };
  }

  function protectionsForParams(ss, params, requireType) {
    const sheetName = optionalString(params, 'sheetName', null);
    const typeText = optionalString(params, 'type', null);
    const typeNames = [];
    if (typeText) {
      const typeResult = protectionTypeFromName(typeText);
      if (typeResult.error) return { error: typeResult.error };
      typeNames.push(typeResult.name);
    } else if (requireType) {
      return { error: err('BAD_REQUEST', 'type is required') };
    } else {
      typeNames.push('RANGE', 'SHEET');
    }

    let sheet = null;
    if (sheetName) {
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) return { error: err('NOT_FOUND', `Sheet not found: ${sheetName}`) };
    }

    const protections = [];
    for (const name of typeNames) {
      const type = protectionTypeFromName(name).value;
      const list = sheet ? sheet.getProtections(type) : ss.getProtections(type);
      for (const protection of list) protections.push(protection);
    }
    return { protections: protections };
  }

  function normalizeA1ForCompare(rangeStr) {
    if (!rangeStr) return null;
    const text = String(rangeStr).trim();
    const bang = text.lastIndexOf('!');
    return bang >= 0 ? text.slice(bang + 1) : text;
  }

  function filterProtections(protections, params) {
    const rangeFilter = normalizeA1ForCompare(optionalString(params, 'range', null));
    const hasDescription = params.description !== undefined && params.description !== null;
    const description = hasDescription ? String(params.description) : null;
    const filtered = [];
    for (const protection of protections) {
      const range = protection.getRange();
      if (rangeFilter && range.getA1Notation() !== rangeFilter) continue;
      if (hasDescription && (protection.getDescription() || '') !== description) continue;
      filtered.push(protection);
    }
    return filtered;
  }

  function configureProtection(protection, params, sheet) {
    const applied = [];
    let unprotectedRangeObjects = null;
    if (Array.isArray(params.unprotectedRanges)) {
      unprotectedRangeObjects = [];
      for (let i = 0; i < params.unprotectedRanges.length; i++) {
        const a1 = String(params.unprotectedRanges[i]);
        const rangeError = validateA1Range(a1, 'unprotectedRanges[' + i + ']');
        if (rangeError) return { error: rangeError };
        if (a1.indexOf('!') >= 0) return { error: err('BAD_REQUEST', 'unprotectedRanges must be same-sheet A1 ranges without a sheet prefix') };
        unprotectedRangeObjects.push(sheet.getRange(a1));
      }
    }

    if (params.description !== undefined) {
      protection.setDescription(String(params.description));
      applied.push('description');
    }
    if (params.warningOnly !== undefined) {
      const warningOnly = optionalBool(params, 'warningOnly', false);
      protection.setWarningOnly(warningOnly);
      applied.push(`warningOnly=${warningOnly}`);
    }
    if (Array.isArray(params.editors) && params.editors.length > 0) {
      protection.addEditors(params.editors.map(function(email) { return String(email).trim(); }).filter(Boolean));
      applied.push('editors');
    }
    if (params.domainEdit !== undefined) {
      const domainEdit = optionalBool(params, 'domainEdit', false);
      protection.setDomainEdit(domainEdit);
      applied.push(`domainEdit=${domainEdit}`);
    }
    if (unprotectedRangeObjects) {
      protection.setUnprotectedRanges(unprotectedRangeObjects);
      applied.push('unprotectedRanges');
    }
    return { applied: applied };
  }

  function spreadsheetToJSON(ss) {
    const sheets = ss.getSheets();
    const list = [];
    for (const s of sheets) {
      list.push({
        name: s.getName(),
        sheetId: s.getSheetId(),
        index: s.getIndex(),
        numRows: s.getMaxRows(),
        numCols: s.getMaxColumns()
      });
    }
    return { id: ss.getId(), name: ss.getName(), url: ss.getUrl(), numSheets: sheets.length, sheets: list };
  }

  // ── Spreadsheet management ──

  function spreadsheetCreate(params) {
    const name = requireParam(params, 'name');
    return trap(
      () => {
        const ss = SpreadsheetApp.create(name);
        return { spreadsheet: spreadsheetToJSON(ss) };
      },
      'CREATE_FAILED',
      `Could not create spreadsheet: ${name}`
    );
  }

  function spreadsheetGet(params) {
    const id = requireParam(params, 'spreadsheetId');
    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    return ok({ spreadsheet: spreadsheetToJSON(ss) });
  }

  // ── Sheet management ──

  function sheetAdd(params) {
    const id = requireParam(params, 'spreadsheetId');
    const name = requireParam(params, 'sheetName');
    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    return trap(
      () => {
        const sheet = ss.insertSheet(name);
        return { sheet: { name: sheet.getName(), sheetId: sheet.getSheetId(), index: sheet.getIndex() } };
      },
      'CREATE_FAILED',
      `Could not add sheet: ${name}`
    );
  }

  function sheetDelete(params) {
    const id = requireParam(params, 'spreadsheetId');
    const name = requireParam(params, 'sheetName');
    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    const sheet = ss.getSheetByName(name);
    if (!sheet) return err('NOT_FOUND', `Sheet not found: ${name}`);
    if (ss.getSheets().length <= 1) return err('BAD_REQUEST', 'Cannot delete the only sheet');
    return trap(
      () => { ss.deleteSheet(sheet); return { deleted: name }; },
      'DELETE_FAILED',
      `Could not delete sheet: ${name}`
    );
  }

  function sheetRename(params) {
    const id = requireParam(params, 'spreadsheetId');
    const oldName = requireParam(params, 'oldName');
    const newName = requireParam(params, 'newName');
    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    const sheet = ss.getSheetByName(oldName);
    if (!sheet) return err('NOT_FOUND', `Sheet not found: ${oldName}`);
    return trap(
      () => { sheet.setName(newName); return { oldName: oldName, newName: newName }; },
      'UPDATE_FAILED',
      (e) => `Could not rename sheet: ${e.message}`
    );
  }

  function sheetCopy(params) {
    const srcId = requireParam(params, 'spreadsheetId');
    const sheetName = requireParam(params, 'sheetName');
    const destId = optionalString(params, 'destSpreadsheetId', null);
    const newName = optionalString(params, 'newName', null);

    const srcSs = getSpreadsheet(srcId);
    if (!srcSs) return err('NOT_FOUND', `Source spreadsheet not found: ${srcId}`);
    const srcSheet = srcSs.getSheetByName(sheetName);
    if (!srcSheet) return err('NOT_FOUND', `Sheet not found: ${sheetName}`);

    return trap(
      () => {
        const destSs = destId ? getSpreadsheet(destId) : srcSs;
        if (!destSs) throw new Error(`Destination spreadsheet not found: ${destId}`);
        const copy = srcSheet.copyTo(destSs);
        if (newName) copy.setName(newName);
        return { copied: true, name: copy.getName(), sheetId: copy.getSheetId() };
      },
      'COPY_FAILED',
      (e) => `Could not copy sheet: ${e.message}`
    );
  }

  // ── Reading ──

  function rangeRead(params) {
    const id = requireParam(params, 'spreadsheetId');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeStr = optionalString(params, 'range', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    const sheet = r.sheet;
    let range;
    if (rangeStr) {
      try { range = sheet.getRange(rangeStr); } catch(e) { return err('BAD_REQUEST', `Invalid range: ${rangeStr}`); }
    } else {
      const lr = sheet.getLastRow(), lc = sheet.getLastColumn();
      if (lr === 0 && lc === 0) return ok({ sheetName: sheet.getName(), range: 'A1', values: [], numRows: 0, numCols: 0 });
      range = sheet.getRange(1, 1, lr, lc);
    }

    const limitError = enforceRangeLimit(range, LIMITS.readCells, 'rangeRead cells');
    if (limitError) return limitError;

    const values = range.getValues();
    return ok({
      sheetName: sheet.getName(),
      range: range.getA1Notation(),
      values: values,
      numRows: values.length,
      numCols: values.length > 0 ? values[0].length : 0
    });
  }

  function rangeGetFormulas(params) {
    const id = requireParam(params, 'spreadsheetId');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeStr = optionalString(params, 'range', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    const sheet = r.sheet;
    let range;
    if (rangeStr) {
      try { range = sheet.getRange(rangeStr); } catch(e) { return err('BAD_REQUEST', `Invalid range: ${rangeStr}`); }
    } else {
      const lr = sheet.getLastRow(), lc = sheet.getLastColumn();
      if (lr === 0 && lc === 0) return ok({ sheetName: sheet.getName(), range: 'A1', values: [], formulas: [], displayValues: [], numRows: 0, numCols: 0 });
      range = sheet.getRange(1, 1, lr, lc);
    }

    const limitError = enforceRangeLimit(range, LIMITS.readCells, 'rangeGetFormulas cells');
    if (limitError) return limitError;

    return ok({
      sheetName: sheet.getName(),
      range: range.getA1Notation(),
      values: range.getValues(),
      formulas: range.getFormulas(),
      displayValues: range.getDisplayValues(),
      numRows: range.getNumRows(),
      numCols: range.getNumColumns()
    });
  }

  function rangeGetNotes(params) {
    const id = requireParam(params, 'spreadsheetId');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeStr = optionalString(params, 'range', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    const sheet = r.sheet;
    let range;
    if (rangeStr) {
      try { range = sheet.getRange(rangeStr); } catch(e) { return err('BAD_REQUEST', `Invalid range: ${rangeStr}`); }
    } else {
      const lr = sheet.getLastRow(), lc = sheet.getLastColumn();
      if (lr === 0 && lc === 0) return ok({ sheetName: sheet.getName(), range: 'A1', notes: [], numRows: 0, numCols: 0 });
      range = sheet.getRange(1, 1, lr, lc);
    }

    const limitError = enforceRangeLimit(range, LIMITS.readCells, 'rangeGetNotes cells');
    if (limitError) return limitError;

    return ok({
      sheetName: sheet.getName(),
      range: range.getA1Notation(),
      notes: range.getNotes(),
      numRows: range.getNumRows(),
      numCols: range.getNumColumns()
    });
  }

  // ── Batch Get (Advanced Service) ──

  function valuesBatchGet(params) {
    const id = requireParam(params, 'spreadsheetId');
    const ranges = params.ranges;

    if (!Array.isArray(ranges) || ranges.length === 0) {
      return err('BAD_REQUEST', 'ranges must be a non-empty array of A1 notation strings');
    }
    for (let i = 0; i < ranges.length; i++) {
      const rangeError = validateA1Range(ranges[i], 'ranges[' + i + ']');
      if (rangeError) return rangeError;
    }
    if (ranges.length > LIMITS.batchRanges) return limitExceeded('valuesBatchGet ranges', ranges.length, LIMITS.batchRanges);

    return trap(
      () => {
        const result = Sheets.Spreadsheets.Values.batchGet(id, { ranges });
        let cells = 0;
        const valueRanges = result.valueRanges || [];
        for (let i = 0; i < valueRanges.length; i++) cells += valueCellCount(valueRanges[i].values || []);
        if (cells > LIMITS.readCells) return limitExceeded('valuesBatchGet cells', cells, LIMITS.readCells);
        return { spreadsheetId: id, valueRanges: result.valueRanges || [] };
      },
      'READ_FAILED',
      (e) => e.message || 'Could not batch-get values'
    );
  }

  // ── Text finding / replacement ──

  function textFind(params) {
    const id = requireParam(params, 'spreadsheetId');
    const findResult = normalizeFindText(params.findText, 'findText');
    if (findResult.error) return findResult.error;
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeStr = optionalString(params, 'range', null);
    const maxResultsLimit = validateFiniteNumber(optionalNumber(params, 'maxResults', 100), 'maxResults', 1, 500);
    if (maxResultsLimit.error) return maxResultsLimit.error;
    const maxResults = Math.floor(maxResultsLimit.value);

    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    const resolved = resolveSearchRanges(ss, sheetName, rangeStr, LIMITS.readCells, 'textFind cells');
    if (resolved.error) return resolved.error;

    return trap(
      () => {
        const matches = [];
        let totalMatches = 0;
        for (const range of resolved.ranges) {
          const finder = configureTextFinder(range.createTextFinder(findResult.value), params);
          const found = finder.findAll();
          totalMatches += found.length;
          for (const cell of found) {
            if (matches.length >= maxResults) continue;
            matches.push({
              sheetName: cell.getSheet().getName(),
              range: cell.getA1Notation(),
              row: cell.getRow(),
              column: cell.getColumn(),
              value: cell.getValue(),
              displayValue: cell.getDisplayValue(),
              formula: cell.getFormula() || '',
            });
          }
        }
        return {
          findText: findResult.value,
          scope: resolved.scope,
          totalCellsSearched: resolved.totalCells,
          totalMatches: totalMatches,
          returnedMatches: matches.length,
          truncated: totalMatches > matches.length,
          matches: matches,
        };
      },
      'READ_FAILED',
      (e) => `Could not find text: ${e.message}`
    );
  }

  function textReplace(params) {
    const id = requireParam(params, 'spreadsheetId');
    const findResult = normalizeFindText(params.findText, 'findText');
    if (findResult.error) return findResult.error;
    const replaceResult = validateTextReplacement(params.replaceText);
    if (replaceResult.error) return replaceResult.error;
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeStr = optionalString(params, 'range', null);

    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    const resolved = resolveSearchRanges(ss, sheetName, rangeStr, LIMITS.writeCells, 'textReplace cells');
    if (resolved.error) return resolved.error;

    return trap(
      () => {
        let replacements = 0;
        for (const range of resolved.ranges) {
          const finder = configureTextFinder(range.createTextFinder(findResult.value), params);
          replacements += finder.replaceAllWith(replaceResult.value);
        }
        return {
          findText: findResult.value,
          replaceText: replaceResult.value,
          scope: resolved.scope,
          totalCellsSearched: resolved.totalCells,
          replacements: replacements,
        };
      },
      'UPDATE_FAILED',
      (e) => `Could not replace text: ${e.message}`
    );
  }

  // ── Writing ──

  function rangeWrite(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);
    const values = params.values;
    if (!Array.isArray(values) || values.length === 0) return err('BAD_REQUEST', 'values must be a non-empty 2D array');
    const rangeError = validateA1Range(rangeStr, 'range');
    if (rangeError) return rangeError;
    const formulaError = formulaInjectionError(values, 'rangeWrite');
    if (formulaError) return formulaError;
    const requestedCells = valueCellCount(values);
    if (requestedCells > LIMITS.writeCells) return limitExceeded('rangeWrite cells', requestedCells, LIMITS.writeCells);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    const sheet = r.sheet;
    return trap(
      () => {
        let range = sheet.getRange(rangeStr);
        let numRows = range.getNumRows(), numCols = range.getNumColumns();
        if (rangeStr.indexOf(':') === -1) {
          numRows = Math.min(values.length, sheet.getMaxRows() - range.getRow() + 1);
          numCols = Math.min(values[0].length, sheet.getMaxColumns() - range.getColumn() + 1);
          range = sheet.getRange(range.getRow(), range.getColumn(), numRows, numCols);
        }
        const limitError = enforceRangeLimit(range, LIMITS.writeCells, 'rangeWrite target cells');
        if (limitError) return limitError;
        const padded = [];
        for (let i = 0; i < numRows; i++) {
          const row = [];
          for (let j = 0; j < numCols; j++) row.push((i < values.length && j < values[i].length) ? values[i][j] : '');
          padded.push(row);
        }
        range.setValues(padded);
        return { sheetName: sheet.getName(), range: range.getA1Notation(), rowsWritten: numRows, colsWritten: numCols };
      },
      'WRITE_FAILED',
      (e) => `Could not write to range: ${e.message}`
    );
  }

  function rowsAppend(params) {
    const id = requireParam(params, 'spreadsheetId');
    const sheetName = optionalString(params, 'sheetName', null);
    const values = params.values;
    if (!Array.isArray(values) || values.length === 0) return err('BAD_REQUEST', 'values must be a non-empty 2D array');
    const formulaError = formulaInjectionError(values, 'rowsAppend');
    if (formulaError) return formulaError;
    const requestedCells = valueCellCount(values);
    if (requestedCells > LIMITS.writeCells) return limitExceeded('rowsAppend cells', requestedCells, LIMITS.writeCells);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    const sheet = r.sheet;
    return trap(
      () => {
        if (values.length === 1) {
          sheet.appendRow(values[0]);
        } else {
          const lastRow = sheet.getLastRow();
          const startRow = lastRow === 0 ? 1 : lastRow + 1;
          sheet.getRange(startRow, 1, values.length, values[0].length).setValues(values);
        }
        return { sheetName: sheet.getName(), rowsAppended: values.length };
      },
      'WRITE_FAILED',
      (e) => `Could not append rows: ${e.message}`
    );
  }

  function rangeClear(params) {
    const id = requireParam(params, 'spreadsheetId');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeStr = optionalString(params, 'range', null);
    if (rangeStr) {
      const rangeError = validateA1Range(rangeStr, 'range');
      if (rangeError) return rangeError;
    }

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        let range;
        if (rangeStr) {
          range = r.sheet.getRange(rangeStr);
        } else {
          const lr = r.sheet.getLastRow(), lc = r.sheet.getLastColumn();
          if (lr === 0 && lc === 0) return { sheetName: r.sheet.getName(), cleared: '(empty)' };
          range = r.sheet.getRange(1, 1, lr, lc);
        }
        const limitError = enforceRangeLimit(range, LIMITS.writeCells, 'rangeClear cells');
        if (limitError) return limitError;
        range.clearContent();
        return { sheetName: r.sheet.getName(), cleared: rangeStr || '(all)' };
      },
      'CLEAR_FAILED',
      (e) => `Could not clear range: ${e.message}`
    );
  }

  function formulaSet(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const formula = requireParam(params, 'formula');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeError = validateA1Range(rangeStr, 'range');
    if (rangeError) return rangeError;
    if (String(formula).trim().charAt(0) !== '=') return err('BAD_REQUEST', 'formula must start with = and must be set through sheets_set_formula');

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const range = r.sheet.getRange(rangeStr);
        const limitError = enforceRangeLimit(range, LIMITS.writeCells, 'formulaSet cells');
        if (limitError) return limitError;
        const numRows = range.getNumRows(), numCols = range.getNumColumns();
        if (numRows === 1 && numCols === 1) {
          range.setFormula(formula);
        } else {
          const arr = [];
          for (let i = 0; i < numRows; i++) {
            const row = [];
            for (let j = 0; j < numCols; j++) row.push(formula);
            arr.push(row);
          }
          range.setFormulas(arr);
        }
        return { sheetName: r.sheet.getName(), range: range.getA1Notation(), formula: formula };
      },
      'WRITE_FAILED',
      (e) => `Could not set formula: ${e.message}`
    );
  }

  // ── Formatting ──

  function rangeFormat(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeError = validateA1Range(rangeStr, 'range');
    if (rangeError) return rangeError;
    const backgroundError = validateCssColor(params.background, 'background');
    if (backgroundError) return backgroundError;
    const fontColorError = validateCssColor(params.fontColor, 'fontColor');
    if (fontColorError) return fontColorError;
    const fontSizeLimit = params.fontSize !== undefined ? validateFiniteNumber(params.fontSize, 'fontSize', 1, 400) : null;
    if (fontSizeLimit && fontSizeLimit.error) return fontSizeLimit.error;

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const range = r.sheet.getRange(rangeStr);
        const limitError = enforceRangeLimit(range, LIMITS.writeCells, 'rangeFormat cells');
        if (limitError) return limitError;
        const applied = [];

        if (params.background !== undefined) { range.setBackground(String(params.background)); applied.push('background'); }
        if (params.fontColor !== undefined) { range.setFontColor(String(params.fontColor)); applied.push('fontColor'); }
        if (params.fontFamily !== undefined) { range.setFontFamily(String(params.fontFamily)); applied.push('fontFamily'); }
        if (params.fontSize !== undefined) { range.setFontSize(fontSizeLimit.value); applied.push('fontSize'); }
        if (params.bold !== undefined) { const b = optionalBool(params, 'bold', false); range.setFontWeight(b ? 'bold' : 'normal'); applied.push(`bold=${b}`); }
        if (params.italic !== undefined) { const it = optionalBool(params, 'italic', false); range.setFontStyle(it ? 'italic' : 'normal'); applied.push(`italic=${it}`); }

        const hasUnderline = params.underline !== undefined;
        const hasStrikethrough = params.strikethrough !== undefined;
        if (hasUnderline && hasStrikethrough) {
          const u = optionalBool(params, 'underline', false);
          const s = optionalBool(params, 'strikethrough', false);
          if (u && s) {
            range.setFontLine('line-through');
            applied.push('strikethrough=true (underline=true ignored: cannot combine both)');
          } else if (s) {
            range.setFontLine('line-through');
            applied.push('strikethrough=true');
          } else if (u) {
            range.setFontLine('underline');
            applied.push('underline=true');
          } else {
            range.setFontLine('none');
            applied.push('underline=false strikethrough=false');
          }
        } else if (hasUnderline) {
          const u = optionalBool(params, 'underline', false);
          range.setFontLine(u ? 'underline' : 'none');
          applied.push(`underline=${u}`);
        } else if (hasStrikethrough) {
          const s = optionalBool(params, 'strikethrough', false);
          range.setFontLine(s ? 'line-through' : 'none');
          applied.push(`strikethrough=${s}`);
        }

        if (params.horizontalAlignment !== undefined) { range.setHorizontalAlignment(String(params.horizontalAlignment)); applied.push('hAlign'); }
        if (params.verticalAlignment !== undefined) { range.setVerticalAlignment(String(params.verticalAlignment)); applied.push('vAlign'); }
        if (params.numberFormat !== undefined) { range.setNumberFormat(String(params.numberFormat)); applied.push('numberFormat'); }
        if (params.textWrap !== undefined) { range.setWrap(optionalBool(params, 'textWrap', false)); applied.push(`wrap=${params.textWrap}`); }

        const borderColor = params.borderColor ? String(params.borderColor) : '#000000';
        const borderStyleName = params.borderStyle || 'SOLID';
        const borderStyle = BORDER_STYLE_MAP[borderStyleName] || SpreadsheetApp.BorderStyle.SOLID;

        const top = params.borderTop !== undefined;
        const bottom = params.borderBottom !== undefined;
        const left = params.borderLeft !== undefined;
        const right = params.borderRight !== undefined;
        if (top || bottom || left || right) {
          range.setBorder(top, bottom, left, right, false, false, borderColor, borderStyle);
          if (top) applied.push('borderTop');
          if (bottom) applied.push('borderBottom');
          if (left) applied.push('borderLeft');
          if (right) applied.push('borderRight');
        }

        return { sheetName: r.sheet.getName(), range: range.getA1Notation(), applied: applied };
      },
      'FORMAT_FAILED',
      (e) => `Could not format range: ${e.message}`
    );
  }

  function rangeMerge(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeError = validateA1Range(rangeStr, 'range');
    if (rangeError) return rangeError;

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const range = r.sheet.getRange(rangeStr);
        const limitError = enforceRangeLimit(range, LIMITS.writeCells, 'rangeMerge cells');
        if (limitError) return limitError;
        range.merge();
        return { sheetName: r.sheet.getName(), range: rangeStr, merged: true };
      },
      'MERGE_FAILED',
      (e) => `Could not merge: ${e.message}`
    );
  }

  function rangeUnmerge(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeError = validateA1Range(rangeStr, 'range');
    if (rangeError) return rangeError;

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const range = r.sheet.getRange(rangeStr);
        const limitError = enforceRangeLimit(range, LIMITS.writeCells, 'rangeUnmerge cells');
        if (limitError) return limitError;
        range.breakApart();
        return { sheetName: r.sheet.getName(), range: rangeStr, unmerged: true };
      },
      'UNMERGE_FAILED',
      (e) => `Could not unmerge: ${e.message}`
    );
  }

  function columnWidth(params) {
    const id = requireParam(params, 'spreadsheetId');
    const colLimit = validateFiniteNumber(requireParam(params, 'column'), 'column', 1, 18278);
    if (colLimit.error) return colLimit.error;
    const widthLimit = validateFiniteNumber(requireParam(params, 'width'), 'width', 10, 1024);
    if (widthLimit.error) return widthLimit.error;
    const col = colLimit.value;
    const width = widthLimit.value;
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => { r.sheet.setColumnWidth(col, width); return { sheetName: r.sheet.getName(), column: col, width: width }; },
      'UPDATE_FAILED',
      (e) => `Could not set column width: ${e.message}`
    );
  }

  function freezeRows(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rowLimit = validateFiniteNumber(requireParam(params, 'numRows'), 'numRows', 0, 10000);
    if (rowLimit.error) return rowLimit.error;
    const numRows = rowLimit.value;
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => { r.sheet.setFrozenRows(numRows); return { sheetName: r.sheet.getName(), frozenRows: numRows }; },
      'UPDATE_FAILED',
      (e) => `Could not freeze rows: ${e.message}`
    );
  }

  // ── Sorting ──

  function rangeSort(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const rangeError = validateA1Range(rangeStr, 'range');
    if (rangeError) return rangeError;
    const sortLimit = validateFiniteNumber(requireParam(params, 'sortColumn'), 'sortColumn', 1, 18278);
    if (sortLimit.error) return sortLimit.error;
    const sortCol = sortLimit.value;
    const asc = optionalBool(params, 'ascending', true);
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const range = r.sheet.getRange(rangeStr);
        const limitError = enforceRangeLimit(range, LIMITS.writeCells, 'rangeSort cells');
        if (limitError) return limitError;
        range.sort({ column: sortCol, ascending: asc });
        return { sheetName: r.sheet.getName(), range: rangeStr, sortColumn: sortCol, ascending: asc };
      },
      'SORT_FAILED',
      (e) => `Could not sort: ${e.message}`
    );
  }

  // ── Charts ──

  function chartCreate(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const chartType = requireParam(params, 'chartType');
    const sheetName = optionalString(params, 'sheetName', null);
    const title = optionalString(params, 'title', null);
    const xTitle = optionalString(params, 'xAxisTitle', null);
    const yTitle = optionalString(params, 'yAxisTitle', null);
    const position = optionalString(params, 'position', 'A1');
    const rangeError = validateA1Range(rangeStr, 'range');
    if (rangeError) return rangeError;
    const positionError = validateA1Range(position, 'position');
    if (positionError) return positionError;
    const widthLimit = validateFiniteNumber(optionalNumber(params, 'width', 600), 'width', 100, 1200);
    if (widthLimit.error) return widthLimit.error;
    const heightLimit = validateFiniteNumber(optionalNumber(params, 'height', 400), 'height', 100, 1200);
    if (heightLimit.error) return heightLimit.error;
    const width = widthLimit.value;
    const height = heightLimit.value;
    const legendPos = optionalString(params, 'legendPosition', 'RIGHT');
    const stacked = optionalBool(params, 'stacked', false);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const dataRange = r.sheet.getRange(rangeStr);
        const limitError = enforceRangeLimit(dataRange, LIMITS.readCells, 'chart data cells');
        if (limitError) return limitError;
        const ct = CHART_TYPE_MAP[chartType] || Charts.ChartType.COLUMN;
        const pos = parseCellReference(position);

        let builder = r.sheet.newChart()
          .setChartType(ct)
          .addRange(dataRange)
          .setPosition(pos.row, pos.col, 0, 0)
          .setOption('width', width)
          .setOption('height', height);

        if (title) builder = builder.setOption('title', title);
        if (xTitle) builder = builder.setOption('hAxis.title', xTitle);
        if (yTitle) builder = builder.setOption('vAxis.title', yTitle);

        builder = builder.setOption('legend', { position: LEGEND_POSITION_MAP[legendPos] || 'right' });
        builder = builder.setOption('useFirstColumnAsDomain', true);

        if (stacked && (chartType === 'BAR' || chartType === 'COLUMN' || chartType === 'AREA')) {
          builder = builder.setOption('isStacked', true);
        }

        const chart = builder.build();
        r.sheet.insertChart(chart);
        return { chartType: chartType, position: position, width: width, height: height };
      },
      'CREATE_FAILED',
      (e) => `Could not create chart: ${e.message}`
    );
  }

  // ── Notes ──

  function noteSet(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);
    const note = params.note;
    if (note === undefined || note === null) return err('BAD_REQUEST', 'Missing required parameter: note');

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const range = r.sheet.getRange(rangeStr);
        const limitError = enforceRangeLimit(range, LIMITS.writeCells, 'noteSet cells');
        if (limitError) return limitError;
        if (note === '') {
          range.clearNote();
          return { sheetName: r.sheet.getName(), range: rangeStr, cleared: true };
        }
        range.setNote(note);
        return { sheetName: r.sheet.getName(), range: rangeStr, note: note };
      },
      'UPDATE_FAILED',
      (e) => `Could not set note: ${e.message}`
    );
  }

  // ── Conditional formatting ──

  function conditionalFormatGet(params) {
    const id = requireParam(params, 'spreadsheetId');
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const rules = r.sheet.getConditionalFormatRules();
        const serialized = [];
        for (const rule of rules) {
          const entry = {};

          const ranges = rule.getRanges();
          if (ranges) {
            entry.ranges = [];
            for (const range of ranges) {
              entry.ranges.push(range.getA1Notation());
            }
          }

          const booleanCond = rule.getBooleanCondition();
          if (booleanCond) {
            entry.booleanCondition = {
              type: booleanCond.getCriteriaType().toString(),
              values: [],
            };
            const args = booleanCond.getCriteriaValues();
            if (args) {
              for (const arg of args) {
                entry.booleanCondition.values.push(String(arg));
              }
            }

            const bg = booleanCond.getBackground();
            if (bg) entry.booleanCondition.background = bg;
            const fg = booleanCond.getFontColor();
            if (fg) entry.booleanCondition.fontColor = fg;
          }

          const gradientCond = rule.getGradientCondition();
          if (gradientCond) {
            entry.gradientCondition = {
              minType: gradientCond.getMinType().toString(),
              maxType: gradientCond.getMaxType().toString(),
            };
            const minVal = gradientCond.getMinValue();
            if (minVal) entry.gradientCondition.minValue = String(minVal);
            const maxVal = gradientCond.getMaxValue();
            if (maxVal) entry.gradientCondition.maxValue = String(maxVal);
            const minColor = gradientCond.getMinColor();
            if (minColor) entry.gradientCondition.minColor = minColor;
            const maxColor = gradientCond.getMaxColor();
            if (maxColor) entry.gradientCondition.maxColor = maxColor;
          }

          serialized.push(entry);
        }
        return { sheetName: r.sheet.getName(), rules: serialized };
      },
      'READ_FAILED',
      (e) => `Could not get conditional formatting: ${e.message}`
    );
  }

  // ── Protections ──

  function protectionsList(params) {
    const id = requireParam(params, 'spreadsheetId');
    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    const protectionsResult = protectionsForParams(ss, params, false);
    if (protectionsResult.error) return protectionsResult.error;
    const filtered = filterProtections(protectionsResult.protections, params);

    return trap(
      () => {
        const protections = [];
        for (let i = 0; i < filtered.length; i++) protections.push(serializeProtection(filtered[i], i));
        return { protections: protections, count: protections.length };
      },
      'READ_FAILED',
      (e) => `Could not list protections: ${e.message}`
    );
  }

  function rangeProtect(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeError = validateA1Range(rangeStr, 'range');
    if (rangeError) return rangeError;

    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    const resolved = resolveSearchRanges(ss, sheetName, rangeStr, LIMITS.writeCells, 'rangeProtect cells');
    if (resolved.error) return resolved.error;
    if (resolved.ranges.length !== 1) return err('BAD_REQUEST', 'rangeProtect requires one target range');

    return trap(
      () => {
        const range = resolved.ranges[0];
        const protection = range.protect();
        try {
          const configured = configureProtection(protection, params, range.getSheet());
          if (configured.error) {
            protection.remove();
            return configured.error;
          }
          return { protection: serializeProtection(protection, 0), applied: configured.applied };
        } catch (e) {
          safeValue(function() { protection.remove(); return true; }, false);
          throw e;
        }
      },
      'UPDATE_FAILED',
      (e) => `Could not protect range: ${e.message}`
    );
  }

  function sheetProtect(params) {
    const id = requireParam(params, 'spreadsheetId');
    const sheetName = optionalString(params, 'sheetName', null);
    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const protection = r.sheet.protect();
        try {
          const configured = configureProtection(protection, params, r.sheet);
          if (configured.error) {
            protection.remove();
            return configured.error;
          }
          return { protection: serializeProtection(protection, 0), applied: configured.applied };
        } catch (e) {
          safeValue(function() { protection.remove(); return true; }, false);
          throw e;
        }
      },
      'UPDATE_FAILED',
      (e) => `Could not protect sheet: ${e.message}`
    );
  }

  function protectionRemove(params) {
    const id = requireParam(params, 'spreadsheetId');
    const indexLimit = validateFiniteNumber(optionalNumber(params, 'index', 0), 'index', 0, 10000);
    if (indexLimit.error) return indexLimit.error;
    const index = Math.floor(indexLimit.value);
    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    const protectionsResult = protectionsForParams(ss, params, true);
    if (protectionsResult.error) return protectionsResult.error;
    const filtered = filterProtections(protectionsResult.protections, params);
    if (filtered.length === 0) return err('NOT_FOUND', 'No matching protection found');
    if (index >= filtered.length) return err('BAD_REQUEST', `index ${index} is out of range for ${filtered.length} matching protections`);

    return trap(
      () => {
        const protection = filtered[index];
        const removed = serializeProtection(protection, index);
        protection.remove();
        return { removed: removed, remainingMatchesBeforeRemoval: filtered.length - 1 };
      },
      'DELETE_FAILED',
      (e) => `Could not remove protection: ${e.message}`
    );
  }

  // ── Data validation ──

  function buildValidationRule(validationType, params) {
    let builder = SpreadsheetApp.newDataValidation();
    let error = null;

    switch (validationType) {
      case 'VALUE_IN_LIST': {
        const values = params.values;
        if (!Array.isArray(values) || values.length === 0) {
          error = 'values must be a non-empty array for VALUE_IN_LIST';
          break;
        }
        builder = builder.requireValueInList(values, true);
        break;
      }
      case 'NUMBER_BETWEEN': {
        const minNb = optionalNumber(params, 'min', null);
        const maxNb = optionalNumber(params, 'max', null);
        if (minNb === null || maxNb === null) {
          error = 'min and max required for NUMBER_BETWEEN';
          break;
        }
        builder = builder.requireNumberBetween(minNb, maxNb);
        break;
      }
      case 'NUMBER_GREATER_THAN': {
        const gtVal = optionalNumber(params, 'value', null);
        if (gtVal === null) { error = 'value required for NUMBER_GREATER_THAN'; break; }
        builder = builder.requireNumberGreaterThan(gtVal);
        break;
      }
      case 'NUMBER_GREATER_THAN_OR_EQUAL_TO': {
        const gteVal = optionalNumber(params, 'value', null);
        if (gteVal === null) { error = 'value required for NUMBER_GREATER_THAN_OR_EQUAL_TO'; break; }
        builder = builder.requireNumberGreaterThanOrEqualTo(gteVal);
        break;
      }
      case 'NUMBER_LESS_THAN': {
        const ltVal = optionalNumber(params, 'value', null);
        if (ltVal === null) { error = 'value required for NUMBER_LESS_THAN'; break; }
        builder = builder.requireNumberLessThan(ltVal);
        break;
      }
      case 'NUMBER_LESS_THAN_OR_EQUAL_TO': {
        const lteVal = optionalNumber(params, 'value', null);
        if (lteVal === null) { error = 'value required for NUMBER_LESS_THAN_OR_EQUAL_TO'; break; }
        builder = builder.requireNumberLessThanOrEqualTo(lteVal);
        break;
      }
      case 'NUMBER_EQUAL_TO': {
        const eqVal = optionalNumber(params, 'value', null);
        if (eqVal === null) { error = 'value required for NUMBER_EQUAL_TO'; break; }
        builder = builder.requireNumberEqualTo(eqVal);
        break;
      }
      case 'NUMBER_NOT_BETWEEN': {
        const nMin = optionalNumber(params, 'min', null);
        const nMax = optionalNumber(params, 'max', null);
        if (nMin === null || nMax === null) {
          error = 'min and max required for NUMBER_NOT_BETWEEN';
          break;
        }
        builder = builder.requireNumberNotBetween(nMin, nMax);
        break;
      }
      case 'TEXT_CONTAINS': {
        const tcVal = optionalString(params, 'text', null);
        if (!tcVal) { error = 'text required for TEXT_CONTAINS'; break; }
        builder = builder.requireTextContains(tcVal);
        break;
      }
      case 'TEXT_DOES_NOT_CONTAIN': {
        const tdcVal = optionalString(params, 'text', null);
        if (!tdcVal) { error = 'text required for TEXT_DOES_NOT_CONTAIN'; break; }
        builder = builder.requireTextDoesNotContain(tdcVal);
        break;
      }
      case 'TEXT_EQUAL_TO': {
        const tetVal = optionalString(params, 'text', null);
        if (!tetVal) { error = 'text required for TEXT_EQUAL_TO'; break; }
        builder = builder.requireTextEqualTo(tetVal);
        break;
      }
      case 'TEXT_IS_VALID_EMAIL':
        builder = builder.requireTextIsEmail();
        break;
      case 'TEXT_IS_VALID_URL':
        builder = builder.requireTextIsUrl();
        break;
      case 'DATE_EQUAL_TO': {
        const detVal = params.date;
        if (detVal === undefined) { error = 'date required for DATE_EQUAL_TO'; break; }
        builder = builder.requireDateEqualTo(new Date(String(detVal)));
        break;
      }
      case 'DATE_BEFORE': {
        const dbVal = params.date;
        if (dbVal === undefined) { error = 'date required for DATE_BEFORE'; break; }
        builder = builder.requireDateBefore(new Date(String(dbVal)));
        break;
      }
      case 'DATE_AFTER': {
        const daVal = params.date;
        if (daVal === undefined) { error = 'date required for DATE_AFTER'; break; }
        builder = builder.requireDateAfter(new Date(String(daVal)));
        break;
      }
      case 'CHECKBOX':
        builder = builder.requireCheckbox();
        break;
      case 'CUSTOM_FORMULA': {
        const formula = optionalString(params, 'formula', null);
        if (!formula) { error = 'formula required for CUSTOM_FORMULA'; break; }
        builder = builder.requireFormulaSatisfied(formula);
        break;
      }
      default:
        error = `Unknown validation type: ${validationType}`;
    }

    if (error) return { error: { code: 'BAD_REQUEST', message: error } };
    return { builder: builder };
  }

  function dataValidationSet(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const validationType = requireParam(params, 'validationType');
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const range = r.sheet.getRange(rangeStr);
        const limitError = enforceRangeLimit(range, LIMITS.writeCells, 'dataValidationSet cells');
        if (limitError) return limitError;
        const result = buildValidationRule(validationType, params);
        if (result.error) throw new Error(result.error.message);

        let builder = result.builder;

        const showHelpText = optionalString(params, 'helpText', null);
        if (showHelpText) builder = builder.setHelpText(showHelpText);

        const strict = optionalBool(params, 'strict', false);
        if (strict) builder = builder.setAllowInvalid(false);

        const rule = builder.build();
        range.setDataValidation(rule);

        return { sheetName: r.sheet.getName(), range: rangeStr, validationType: validationType };
      },
      'UPDATE_FAILED',
      (e) => `Could not set data validation: ${e.message}`
    );
  }

  // ── Row operations ──

  function rowsInsert(params) {
    const id = requireParam(params, 'spreadsheetId');
    const startPosition = Number(requireParam(params, 'startPosition'));
    const howMany = optionalNumber(params, 'howMany', 1);
    const sheetName = optionalString(params, 'sheetName', null);
    if (howMany > LIMITS.rowsMutated) return limitExceeded('rowsInsert count', howMany, LIMITS.rowsMutated);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => { r.sheet.insertRows(startPosition, howMany); return { sheetName: r.sheet.getName(), startPosition: startPosition, howMany: howMany }; },
      'UPDATE_FAILED',
      (e) => `Could not insert rows: ${e.message}`
    );
  }

  function rowsDelete(params) {
    const id = requireParam(params, 'spreadsheetId');
    const startPosition = Number(requireParam(params, 'startPosition'));
    const howMany = optionalNumber(params, 'howMany', 1);
    const sheetName = optionalString(params, 'sheetName', null);
    if (howMany > LIMITS.rowsMutated) return limitExceeded('rowsDelete count', howMany, LIMITS.rowsMutated);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => { r.sheet.deleteRows(startPosition, howMany); return { sheetName: r.sheet.getName(), startPosition: startPosition, howMany: howMany }; },
      'UPDATE_FAILED',
      (e) => `Could not delete rows: ${e.message}`
    );
  }

  const ACTIONS = {
    spreadsheetCreate, spreadsheetGet, sheetAdd, sheetDelete,
    sheetRename, sheetCopy, rangeRead, rangeWrite, rowsAppend,
    rangeClear, rangeFormat, rangeMerge, rangeUnmerge, columnWidth,
    freezeRows, rangeSort, formulaSet, chartCreate, noteSet,
    rangeGetFormulas, rangeGetNotes, valuesBatchGet,
    textFind, textReplace, protectionsList, rangeProtect, sheetProtect,
    protectionRemove, conditionalFormatGet, dataValidationSet, rowsInsert, rowsDelete,
    batch: function(params) { return runBatch(handle)(params); },
  }

  return { handle: handle, requestWeight: requestWeight };
})();
