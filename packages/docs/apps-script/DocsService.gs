const DocsService = (() => {
  function handle(action, params) {
    switch (action) {
      case 'documentCreate':       return documentCreate(params);
      case 'documentGet':          return documentGet(params);
      case 'documentGetJson':     return documentGetJson(params);
      case 'paragraphInsert':      return paragraphInsert(params);
      case 'paragraphUpdate':      return paragraphUpdate(params);
      case 'paragraphDelete':      return paragraphDelete(params);
      case 'setText':              return setText(params);
      case 'replaceText':          return replaceText(params);
      case 'listInsert':           return listInsert(params);
      case 'tableInsert':          return tableInsert(params);
      case 'imageInsert':          return imageInsert(params);
      case 'pageBreakInsert':      return pageBreakInsert(params);
      case 'horizontalRuleInsert': return horizontalRuleInsert(params);
      case 'formatText':           return formatText(params);
      case 'headerSet':            return headerSet(params);
      case 'footerSet':            return footerSet(params);
      case 'tocInsert':            return tocInsert(params);
      case 'footnoteInsert':       return footnoteInsert(params);
      case 'batch':                return runBatch(handle)(params);
      default: return err('UNKNOWN_ACTION', `Unknown action: ${action}`);
    }
  }

  function ok(data) { return { success: true, data }; }

  function err(code, message) { return { success: false, error: { code, message } }; }

  function trap(fn, errorCode, errorMsg) {
    try { return ok(fn()); }
    catch (e) { return err(errorCode, typeof errorMsg === 'function' ? errorMsg(e) : errorMsg); }
  }

  function runBatch(handle) {
    return function batch(params) {
      const documentId = requireParam(params, 'documentId');
      const operations = params.operations;
      if (!Array.isArray(operations) || operations.length === 0) return err('BAD_REQUEST', 'operations must be a non-empty array');
      if (operations.length > 20) return err('BAD_REQUEST', 'Max 20 operations per batch');

      const results = [];
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if (!op.action) {
          results.push({ index: i, success: false, error: { code: 'BAD_REQUEST', message: `Missing action at index ${i}` } });
          continue;
        }
        const opParams = op.params || {};
        if (!opParams.documentId) opParams.documentId = documentId;
        try {
          const result = handle(op.action, opParams);
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
    };
  }

  function requireParam(params, name) {
    const val = params[name];
    if (val === undefined || val === null) throw new Error(`Missing required parameter: ${name}`);
    if (typeof val === 'string' && !val.trim()) throw new Error(`Missing required parameter: ${name}`);
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
    const val = params[name];
    if (typeof val === 'boolean') return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return def;
  }

  function validateDocumentId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Invalid document ID: ${id}`);
  }

  function getDocument(id) {
    validateDocumentId(id);
    try { return DocumentApp.openById(id); }
    catch (e) { return null; }
  }

  const HEADING_MAP = {
    NORMAL: DocumentApp.ParagraphHeading.NORMAL,
    HEADING1: DocumentApp.ParagraphHeading.HEADING1,
    HEADING2: DocumentApp.ParagraphHeading.HEADING2,
    HEADING3: DocumentApp.ParagraphHeading.HEADING3,
    HEADING4: DocumentApp.ParagraphHeading.HEADING4,
    HEADING5: DocumentApp.ParagraphHeading.HEADING5,
    HEADING6: DocumentApp.ParagraphHeading.HEADING6,
  };

  const HEADING_MAP_REVERSE = new Map();
  for (const [k, v] of Object.entries(HEADING_MAP)) {
    HEADING_MAP_REVERSE.set(v, k);
  }

  function paragraphsToJSON(paras) {
    const paragraphList = [];
    for (const p of paras) {
      const text = p.getText().replace(/\n+$/, '');
      const heading = HEADING_MAP_REVERSE.get(p.getHeading()) ?? 'NORMAL';
      paragraphList.push({ index: paragraphList.length, text, heading });
    }
    return paragraphList;
  }

  function fetchDocumentJSON(doc) {
    const paragraphs = paragraphsToJSON(doc.getBody().getParagraphs());
    return {
      id: doc.getId(),
      name: doc.getName(),
      url: doc.getUrl(),
      numParagraphs: paragraphs.length,
      paragraphs: paragraphs,
    };
  }

  // ── Document management ──

  function documentCreate(params) {
    const name = requireParam(params, 'name');
    return trap(
      () => {
        const doc = DocumentApp.create(name);
        return { document: fetchDocumentJSON(doc) };
      },
      'CREATE_FAILED',
      `Could not create document: ${name}`
    );
  }

  function documentGet(params) {
    const id = requireParam(params, 'documentId');
    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);
    return ok({ document: fetchDocumentJSON(doc) });
  }

  function documentGetJson(params) {
    const id = requireParam(params, 'documentId');
    validateDocumentId(id);
    return trap(
      () => {
        const doc = Docs.Documents.get(id);
        return { document: doc };
      },
      'NOT_FOUND',
      `Document not found: ${id}`
    );
  }

  // ── Paragraph insert / update / delete ──

  function paragraphInsert(params) {
    const id = requireParam(params, 'documentId');
    const text = optionalString(params, 'text', null);
    const heading = optionalString(params, 'heading', 'NORMAL');
    const append = optionalBool(params, 'append', true);

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        const par = append
          ? body.appendParagraph(text || '')
          : body.insertParagraph(0, text || '');
        if (heading !== 'NORMAL') par.setHeading(HEADING_MAP[heading] ?? DocumentApp.ParagraphHeading.NORMAL);
        return { text: text || '', heading, appended: append };
      },
      'INSERT_FAILED',
      (e) => `Could not insert paragraph: ${e.message}`
    );
  }

  function paragraphUpdate(params) {
    const id = requireParam(params, 'documentId');
    const index = optionalNumber(params, 'paragraphIndex', -1);
    if (index < 0) return err('BAD_REQUEST', 'paragraphIndex must be a non-negative number');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        const paras = body.getParagraphs();
        if (index >= paras.length) throw new Error(`Paragraph index ${index} out of range (0-${paras.length - 1})`);

        const par = paras[index];
        const changes = [];

        if (params.text !== undefined) {
          par.setText(String(params.text));
          changes.push('text');
        }

        if (params.heading !== undefined) {
          const h = HEADING_MAP[params.heading];
          if (h === undefined) throw new Error(`Unknown heading: ${params.heading}`);
          par.setHeading(h);
          changes.push('heading');
        }

        if (changes.length === 0) throw new Error('No changes specified — provide text and/or heading');

        return { index, changes };
      },
      'UPDATE_FAILED',
      (e) => `Could not update paragraph: ${e.message}`
    );
  }

  function paragraphDelete(params) {
    const id = requireParam(params, 'documentId');
    const index = optionalNumber(params, 'paragraphIndex', -1);
    if (index < 0) return err('BAD_REQUEST', 'paragraphIndex must be a non-negative number');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        const paras = body.getParagraphs();
        if (index >= paras.length) throw new Error(`Paragraph index ${index} out of range (0-${paras.length - 1})`);

        body.removeChild(paras[index]);
        return { deleted: true, index };
      },
      'DELETE_FAILED',
      (e) => `Could not delete paragraph: ${e.message}`
    );
  }

  // ── Writing ──

  function setText(params) {
    const id = requireParam(params, 'documentId');
    const text = requireParam(params, 'text');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => { doc.getBody().setText(text); return { set: true }; },
      'WRITE_FAILED',
      (e) => `Could not set text: ${e.message}`
    );
  }

  function replaceText(params) {
    const id = requireParam(params, 'documentId');
    const findText = requireParam(params, 'findText');
    const replaceText = requireParam(params, 'replaceText');

    if (findText === replaceText) return ok({ replacements: 0 });

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        let count = 0;
        const body = doc.getBody();
        let found = body.findText(findText);
        while (found) {
          count++;
          found = body.findText(findText, found);
        }
        if (count > 0) body.replaceText(findText, replaceText);
        return { replacements: count };
      },
      'REPLACE_FAILED',
      (e) => `Could not replace text: ${e.message}`
    );
  }

  // ── Content ──

  function listInsert(params) {
    const id = requireParam(params, 'documentId');
    const items = params.items;
    if (!Array.isArray(items) || items.length === 0) return err('BAD_REQUEST', 'items must be a non-empty array');
    const listType = optionalString(params, 'listType', 'BULLET');
    const append = optionalBool(params, 'append', true);

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        for (let i = 0; i < items.length; i++) {
          const li = append
            ? body.appendListItem(String(items[i]))
            : body.insertListItem(i, String(items[i]));
          if (listType === 'NUMBER') li.setGlyphType(DocumentApp.GlyphType.NUMBER);
        }
        return { items: items.length, listType };
      },
      'INSERT_FAILED',
      (e) => `Could not insert list: ${e.message}`
    );
  }

  function tableInsert(params) {
    const id = requireParam(params, 'documentId');
    const values = params.values;
    if (!Array.isArray(values) || values.length === 0) return err('BAD_REQUEST', 'values must be a non-empty 2D array');
    const rows = optionalNumber(params, 'rows', values.length);
    const cols = optionalNumber(params, 'cols', values[0].length);
    const append = optionalBool(params, 'append', true);

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        const table = append ? body.appendTable() : body.insertTable(0);
        const numRows = Math.max(rows, 1);
        const numCols = Math.max(cols, 1);

        while (table.getNumRows() < numRows) table.appendTableRow();
        try {
          while (table.getRow(0).getNumCells() < numCols) {
            for (let r = 0; r < table.getNumRows(); r++) table.getRow(r).appendTableCell('');
          }
        } catch (e) {
          for (let r = 0; r < numRows; r++) {
            const row = table.getRow(r);
            while (row.getNumCells() < numCols) row.appendTableCell('');
          }
        }

        for (let i = 0; i < Math.min(numRows, values.length); i++) {
          for (let j = 0; j < Math.min(numCols, values[i].length); j++) {
            try { table.getCell(i, j).setText(String(values[i][j] || '')); } catch (cellErr) {}
          }
        }

        if (values.length > 0) {
          const headerRow = table.getRow(0);
          for (let k = 0; k < headerRow.getNumCells(); k++) {
            try { headerRow.getCell(k).editAsText().setBold(true); } catch (hdr) {}
          }
        }

        return { rows: numRows, cols: numCols };
      },
      'INSERT_FAILED',
      (e) => `Could not insert table: ${e.message}`
    );
  }

  function imageInsert(params) {
    const id = requireParam(params, 'documentId');
    const imageUrl = requireParam(params, 'imageUrl');
    const append = optionalBool(params, 'append', true);

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const blob = UrlFetchApp.fetch(imageUrl).getBlob();
        const body = doc.getBody();
        append ? body.appendImage(blob) : body.insertImage(0, blob);
        return { inserted: true };
      },
      'INSERT_FAILED',
      (e) => `Could not insert image: ${e.message}`
    );
  }

  function pageBreakInsert(params) {
    const id = requireParam(params, 'documentId');
    const append = optionalBool(params, 'append', true);

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        if (append) body.appendPageBreak();
        else body.insertPageBreak(0);
        return { inserted: true };
      },
      'INSERT_FAILED',
      (e) => `Could not insert page break: ${e.message}`
    );
  }

  function horizontalRuleInsert(params) {
    const id = requireParam(params, 'documentId');
    const append = optionalBool(params, 'append', true);

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        if (append) body.appendHorizontalRule();
        else body.insertHorizontalRule(0);
        return { inserted: true };
      },
      'INSERT_FAILED',
      (e) => `Could not insert horizontal rule: ${e.message}`
    );
  }

  // ── Formatting ──

  function formatText(params) {
    const id = requireParam(params, 'documentId');
    const findText = requireParam(params, 'findText');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        let count = 0;
        let found = body.findText(findText);
        while (found) {
          const el = found.getElement();
          if (el.editAsText) {
            const txt = el.asText();
            const start = found.getStartOffset();
            const end = found.getEndOffsetInclusive();

            if (params.bold !== undefined) txt.setBold(start, end, optionalBool(params, 'bold', false));
            if (params.italic !== undefined) txt.setItalic(start, end, optionalBool(params, 'italic', false));
            if (params.underline !== undefined) txt.setUnderline(start, end, optionalBool(params, 'underline', false));
            if (params.strikethrough !== undefined) txt.setStrikethrough(start, end, optionalBool(params, 'strikethrough', false));
            if (params.fontFamily !== undefined) txt.setFontFamily(start, end, String(params.fontFamily));
            if (params.fontSize !== undefined) txt.setFontSize(start, end, Number(params.fontSize));
            if (params.foregroundColor !== undefined) txt.setForegroundColor(start, end, String(params.foregroundColor));
            if (params.backgroundColor !== undefined) txt.setBackgroundColor(start, end, String(params.backgroundColor));
            if (params.linkUrl !== undefined) txt.setLinkUrl(start, end, String(params.linkUrl));
            count++;
          }
          found = body.findText(findText, found);
        }
        return { occurrences: count };
      },
      'FORMAT_FAILED',
      (e) => `Could not format text: ${e.message}`
    );
  }

  // ── Header / Footer ──

  function headerSet(params) {
    const id = requireParam(params, 'documentId');
    const text = typeof params.text === 'string' ? params.text : '';

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const header = doc.getHeader() ?? doc.addHeader();
        header.clear();
        if (text) header.appendParagraph(text);
        return { set: true, text };
      },
      'HEADER_FAILED',
      (e) => `Could not set header: ${e.message}`
    );
  }

  function footerSet(params) {
    const id = requireParam(params, 'documentId');
    const text = typeof params.text === 'string' ? params.text : '';

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const footer = doc.getFooter() ?? doc.addFooter();
        footer.clear();
        if (text) footer.appendParagraph(text);
        return { set: true, text };
      },
      'FOOTER_FAILED',
      (e) => `Could not set footer: ${e.message}`
    );
  }

  // ── Table of contents ──

  function tocInsert(params) {
    const id = requireParam(params, 'documentId');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const request = { insert_table_of_contents: {} };
        Docs.Documents.batchUpdate({ requests: [request] }, id);
        return { inserted: true };
      },
      'INSERT_FAILED',
      (e) => `Could not insert table of contents: ${e.message}`
    );
  }

  // ── Footnote ──

  function footnoteInsert(params) {
    const id = requireParam(params, 'documentId');
    const text = requireParam(params, 'text');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        Docs.Documents.batchUpdate({
          requests: [
            {
              create_footnote: {
                end_of_segment_location: { segment_id: '' },
                insertion_text: { text: String(text) }
              }
            }
          ]
        }, id);
        return { inserted: true };
      },
      'INSERT_FAILED',
      (e) => `Could not insert footnote: ${e.message}`
    );
  }

  return { handle };
})();
