const DocsService = (() => {
  const ACTION_POLICIES = {
    documentGet: { class: 'read', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    documentGetJson: { class: 'read', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    documentCreate: { class: 'write' },
    paragraphInsert: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    paragraphUpdate: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    replaceText: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    listInsert: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    tableInsert: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    imageInsert: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    pageBreakInsert: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    horizontalRuleInsert: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    formatText: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    headerSet: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    footerSet: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    pageSetupGet: { class: 'read', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    pageSetupUpdate: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    bookmarksList: { class: 'read', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    bookmarkCreate: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    bookmarkDelete: { class: 'destructive', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    namedRangesList: { class: 'read', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    namedRangeCreate: { class: 'write', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    namedRangeDelete: { class: 'destructive', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    tableOfContentsList: { class: 'read', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    setText: { class: 'destructive', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    paragraphDelete: { class: 'destructive', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
    batch: { class: 'read', allowlists: [{ property: 'ALLOWED_DOCUMENT_IDS', params: ['documentId'] }] },
  }

  const BATCH_ACTIONS = {
    documentGet: true, documentGetJson: true, paragraphInsert: true,
    paragraphUpdate: true, paragraphDelete: true, setText: true,
    replaceText: true, listInsert: true, tableInsert: true,
    imageInsert: true, pageBreakInsert: true, horizontalRuleInsert: true,
    formatText: true, headerSet: true, footerSet: true,
    pageSetupGet: true, pageSetupUpdate: true, bookmarksList: true,
    bookmarkCreate: true, bookmarkDelete: true, namedRangesList: true,
    namedRangeCreate: true, namedRangeDelete: true, tableOfContentsList: true,
  }

  const LIMITS = {
    paragraphs: 500,
    documentChars: 500000,
    responseBytes: 1000000,
    documentJsonBytes: 1000000,
    imageBytes: 10000000,
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

  function err(code, message, correlationId) { return { success: false, error: { code: code, message: message, correlationId: correlationId } }; }

  function limitExceeded(name, requested, max) {
    return err('LIMIT_EXCEEDED', `${name} limit exceeded: requested ${requested}, max ${max}`);
  }

  function getPolicyList(propertyName) {
    const raw = PropertiesService.getScriptProperties().getProperty(propertyName);
    return raw ? raw.split(',').map(function(value) { return value.trim().toLowerCase(); }).filter(Boolean) : [];
  }

  function isAllowedHost(host, propertyNames) {
    let allowlist = [];
    for (let i = 0; i < propertyNames.length; i++) allowlist = allowlist.concat(getPolicyList(propertyNames[i]));
    if (allowlist.length === 0) return true;
    const normalized = String(host || '').toLowerCase();
    for (let i = 0; i < allowlist.length; i++) {
      const allowed = allowlist[i].replace(/^\*\./, '');
      if (normalized === allowed || normalized.endsWith('.' + allowed)) return true;
    }
    return false;
  }

  function fetchImageBlob(imageUrl, hostProperties) {
    const parsed = parseHttpsUrl(imageUrl);
    if (!parsed) return { error: err('BAD_REQUEST', 'imageUrl must use https and be a valid URL') };
    if (!isAllowedHost(parsed.hostname, hostProperties)) return { error: err('ACTION_NOT_ALLOWED', 'imageUrl host is outside the configured allowlist') };

    const response = UrlFetchApp.fetch(parsed.url, { muteHttpExceptions: true, followRedirects: true });
    const status = response.getResponseCode();
    if (status < 200 || status >= 300) return { error: err('BAD_REQUEST', 'imageUrl fetch failed with HTTP ' + status) };
    const headers = response.getHeaders ? response.getHeaders() : {};
    const contentType = String(headers['Content-Type'] || headers['content-type'] || response.getBlob().getContentType() || '').toLowerCase();
    if (contentType.indexOf('image/') !== 0) return { error: err('BAD_REQUEST', 'imageUrl must return an image content type') };
    const bytes = response.getContent().length;
    if (bytes > LIMITS.imageBytes) return { error: limitExceeded('image bytes', bytes, LIMITS.imageBytes) };
    return { blob: response.getBlob() };
  }

  function parseHttpsUrl(value) {
    const url = String(value || '').trim();
    const match = url.match(/^https:\/\/([^\s\/?#@:]+)(?::\d+)?(?:[\/?#]|$)/i);
    if (!match) return null;
    return { url: url, hostname: match[1].toLowerCase() };
  }

  function trap(fn, errorCode, errorMsg) {
    try {
      const result = fn();
      return result && typeof result.success === 'boolean' ? result : ok(result);
    }
    catch (e) {
      const correlationId = Utilities.getUuid();
      console.error('[docs-proxy] correlationId=%s code=%s error=%s', correlationId, errorCode, e && e.message ? e.message : String(e));
      const message = typeof errorMsg === 'string' ? errorMsg : `${errorCode} failed. See Apps Script logs with correlationId ${correlationId}.`;
      return err(errorCode, message, correlationId);
    }
  }

  function runBatch(handle) {
    return function batch(params) {
      const documentId = requireParam(params, 'documentId');
      const operations = params.operations;
      if (!Array.isArray(operations) || operations.length === 0) return err('BAD_REQUEST', 'operations must be a non-empty array');
      if (operations.length > 20) return limitExceeded('batch operations', operations.length, 20);

      const results = [];
      let operationWeight = 1;
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        const invalid = validateBatchOperation_(op, i, BATCH_ACTIONS);
        if (invalid) { results.push(invalid); continue; }
        operationWeight += actionWeightForPolicy(op.action, ACTION_POLICIES, op.params || {});
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
          const correlationId = Utilities.getUuid();
          console.error('[docs-proxy] correlationId=%s batchAction=%s error=%s', correlationId, op.action, ex && ex.message ? ex.message : String(ex));
          results.push({
            index: i,
            action: op.action,
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Batch operation failed. See Apps Script logs with correlationId ' + correlationId + '.', correlationId: correlationId },
          });
        }
      }
      const response = batchResponse_(results, operationWeight);
      const payload = JSON.stringify(response);
      if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes);
      return response;
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
    if (paras.length > LIMITS.paragraphs) return { error: limitExceeded('document paragraphs', paras.length, LIMITS.paragraphs) };
    const paragraphList = [];
    let charCount = 0;
    for (const p of paras) {
      const text = p.getText().replace(/\n+$/, '');
      charCount += text.length;
      if (charCount > LIMITS.documentChars) return { error: limitExceeded('document characters', charCount, LIMITS.documentChars) };
      const heading = HEADING_MAP_REVERSE.get(p.getHeading()) ?? 'NORMAL';
      paragraphList.push({ index: paragraphList.length, text, heading });
    }
    return { paragraphs: paragraphList, charCount: charCount };
  }

  function fetchDocumentJSON(doc) {
    const parsed = paragraphsToJSON(doc.getBody().getParagraphs());
    if (parsed.error) return parsed.error;
    return {
      id: doc.getId(),
      name: doc.getName(),
      url: doc.getUrl(),
      numParagraphs: parsed.paragraphs.length,
      charCount: parsed.charCount,
      paragraphs: parsed.paragraphs,
    };
  }

  function resolveParagraph(doc, paragraphIndex) {
    const index = Number(paragraphIndex);
    if (!Number.isInteger(index) || index < 0) return { error: err('BAD_REQUEST', 'paragraphIndex must be a non-negative integer') };
    const paragraphs = doc.getBody().getParagraphs();
    if (index >= paragraphs.length) return { error: err('NOT_FOUND', `Paragraph index out of range: ${index}`) };
    return { paragraph: paragraphs[index], paragraphIndex: index };
  }

  function paragraphIndexForElement(body, element) {
    let current = element;
    while (current && current.getType && current.getType() !== DocumentApp.ElementType.PARAGRAPH) {
      current = current.getParent ? current.getParent() : null;
    }
    if (!current) return null;
    const paragraphs = body.getParagraphs();
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i] === current) return i;
    }
    return null;
  }

  function pageSetupToJSON(body) {
    return {
      pageWidth: body.getPageWidth(),
      pageHeight: body.getPageHeight(),
      marginTop: body.getMarginTop(),
      marginBottom: body.getMarginBottom(),
      marginLeft: body.getMarginLeft(),
      marginRight: body.getMarginRight(),
    };
  }

  function setBodyNumber(body, params, name, setterName, min, changes) {
    if (params[name] === undefined) return null;
    const value = Number(params[name]);
    if (!isFinite(value) || value < min || value > 2000) return err('BAD_REQUEST', `${name} must be a point value between ${min} and 2000`);
    body[setterName](value);
    changes.push(name);
    return null;
  }

  function bookmarkToJSON(doc, bookmark) {
    const position = bookmark.getPosition();
    const element = position ? position.getElement() : null;
    const paragraphIndex = element ? paragraphIndexForElement(doc.getBody(), element) : null;
    return {
      id: bookmark.getId(),
      paragraphIndex,
      offset: position ? position.getOffset() : null,
      elementType: element && element.getType ? element.getType().toString() : null,
    };
  }

  function rangeToJSON(doc, range) {
    const body = doc.getBody();
    const elements = range.getRangeElements().map(function(rangeElement) {
      const element = rangeElement.getElement();
      let text = null;
      try { text = element.asText ? element.asText().getText() : null; } catch (t) {}
      return {
        elementType: element && element.getType ? element.getType().toString() : null,
        paragraphIndex: paragraphIndexForElement(body, element),
        isPartial: rangeElement.isPartial(),
        startOffset: rangeElement.isPartial() ? rangeElement.getStartOffset() : null,
        endOffsetInclusive: rangeElement.isPartial() ? rangeElement.getEndOffsetInclusive() : null,
        textPreview: text === null ? null : text.substring(0, 200),
      };
    });
    return { elements };
  }

  function namedRangeToJSON(doc, namedRange) {
    return {
      id: namedRange.getId(),
      name: namedRange.getName(),
      range: rangeToJSON(doc, namedRange.getRange()),
    };
  }

  // ── Document management ──

  function documentCreate(params) {
    const name = requireParam(params, 'name');
    return trap(
      () => {
        const doc = DocumentApp.create(name);
        const document = fetchDocumentJSON(doc);
        if (document && document.success === false) return document;
        return { document: document };
      },
      'CREATE_FAILED',
      `Could not create document: ${name}`
    );
  }

  function documentGet(params) {
    const id = requireParam(params, 'documentId');
    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);
    const document = fetchDocumentJSON(doc);
    if (document && document.success === false) return document;
    return ok({ document: document });
  }

  function documentGetJson(params) {
    const id = requireParam(params, 'documentId');
    validateDocumentId(id);
    return trap(
      () => {
        const doc = Docs.Documents.get(id);
        const bytes = JSON.stringify(doc || {}).length;
        if (bytes > LIMITS.documentJsonBytes) return limitExceeded('document JSON bytes', bytes, LIMITS.documentJsonBytes);
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
    const fetched = fetchImageBlob(imageUrl, ['ALLOWED_IMAGE_HOSTS', 'ALLOWED_DOCS_IMAGE_HOSTS']);
    if (fetched.error) return fetched.error;

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        append ? body.appendImage(fetched.blob) : body.insertImage(0, fetched.blob);
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

  // ── Structure ──

  function pageSetupGet(params) {
    const id = requireParam(params, 'documentId');
    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);
    return ok({ documentId: id, pageSetup: pageSetupToJSON(doc.getBody()) });
  }

  function pageSetupUpdate(params) {
    const id = requireParam(params, 'documentId');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        const changes = [];
        let failed = setBodyNumber(body, params, 'pageWidth', 'setPageWidth', 1, changes);
        if (failed) return failed;
        failed = setBodyNumber(body, params, 'pageHeight', 'setPageHeight', 1, changes);
        if (failed) return failed;
        failed = setBodyNumber(body, params, 'marginTop', 'setMarginTop', 0, changes);
        if (failed) return failed;
        failed = setBodyNumber(body, params, 'marginBottom', 'setMarginBottom', 0, changes);
        if (failed) return failed;
        failed = setBodyNumber(body, params, 'marginLeft', 'setMarginLeft', 0, changes);
        if (failed) return failed;
        failed = setBodyNumber(body, params, 'marginRight', 'setMarginRight', 0, changes);
        if (failed) return failed;
        if (changes.length === 0) return err('BAD_REQUEST', 'Provide at least one page setup field to update');
        return { documentId: id, changes, pageSetup: pageSetupToJSON(body) };
      },
      'UPDATE_FAILED',
      (e) => `Could not update page setup: ${e.message}`
    );
  }

  function bookmarksList(params) {
    const id = requireParam(params, 'documentId');
    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);
    return trap(
      () => ({ bookmarks: doc.getBookmarks().map(function(bookmark) { return bookmarkToJSON(doc, bookmark); }) }),
      'READ_FAILED',
      (e) => `Could not list bookmarks: ${e.message}`
    );
  }

  function bookmarkCreate(params) {
    const id = requireParam(params, 'documentId');
    const paragraphIndex = requireParam(params, 'paragraphIndex');
    const offset = optionalNumber(params, 'offset', 0);

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);
    const resolved = resolveParagraph(doc, paragraphIndex);
    if (resolved.error) return resolved.error;

    return trap(
      () => {
        const text = resolved.paragraph.editAsText();
        const textLength = text.getText().length;
        if (!Number.isInteger(offset) || offset < 0 || offset > textLength) return err('BAD_REQUEST', `offset must be between 0 and ${textLength}`);
        const bookmark = doc.addBookmark(doc.newPosition(text, offset));
        return { bookmark: bookmarkToJSON(doc, bookmark) };
      },
      'CREATE_FAILED',
      (e) => `Could not create bookmark: ${e.message}`
    );
  }

  function bookmarkDelete(params) {
    const id = requireParam(params, 'documentId');
    const bookmarkId = requireParam(params, 'bookmarkId');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);
    return trap(
      () => {
        const bookmark = doc.getBookmark(bookmarkId);
        if (!bookmark) return err('NOT_FOUND', `Bookmark not found: ${bookmarkId}`);
        bookmark.remove();
        return { deleted: true, bookmarkId };
      },
      'DELETE_FAILED',
      (e) => `Could not delete bookmark: ${e.message}`
    );
  }

  function namedRangesList(params) {
    const id = requireParam(params, 'documentId');
    const name = optionalString(params, 'name', null);

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);
    return trap(
      () => {
        const ranges = name ? doc.getNamedRanges(name) : doc.getNamedRanges();
        return { namedRanges: ranges.map(function(namedRange) { return namedRangeToJSON(doc, namedRange); }) };
      },
      'READ_FAILED',
      (e) => `Could not list named ranges: ${e.message}`
    );
  }

  function namedRangeCreate(params) {
    const id = requireParam(params, 'documentId');
    const name = requireParam(params, 'name');
    const paragraphIndex = requireParam(params, 'paragraphIndex');
    const hasStart = params.startOffset !== undefined;
    const hasEnd = params.endOffsetInclusive !== undefined;

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);
    const resolved = resolveParagraph(doc, paragraphIndex);
    if (resolved.error) return resolved.error;

    return trap(
      () => {
        const builder = doc.newRange();
        if (hasStart || hasEnd) {
          if (!hasStart || !hasEnd) return err('BAD_REQUEST', 'Provide both startOffset and endOffsetInclusive for partial named ranges');
          const start = Number(params.startOffset);
          const end = Number(params.endOffsetInclusive);
          const text = resolved.paragraph.editAsText();
          const textLength = text.getText().length;
          if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= textLength) {
            return err('BAD_REQUEST', `Offsets must be integers between 0 and ${Math.max(textLength - 1, 0)}, with endOffsetInclusive >= startOffset`);
          }
          builder.addElement(text, start, end);
        } else {
          builder.addElement(resolved.paragraph);
        }
        const namedRange = doc.addNamedRange(name, builder.build());
        return { namedRange: namedRangeToJSON(doc, namedRange) };
      },
      'CREATE_FAILED',
      (e) => `Could not create named range: ${e.message}`
    );
  }

  function namedRangeDelete(params) {
    const id = requireParam(params, 'documentId');
    const namedRangeId = requireParam(params, 'namedRangeId');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);
    return trap(
      () => {
        const namedRange = doc.getNamedRangeById(namedRangeId);
        if (!namedRange) return err('NOT_FOUND', `Named range not found: ${namedRangeId}`);
        namedRange.remove();
        return { deleted: true, namedRangeId };
      },
      'DELETE_FAILED',
      (e) => `Could not delete named range: ${e.message}`
    );
  }

  function tableOfContentsList(params) {
    const id = requireParam(params, 'documentId');

    const doc = getDocument(id);
    if (!doc) return err('NOT_FOUND', `Document not found: ${id}`);

    return trap(
      () => {
        const body = doc.getBody();
        const tablesOfContents = [];
        for (let i = 0; i < body.getNumChildren(); i++) {
          const child = body.getChild(i);
          if (child.getType && child.getType().toString() === 'TABLE_OF_CONTENTS') {
            const text = safeText(child);
            tablesOfContents.push({
              childIndex: i,
              textPreview: text.substring(0, 500),
              textLength: text.length,
            });
          }
        }
        return { tablesOfContents };
      },
      'READ_FAILED',
      (e) => `Could not list tables of contents: ${e.message}`
    );
  }

  function safeText(element) {
    try { return element.getText ? element.getText() : ''; } catch (e) { return ''; }
  }

  const ACTIONS = {
    documentCreate, documentGet, documentGetJson, paragraphInsert,
    paragraphUpdate, paragraphDelete, setText, replaceText, listInsert,
    tableInsert, imageInsert, pageBreakInsert, horizontalRuleInsert,
    formatText, headerSet, footerSet, pageSetupGet, pageSetupUpdate,
    bookmarksList, bookmarkCreate, bookmarkDelete, namedRangesList,
    namedRangeCreate, namedRangeDelete, tableOfContentsList,
    batch: function(params) { return runBatch(handle)(params); },
  }

  return { handle, requestWeight };
})();
