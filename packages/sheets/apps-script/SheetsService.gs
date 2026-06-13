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

  function parseCellReference(cellRef) {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { col: 1, row: 1 };
    let col = 0;
    for (const ch of match[1]) {
      col = col * 26 + (ch.charCodeAt(0) - 64);
    }
    return { col: col, row: parseInt(match[2], 10) };
  }

  function ok(data) {
    return { success: true, data: data };
  }

  function err(code, message) {
    return { success: false, error: { code: code, message: message } };
  }

  function handle(action, params) {
    switch (action) {
      case 'spreadsheetCreate': return spreadsheetCreate(params);
      case 'spreadsheetGet':    return spreadsheetGet(params);
      case 'sheetAdd':          return sheetAdd(params);
      case 'sheetDelete':       return sheetDelete(params);
      case 'sheetRename':       return sheetRename(params);
      case 'sheetCopy':         return sheetCopy(params);
      case 'rangeRead':         return rangeRead(params);
      case 'rangeWrite':        return rangeWrite(params);
      case 'rowsAppend':        return rowsAppend(params);
      case 'rangeClear':        return rangeClear(params);
      case 'rangeFormat':       return rangeFormat(params);
      case 'rangeMerge':        return rangeMerge(params);
      case 'rangeUnmerge':      return rangeUnmerge(params);
      case 'columnWidth':       return columnWidth(params);
      case 'freezeRows':        return freezeRows(params);
      case 'rangeSort':         return rangeSort(params);
      case 'formulaSet':        return formulaSet(params);
      case 'chartCreate':       return chartCreate(params);
      case 'noteSet':           return noteSet(params);
      case 'rangeGetFormulas':  return rangeGetFormulas(params);
      case 'rangeGetNotes':     return rangeGetNotes(params);
      case 'batch':             return batch(params);
      default: return err('UNKNOWN_ACTION', `Unknown action: ${action}`);
    }
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
    return ss.getActiveSheet();
  }

  function resolveSheet(spreadsheetId, sheetName) {
    const ss = getSpreadsheet(spreadsheetId);
    if (!ss) return { err: 'NOT_FOUND', msg: `Spreadsheet not found: ${spreadsheetId}` };
    const sheet = getSheet(ss, sheetName || null);
    if (!sheet) return { err: 'NOT_FOUND', msg: `Sheet not found: ${sheetName || 'active'}` };
    return { ss: ss, sheet: sheet };
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
    try {
      const ss = SpreadsheetApp.create(name);
      return ok({ spreadsheet: spreadsheetToJSON(ss) });
    } catch(e) { return err('CREATE_FAILED', `Could not create spreadsheet: ${name}`); }
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
    try {
      const sheet = ss.insertSheet(name);
      return ok({ sheet: { name: sheet.getName(), sheetId: sheet.getSheetId(), index: sheet.getIndex() } });
    } catch(e) { return err('CREATE_FAILED', `Could not add sheet: ${name}`); }
  }

  function sheetDelete(params) {
    const id = requireParam(params, 'spreadsheetId');
    const name = requireParam(params, 'sheetName');
    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    const sheet = ss.getSheetByName(name);
    if (!sheet) return err('NOT_FOUND', `Sheet not found: ${name}`);
    if (ss.getSheets().length <= 1) return err('BAD_REQUEST', 'Cannot delete the only sheet');
    try {
      ss.deleteSheet(sheet);
      return ok({ deleted: name });
    } catch(e) { return err('DELETE_FAILED', `Could not delete sheet: ${name}`); }
  }

  function sheetRename(params) {
    const id = requireParam(params, 'spreadsheetId');
    const oldName = requireParam(params, 'oldName');
    const newName = requireParam(params, 'newName');
    const ss = getSpreadsheet(id);
    if (!ss) return err('NOT_FOUND', `Spreadsheet not found: ${id}`);
    const sheet = ss.getSheetByName(oldName);
    if (!sheet) return err('NOT_FOUND', `Sheet not found: ${oldName}`);
    try {
      sheet.setName(newName);
      return ok({ oldName: oldName, newName: newName });
    } catch(e) { return err('UPDATE_FAILED', `Could not rename sheet: ${e.message}`); }
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

    try {
      const destSs = destId ? getSpreadsheet(destId) : srcSs;
      if (!destSs) return err('NOT_FOUND', `Destination spreadsheet not found: ${destId}`);
      const copy = srcSheet.copyTo(destSs);
      if (newName) copy.setName(newName);
      return ok({ copied: true, name: copy.getName(), sheetId: copy.getSheetId() });
    } catch(e) { return err('COPY_FAILED', `Could not copy sheet: ${e.message}`); }
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

    return ok({
      sheetName: sheet.getName(),
      range: range.getA1Notation(),
      notes: range.getNotes(),
      numRows: range.getNumRows(),
      numCols: range.getNumColumns()
    });
  }

  // ── Writing ──

  function rangeWrite(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);
    const values = params.values;
    if (!Array.isArray(values) || values.length === 0) return err('BAD_REQUEST', 'values must be a non-empty 2D array');

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    const sheet = r.sheet;
    try {
      let range = sheet.getRange(rangeStr);
      let numRows = range.getNumRows(), numCols = range.getNumColumns();
      if (rangeStr.indexOf(':') === -1) {
        numRows = Math.min(values.length, sheet.getMaxRows() - range.getRow() + 1);
        numCols = Math.min(values[0].length, sheet.getMaxColumns() - range.getColumn() + 1);
        range = sheet.getRange(range.getRow(), range.getColumn(), numRows, numCols);
      }
      const padded = [];
      for (let i = 0; i < numRows; i++) {
        const row = [];
        for (let j = 0; j < numCols; j++) row.push((i < values.length && j < values[i].length) ? values[i][j] : '');
        padded.push(row);
      }
      range.setValues(padded);
      return ok({ sheetName: sheet.getName(), range: range.getA1Notation(), rowsWritten: numRows, colsWritten: numCols });
    } catch(e) { return err('WRITE_FAILED', `Could not write to range: ${e.message}`); }
  }

  function rowsAppend(params) {
    const id = requireParam(params, 'spreadsheetId');
    const sheetName = optionalString(params, 'sheetName', null);
    const values = params.values;
    if (!Array.isArray(values) || values.length === 0) return err('BAD_REQUEST', 'values must be a non-empty 2D array');

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    const sheet = r.sheet;
    try {
      if (values.length === 1) {
        sheet.appendRow(values[0]);
      } else {
        const lastRow = sheet.getLastRow();
        const startRow = lastRow === 0 ? 1 : lastRow + 1;
        sheet.getRange(startRow, 1, values.length, values[0].length).setValues(values);
      }
      return ok({ sheetName: sheet.getName(), rowsAppended: values.length });
    } catch(e) { return err('WRITE_FAILED', `Could not append rows: ${e.message}`); }
  }

  function rangeClear(params) {
    const id = requireParam(params, 'spreadsheetId');
    const sheetName = optionalString(params, 'sheetName', null);
    const rangeStr = optionalString(params, 'range', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    try {
      if (rangeStr) { r.sheet.getRange(rangeStr).clearContent(); }
      else { r.sheet.clearContents(); }
      return ok({ sheetName: r.sheet.getName(), cleared: rangeStr || '(all)' });
    } catch(e) { return err('CLEAR_FAILED', `Could not clear range: ${e.message}`); }
  }

  function formulaSet(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const formula = requireParam(params, 'formula');
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    try {
      const range = r.sheet.getRange(rangeStr);
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
      return ok({ sheetName: r.sheet.getName(), range: range.getA1Notation(), formula: formula });
    } catch(e) { return err('WRITE_FAILED', `Could not set formula: ${e.message}`); }
  }

  // ── Formatting ──

  function rangeFormat(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    try {
      const range = r.sheet.getRange(rangeStr);
      const applied = [];

      if (params.background !== undefined) { range.setBackground(String(params.background)); applied.push('background'); }
      if (params.fontColor !== undefined) { range.setFontColor(String(params.fontColor)); applied.push('fontColor'); }
      if (params.fontFamily !== undefined) { range.setFontFamily(String(params.fontFamily)); applied.push('fontFamily'); }
      if (params.fontSize !== undefined) { range.setFontSize(Number(params.fontSize)); applied.push('fontSize'); }
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

      return ok({ sheetName: r.sheet.getName(), range: range.getA1Notation(), applied: applied });
    } catch(e) { return err('FORMAT_FAILED', `Could not format range: ${e.message}`); }
  }

  function rangeMerge(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    try {
      r.sheet.getRange(rangeStr).merge();
      return ok({ sheetName: r.sheet.getName(), range: rangeStr, merged: true });
    } catch(e) { return err('MERGE_FAILED', `Could not merge: ${e.message}`); }
  }

  function rangeUnmerge(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    try {
      r.sheet.getRange(rangeStr).breakApart();
      return ok({ sheetName: r.sheet.getName(), range: rangeStr, unmerged: true });
    } catch(e) { return err('UNMERGE_FAILED', `Could not unmerge: ${e.message}`); }
  }

  function columnWidth(params) {
    const id = requireParam(params, 'spreadsheetId');
    const col = Number(requireParam(params, 'column'));
    const width = Number(requireParam(params, 'width'));
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    try {
      r.sheet.setColumnWidth(col, width);
      return ok({ sheetName: r.sheet.getName(), column: col, width: width });
    } catch(e) { return err('UPDATE_FAILED', `Could not set column width: ${e.message}`); }
  }

  function freezeRows(params) {
    const id = requireParam(params, 'spreadsheetId');
    const numRows = Number(requireParam(params, 'numRows'));
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    try {
      r.sheet.setFrozenRows(numRows);
      return ok({ sheetName: r.sheet.getName(), frozenRows: numRows });
    } catch(e) { return err('UPDATE_FAILED', `Could not freeze rows: ${e.message}`); }
  }

  // ── Sorting ──

  function rangeSort(params) {
    const id = requireParam(params, 'spreadsheetId');
    const rangeStr = requireParam(params, 'range');
    const sortCol = Number(requireParam(params, 'sortColumn'));
    const asc = optionalBool(params, 'ascending', true);
    const sheetName = optionalString(params, 'sheetName', null);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    try {
      const range = r.sheet.getRange(rangeStr);
      range.sort({ column: sortCol, ascending: asc });
      return ok({ sheetName: r.sheet.getName(), range: rangeStr, sortColumn: sortCol, ascending: asc });
    } catch(e) { return err('SORT_FAILED', `Could not sort: ${e.message}`); }
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
    const width = optionalNumber(params, 'width', 600);
    const height = optionalNumber(params, 'height', 400);
    const legendPos = optionalString(params, 'legendPosition', 'RIGHT');
    const stacked = optionalBool(params, 'stacked', false);

    const r = resolveSheet(id, sheetName);
    if (r.err) return err(r.err, r.msg);

    try {
      const dataRange = r.sheet.getRange(rangeStr);
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
      return ok({ chartType: chartType, position: position, width: width, height: height });
    } catch(e) { return err('CREATE_FAILED', `Could not create chart: ${e.message}`); }
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

    try {
      if (note === '') {
        r.sheet.getRange(rangeStr).clearNote();
        return ok({ sheetName: r.sheet.getName(), range: rangeStr, cleared: true });
      }
      r.sheet.getRange(rangeStr).setNote(note);
      return ok({ sheetName: r.sheet.getName(), range: rangeStr, note: note });
    } catch(e) { return err('UPDATE_FAILED', `Could not set note: ${e.message}`); }
  }

  // ── Batch ──

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
        results.push({ index: i, success: false, error: { code: 'BAD_REQUEST', message: `Missing action at index ${i}` }});
        continue;
      }
      try {
        const result = handle(op.action, op.params || {});
        results.push({ index: i, action: op.action, success: result.success, data: result.success ? result.data : undefined, error: result.success ? undefined : result.error });
      } catch(ex) {
        results.push({ index: i, action: op.action, success: false, error: { code: 'INTERNAL_ERROR', message: ex.message || String(ex) }});
      }
    }
    return ok({ results: results });
  }

  return { handle: handle };
})();
