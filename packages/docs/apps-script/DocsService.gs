var DocsService = (function() {
  function handle(action, params) {
    switch (action) {
      case 'documentCreate':     return documentCreate(params)
      case 'documentGet':        return documentGet(params)
      case 'paragraphInsert':    return paragraphInsert(params)
      case 'setText':            return setText(params)
      case 'replaceText':        return replaceText(params)
      case 'listInsert':         return listInsert(params)
      case 'tableInsert':        return tableInsert(params)
      case 'imageInsert':        return imageInsert(params)
      case 'pageBreakInsert':    return pageBreakInsert(params)
      case 'horizontalRuleInsert': return horizontalRuleInsert(params)
      case 'formatText':         return formatText(params)
      case 'batch':              return batch(params)
      default: return err('UNKNOWN_ACTION', 'Unknown action: ' + action)
    }
  }

  function requireParam(params, name) {
    var val = params[name]
    if (val === undefined || val === null) throw new Error('Missing required parameter: ' + name)
    if (typeof val === 'string' && !val.trim()) throw new Error('Missing required parameter: ' + name)
    return typeof val === 'string' ? val.trim() : val
  }

  function optionalString(params, name, def) {
    return typeof params[name] === 'string' ? (params[name]).trim() || def : def
  }

  function optionalNumber(params, name, def) {
    var val = params[name]
    if (typeof val === 'number' && !isNaN(val)) return val
    if (typeof val === 'string' && !isNaN(Number(val))) return Number(val)
    return def
  }

  function optionalBool(params, name, def) {
    if (typeof params[name] === 'boolean') return params[name]
    if (params[name] === 'true') return true
    if (params[name] === 'false') return false
    return def
  }

  function validateDocumentId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid document ID: ' + id)
  }

  function getDocument(id) {
    validateDocumentId(id)
    try { return DocumentApp.openById(id) }
    catch(e) { return null }
  }

  var HEADING_MAP = {
    NORMAL: DocumentApp.ParagraphHeading.NORMAL,
    HEADING1: DocumentApp.ParagraphHeading.HEADING1,
    HEADING2: DocumentApp.ParagraphHeading.HEADING2,
    HEADING3: DocumentApp.ParagraphHeading.HEADING3,
    HEADING4: DocumentApp.ParagraphHeading.HEADING4,
    HEADING5: DocumentApp.ParagraphHeading.HEADING5,
    HEADING6: DocumentApp.ParagraphHeading.HEADING6
  }

  function documentToJSON(doc) {
    var paras = doc.getBody().getParagraphs()
    var paragraphList = []
    for (var i = 0; i < paras.length; i++) {
      var p = paras[i]
      var text = p.getText().replace(/\n+$/, '')
      var h = p.getHeading()
      var heading = 'NORMAL'
      for (var key in HEADING_MAP) { if (HEADING_MAP[key] === h) { heading = key; break } }
      paragraphList.push({ index: i, text: text, heading: heading })
    }
    return { id: doc.getId(), name: doc.getName(), url: doc.getUrl(), numParagraphs: paragraphList.length, paragraphs: paragraphList }
  }

  // ── Document management ──

  function documentCreate(params) {
    var name = requireParam(params, 'name')
    try {
      var doc = DocumentApp.create(name)
      return ok({ document: documentToJSON(doc) })
    } catch(e) { return err('CREATE_FAILED', 'Could not create document: ' + name) }
  }

  function documentGet(params) {
    var id = requireParam(params, 'documentId')
    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)
    return ok({ document: documentToJSON(doc) })
  }

  // ── Writing ──

  function paragraphInsert(params) {
    var id = requireParam(params, 'documentId')
    var text = optionalString(params, 'text', null)
    var heading = optionalString(params, 'heading', 'NORMAL')
    var append = optionalBool(params, 'append', true)

    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)

    try {
      var body = doc.getBody()
      var par
      if (append) {
        par = body.appendParagraph(text || '')
      } else {
        par = body.insertParagraph(0, text || '')
      }
      if (heading !== 'NORMAL') par.setHeading(HEADING_MAP[heading] || DocumentApp.ParagraphHeading.NORMAL)
      return ok({ text: text || '', heading: heading, appended: append })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert paragraph: ' + e.message) }
  }

  function setText(params) {
    var id = requireParam(params, 'documentId')
    var text = requireParam(params, 'text')

    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)

    try {
      doc.getBody().setText(text)
      return ok({ set: true })
    } catch(e) { return err('WRITE_FAILED', 'Could not set text: ' + e.message) }
  }

  function replaceText(params) {
    var id = requireParam(params, 'documentId')
    var findText = requireParam(params, 'findText')
    var replaceText = requireParam(params, 'replaceText')

    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)

    try {
      var count = 0
      var body = doc.getBody()
      var found = body.findText(findText)
      while (found) {
        found.getElement().asText().replaceText(findText, replaceText)
        count++
        found = body.findText(findText, found)
      }
      return ok({ replacements: count })
    } catch(e) { return err('REPLACE_FAILED', 'Could not replace text: ' + e.message) }
  }

  // ── Content ──

  function listInsert(params) {
    var id = requireParam(params, 'documentId')
    var items = params.items
    if (!Array.isArray(items) || items.length === 0) return err('BAD_REQUEST', 'items must be a non-empty array')
    var listType = optionalString(params, 'listType', 'BULLET')
    var append = optionalBool(params, 'append', true)

    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)

    try {
      var body = doc.getBody()
      for (var i = 0; i < items.length; i++) {
        var li = append ? body.appendListItem(String(items[i])) : body.insertListItem(append ? body.getNumChildren() : i, String(items[i]))
        if (listType === 'NUMBER') li.setGlyphType(DocumentApp.GlyphType.NUMBER)
      }
      return ok({ items: items.length, listType: listType })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert list: ' + e.message) }
  }

  function tableInsert(params) {
    var id = requireParam(params, 'documentId')
    var values = params.values
    if (!Array.isArray(values) || values.length === 0) return err('BAD_REQUEST', 'values must be a non-empty 2D array')
    var rows = optionalNumber(params, 'rows', values.length)
    var cols = optionalNumber(params, 'cols', values[0].length)
    var append = optionalBool(params, 'append', true)

    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)

    try {
      var body = doc.getBody()
      var table = append ? body.appendTable() : body.insertTable(0)
      var numRows = Math.max(rows, 1)
      var numCols = Math.max(cols, 1)

      while (table.getNumRows() < numRows) table.appendTableRow()
      try {
        while (table.getRow(0).getNumCells() < numCols) {
          for (var r = 0; r < table.getNumRows(); r++) table.getRow(r).appendTableCell('')
        }
      } catch(e) {
        for (var r2 = 0; r2 < numRows; r2++) {
          var row = table.getRow(r2)
          while (row.getNumCells() < numCols) row.appendTableCell('')
        }
      }

      for (var i = 0; i < Math.min(numRows, values.length); i++) {
        for (var j = 0; j < Math.min(numCols, values[i].length); j++) {
          try { table.getCell(i, j).setText(String(values[i][j] || '')) } catch(cellErr) {}
        }
      }

      if (values.length > 0) {
        var headerRow = table.getRow(0)
        for (var k = 0; k < headerRow.getNumCells(); k++) {
          try { headerRow.getCell(k).editAsText().setBold(true) } catch(hdr) {}
        }
      }

      return ok({ rows: numRows, cols: numCols })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert table: ' + e.message) }
  }

  function imageInsert(params) {
    var id = requireParam(params, 'documentId')
    var imageUrl = requireParam(params, 'imageUrl')
    var append = optionalBool(params, 'append', true)

    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)

    try {
      var blob = UrlFetchApp.fetch(imageUrl).getBlob()
      var body = doc.getBody()
      var img = append ? body.appendImage(blob) : body.insertImage(0, blob)
      return ok({ inserted: true })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert image: ' + e.message) }
  }

  function pageBreakInsert(params) {
    var id = requireParam(params, 'documentId')
    var append = optionalBool(params, 'append', true)

    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)

    try {
      var body = doc.getBody()
      if (append) body.appendPageBreak()
      else body.insertPageBreak(0)
      return ok({ inserted: true })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert page break: ' + e.message) }
  }

  function horizontalRuleInsert(params) {
    var id = requireParam(params, 'documentId')
    var append = optionalBool(params, 'append', true)

    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)

    try {
      var body = doc.getBody()
      if (append) body.appendHorizontalRule()
      else body.insertHorizontalRule(0)
      return ok({ inserted: true })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert horizontal rule: ' + e.message) }
  }

  // ── Formatting ──

  function formatText(params) {
    var id = requireParam(params, 'documentId')
    var findText = requireParam(params, 'findText')

    var doc = getDocument(id)
    if (!doc) return err('NOT_FOUND', 'Document not found: ' + id)

    try {
      var body = doc.getBody()
      var count = 0
      var found = body.findText(findText)
      while (found) {
        var el = found.getElement()
        if (el.editAsText) {
          var txt = el.asText()
          var start = found.getStartOffset()
          var end = found.getEndOffsetInclusive()

          if (params.bold !== undefined) txt.setBold(start, end, optionalBool(params, 'bold', false))
          if (params.italic !== undefined) txt.setItalic(start, end, optionalBool(params, 'italic', false))
          if (params.underline !== undefined) txt.setUnderline(start, end, optionalBool(params, 'underline', false))
          if (params.strikethrough !== undefined) txt.setStrikethrough(start, end, optionalBool(params, 'strikethrough', false))
          if (params.fontFamily !== undefined) txt.setFontFamily(start, end, String(params.fontFamily))
          if (params.fontSize !== undefined) txt.setFontSize(start, end, Number(params.fontSize))
          if (params.foregroundColor !== undefined) txt.setForegroundColor(start, end, String(params.foregroundColor))
          if (params.backgroundColor !== undefined) txt.setBackgroundColor(start, end, String(params.backgroundColor))
          if (params.linkUrl !== undefined) txt.setLinkUrl(start, end, String(params.linkUrl))
          count++
        }
        found = body.findText(findText, found)
      }
      return ok({ occurrences: count })
    } catch(e) { return err('FORMAT_FAILED', 'Could not format text: ' + e.message) }
  }

  // ── Batch ──

  function batch(params) {
    var documentId = requireParam(params, 'documentId')
    var operations = params.operations
    if (!Array.isArray(operations) || operations.length === 0) return err('BAD_REQUEST', 'operations must be a non-empty array')
    if (operations.length > 20) return err('BAD_REQUEST', 'Max 20 operations per batch')

    var results = []
    for (var i = 0; i < operations.length; i++) {
      var op = operations[i]
      if (!op.action) {
        results.push({ index: i, success: false, error: { code: 'BAD_REQUEST', message: 'Missing action at index ' + i }})
        continue
      }
      var opParams = op.params || {}
      if (!opParams.documentId) opParams.documentId = documentId
      try {
        var result = handle(op.action, opParams)
        results.push({ index: i, action: op.action, success: result.success, data: result.success ? result.data : undefined, error: result.success ? undefined : result.error })
      } catch(ex) {
        results.push({ index: i, action: op.action, success: false, error: { code: 'INTERNAL_ERROR', message: ex.message || String(ex) }})
      }
    }
    return ok({ results: results })
  }

  return { handle: handle }
})()
