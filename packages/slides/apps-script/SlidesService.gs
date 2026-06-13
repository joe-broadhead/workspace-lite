var SlidesService = (function() {
  function handle(action, params) {
    switch (action) {
      case 'presentationCreate':  return presentationCreate(params)
      case 'presentationGet':     return presentationGet(params)
      case 'slideAdd':            return slideAdd(params)
      case 'slideDelete':         return slideDelete(params)
      case 'slideDuplicate':      return slideDuplicate(params)
      case 'slideMove':           return slideMove(params)
      case 'textBoxInsert':       return textBoxInsert(params)
      case 'imageInsert':         return imageInsert(params)
      case 'shapeInsert':         return shapeInsert(params)
      case 'tableInsert':         return tableInsert(params)
      case 'slideElementsList':   return slideElementsList(params)
      case 'slideNotes':          return slideNotes(params)
      case 'textReplaceAll':      return textReplaceAll(params)
      case 'batch':               return batch(params)
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

  function validatePresentationId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid presentation ID: ' + id)
  }

  function getPresentation(id) {
    validatePresentationId(id)
    try { return SlidesApp.openById(id) }
    catch(e) { return null }
  }

  function getSlide(presentation, slideIndex) {
    var slides = presentation.getSlides()
    if (slideIndex < 0 || slideIndex >= slides.length) return null
    return slides[slideIndex]
  }

  function resolveSlide(presentationId, slideIndex) {
    var pres = getPresentation(presentationId)
    if (!pres) return { err: 'NOT_FOUND', msg: 'Presentation not found: ' + presentationId }
    var slide = getSlide(pres, slideIndex)
    if (!slide) return { err: 'NOT_FOUND', msg: 'Slide index out of range: ' + slideIndex }
    return { pres: pres, slide: slide }
  }

  function getLowestY(slide) {
    var elements = slide.getPageElements()
    var lowest = 0
    for (var i = 0; i < elements.length; i++) {
      var bottom = elements[i].getTop() + elements[i].getHeight()
      if (bottom > lowest) lowest = bottom
    }
    return lowest
  }

  function applyAutoPosition(r, params, fallbackLeft, fallbackTop, fallbackWidth, fallbackHeight) {
    if (params.left === undefined && params.top === undefined) {
      params.left = fallbackLeft
      params.top = Math.max(getLowestY(r.slide) + 8, fallbackTop)
      params.width = fallbackWidth
      params.height = fallbackHeight
    } else {
      if (params.left === undefined) params.left = fallbackLeft
      if (params.top === undefined) params.top = Math.max(getLowestY(r.slide) + 8, fallbackTop)
      if (params.width === undefined) params.width = fallbackWidth
      if (params.height === undefined) params.height = fallbackHeight
    }
  }

  function presentationToJSON(pres) {
    var slides = pres.getSlides()
    var list = []
    for (var i = 0; i < slides.length; i++) {
      var s = slides[i]
      var layout = s.getLayout()
      list.push({
        objectId: s.getObjectId(),
        index: i,
        layout: layout ? layout.getLayoutName() : null,
        numElements: s.getPageElements().length
      })
    }
    return { id: pres.getId(), name: pres.getName(), url: pres.getUrl(), pageWidth: pres.getPageWidth(), pageHeight: pres.getPageHeight(), numSlides: slides.length, slides: list }
  }

  function elementToJSON(el) {
    return {
      objectId: el.getObjectId(),
      type: el.getPageElementType().toString(),
      left: el.getLeft(),
      top: el.getTop(),
      width: el.getWidth(),
      height: el.getHeight()
    }
  }

  // ── Presentation management ──

  function presentationCreate(params) {
    var name = requireParam(params, 'name')
    try {
      var pres = SlidesApp.create(name)
      return ok({ presentation: presentationToJSON(pres) })
    } catch(e) { return err('CREATE_FAILED', 'Could not create presentation: ' + name) }
  }

  function presentationGet(params) {
    var id = requireParam(params, 'presentationId')
    var pres = getPresentation(id)
    if (!pres) return err('NOT_FOUND', 'Presentation not found: ' + id)
    return ok({ presentation: presentationToJSON(pres) })
  }

  // ── Slide management ──

  function slideAdd(params) {
    var id = requireParam(params, 'presentationId')
    var titleText = optionalString(params, 'titleText', null)
    var bodyText = optionalString(params, 'bodyText', null)

    var pres = getPresentation(id)
    if (!pres) return err('NOT_FOUND', 'Presentation not found: ' + id)

    try {
      var layouts = pres.getLayouts()
      var layout = layouts.length > 0 ? layouts[0] : null

      if (titleText && layouts.length > 1) {
        for (var i = 0; i < layouts.length; i++) {
          if (layouts[i].getLayoutName().toLowerCase().indexOf('title') >= 0) {
            layout = layouts[i]
            break
          }
        }
      }

      var slide
      if (pres.getSlides().length === 0) {
        slide = pres.getSlides()[0] // First slide uses default layout
        if (titleText) {
          var shapes = slide.getShapes()
          for (var j = 0; j < shapes.length; j++) {
            var text = shapes[j].getText()
            if (text) {
              try { text.setText(titleText); break } catch(t) {}
            }
          }
          if (bodyText) {
            for (var k = 0; k < shapes.length; k++) {
              var t2 = shapes[k].getText()
              if (t2 && t2.getStartIndex() === 0 && t2.getEndIndex() === titleText.length) {
                try { t2.appendText('\n\n' + bodyText) } catch(t) {}
                break
              }
            }
          }
        }
      } else {
        slide = pres.appendSlide(layout)
        if (titleText) {
          var titleShape = null
          var bodyShape = null
          var pageEls = slide.getPageElements()
          for (var m = 0; m < pageEls.length; m++) {
            var el = pageEls[m]
            if (el.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
              var shape = el.asShape()
              if (shape.getText()) {
                if (!titleShape) titleShape = shape
                else if (!bodyShape) bodyShape = shape
              }
            }
          }
          if (titleShape) {
            try { titleShape.getText().setText(titleText) } catch(t) {}
            if (bodyText && bodyShape) {
              try { bodyShape.getText().setText(bodyText) } catch(t) {}
            } else if (bodyText && titleShape) {
              try { titleShape.getText().appendText('\n' + bodyText) } catch(t) {}
            }
          } else {
            slide.insertTextBox(titleText + (bodyText ? '\n' + bodyText : ''))
          }
        } else if (bodyText) {
          var shapes = slide.getShapes()
          if (shapes.length > 0) {
            try { shapes[0].getText().setText(bodyText) } catch(t) { slide.insertTextBox(bodyText) }
          } else {
            slide.insertTextBox(bodyText)
          }
        }
      }

      return ok({ slideIndex: pres.getSlides().length - 1, objectId: slide.getObjectId(), layout: layout ? layout.getLayoutName() : 'default', bottomY: getLowestY(slide) + 8 })
    } catch(e) { return err('CREATE_FAILED', 'Could not add slide: ' + e.message) }
  }

  function slideDelete(params) {
    var id = requireParam(params, 'presentationId')
    var slideIndex = requireParam(params, 'slideIndex')

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    try {
      r.slide.remove()
      return ok({ deleted: true, slideIndex: slideIndex })
    } catch(e) { return err('DELETE_FAILED', 'Could not delete slide: ' + e.message) }
  }

  function slideDuplicate(params) {
    var id = requireParam(params, 'presentationId')
    var slideIndex = requireParam(params, 'slideIndex')

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    try {
      var dup = r.slide.duplicate()
      return ok({ duplicated: true, originalIndex: slideIndex, newIndex: r.pres.getSlides().length - 1, newObjectId: dup.getObjectId() })
    } catch(e) { return err('DUPLICATE_FAILED', 'Could not duplicate slide: ' + e.message) }
  }

  function slideMove(params) {
    var id = requireParam(params, 'presentationId')
    var slideIndex = requireParam(params, 'slideIndex')
    var newIndex = requireParam(params, 'newIndex')

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    try {
      r.slide.move(newIndex)
      return ok({ moved: true, fromIndex: slideIndex, toIndex: newIndex })
    } catch(e) { return err('MOVE_FAILED', 'Could not move slide: ' + e.message) }
  }

  // ── Content insertion ──

  function textBoxInsert(params) {
    var id = requireParam(params, 'presentationId')
    var slideIndex = requireParam(params, 'slideIndex')
    var text = requireParam(params, 'text')
    var autoPosition = optionalBool(params, 'autoPosition', true)

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    if (autoPosition) applyAutoPosition(r, params, 72, getLowestY(r.slide) + 8, r.pres.getPageWidth() - 144, 72)

    var left = params.left !== undefined ? Number(params.left) : 72
    var top = params.top !== undefined ? Number(params.top) : 72
    var width = params.width !== undefined ? Number(params.width) : 576
    var height = params.height !== undefined ? Number(params.height) : 72

    try {
      var tb = r.slide.insertTextBox(text, left, top, width, height)
      return ok({ objectId: tb.getObjectId(), left: tb.getLeft(), top: tb.getTop(), width: tb.getWidth(), height: tb.getHeight() })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert text box: ' + e.message) }
  }

  function imageInsert(params) {
    var id = requireParam(params, 'presentationId')
    var slideIndex = requireParam(params, 'slideIndex')
    var imageUrl = requireParam(params, 'imageUrl')
    var autoPosition = optionalBool(params, 'autoPosition', true)

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    if (autoPosition) applyAutoPosition(r, params, 72, getLowestY(r.slide) + 8, 300, 200)

    var left = params.left !== undefined ? Number(params.left) : 72
    var top = params.top !== undefined ? Number(params.top) : 72
    var width = params.width !== undefined ? Number(params.width) : 300
    var height = params.height !== undefined ? Number(params.height) : 200

    try {
      var img = r.slide.insertImage(imageUrl, left, top, width, height)
      return ok({ objectId: img.getObjectId(), left: img.getLeft(), top: img.getTop(), width: img.getWidth(), height: img.getHeight() })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert image: ' + e.message) }
  }

  function shapeInsert(params) {
    var id = requireParam(params, 'presentationId')
    var slideIndex = requireParam(params, 'slideIndex')
    var shapeType = requireParam(params, 'shapeType')
    var autoPosition = optionalBool(params, 'autoPosition', true)

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    if (autoPosition) applyAutoPosition(r, params, 72, getLowestY(r.slide) + 8, 300, 200)

    var left = params.left !== undefined ? Number(params.left) : 72
    var top = params.top !== undefined ? Number(params.top) : 200
    var width = params.width !== undefined ? Number(params.width) : 300
    var height = params.height !== undefined ? Number(params.height) : 200

    try {
      var typeMap = {
        RECTANGLE: SlidesApp.ShapeType.RECTANGLE,
        ROUND_RECTANGLE: SlidesApp.ShapeType.ROUND_RECTANGLE,
        ELLIPSE: SlidesApp.ShapeType.ELLIPSE,
        TRIANGLE: SlidesApp.ShapeType.TRIANGLE,
        ARROW_RIGHT: SlidesApp.ShapeType.RIGHT_ARROW,
        ARROW_LEFT: SlidesApp.ShapeType.LEFT_ARROW,
        STAR_5: SlidesApp.ShapeType.STAR_5,
        HEXAGON: SlidesApp.ShapeType.HEXAGON,
        CLOUD: SlidesApp.ShapeType.CLOUD,
        FLOW_CHART_PROCESS: SlidesApp.ShapeType.FLOW_CHART_PROCESS,
        FLOW_CHART_DECISION: SlidesApp.ShapeType.FLOW_CHART_DECISION,
        WAVE: SlidesApp.ShapeType.WAVE,
        CHEVRON: SlidesApp.ShapeType.CHEVRON,
        PENTAGON: SlidesApp.ShapeType.PENTAGON,
        TRAPEZOID: SlidesApp.ShapeType.TRAPEZOID
      }
      var st = typeMap[shapeType] || SlidesApp.ShapeType.RECTANGLE
      var shape = r.slide.insertShape(st, left, top, width, height)
      return ok({ objectId: shape.getObjectId(), shapeType: shapeType, left: shape.getLeft(), top: shape.getTop(), width: shape.getWidth(), height: shape.getHeight() })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert shape: ' + e.message) }
  }

  function tableInsert(params) {
    var id = requireParam(params, 'presentationId')
    var slideIndex = requireParam(params, 'slideIndex')
    var values = params.values
    if (!Array.isArray(values) || values.length === 0) return err('BAD_REQUEST', 'values must be a non-empty 2D array')

    var rows = optionalNumber(params, 'rows', values.length)
    var cols = optionalNumber(params, 'cols', values[0].length)
    var autoPosition = optionalBool(params, 'autoPosition', true)

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    if (autoPosition) applyAutoPosition(r, params, 72, getLowestY(r.slide) + 8, r.pres.getPageWidth() - 144, 72 * rows)

    var left = params.left !== undefined ? Number(params.left) : 72
    var top = params.top !== undefined ? Number(params.top) : 100
    var width = params.width !== undefined ? Number(params.width) : 576
    var height = params.height !== undefined ? Number(params.height) : 72 * Math.max(rows, 1)

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    try {
      var table = r.slide.insertTable(Math.max(rows, 1), Math.max(cols, 1), left, top, width, height)
      for (var i = 0; i < Math.min(rows, values.length); i++) {
        for (var j = 0; j < Math.min(cols, values[i].length); j++) {
          try { table.getCell(i, j).getText().setText(String(values[i][j] || '')) } catch(cellErr) {}
        }
      }
      return ok({ objectId: table.getObjectId(), rows: rows, cols: cols, left: table.getLeft(), top: table.getTop() })
    } catch(e) { return err('INSERT_FAILED', 'Could not insert table: ' + e.message) }
  }

  // ── Reading ──

  function slideElementsList(params) {
    var id = requireParam(params, 'presentationId')
    var slideIndex = requireParam(params, 'slideIndex')

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    var pageEls = r.slide.getPageElements()
    var elements = []
    for (var i = 0; i < pageEls.length; i++) {
      var el = pageEls[i]
      var info = elementToJSON(el)
      var elType = el.getPageElementType()
      if (elType === SlidesApp.PageElementType.SHAPE) {
        try {
          var shape = el.asShape()
          var txt = shape.getText()
          if (txt) info.text = txt.asString().substring(0, 200)
        } catch(s) {}
      } else if (elType === SlidesApp.PageElementType.TABLE) {
        try {
          var tbl = el.asTable()
          info.numRows = tbl.getNumRows()
          info.numCols = tbl.getNumColumns()
        } catch(s) {}
      }
      elements.push(info)
    }
    return ok({ slideIndex: slideIndex, slideObjectId: r.slide.getObjectId(), elements: elements })
  }

  function slideNotes(params) {
    var id = requireParam(params, 'presentationId')
    var slideIndex = requireParam(params, 'slideIndex')
    var notesText = params.notes

    var r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    try {
      var notesPage = r.slide.getNotesPage()
      var notesShape = notesPage.getSpeakerNotesShape()
      if (notesText !== undefined) {
        notesShape.getText().setText(String(notesText))
        return ok({ slideIndex: slideIndex, notesSet: true })
      }
      return ok({ slideIndex: slideIndex, notes: notesShape.getText().asString() })
    } catch(e) { return err('READ_FAILED', 'Could not access speaker notes: ' + e.message) }
  }

  // ── Text operations ──

  function textReplaceAll(params) {
    var id = requireParam(params, 'presentationId')
    var findText = requireParam(params, 'findText')
    var replaceText = requireParam(params, 'replaceText')

    var pres = getPresentation(id)
    if (!pres) return err('NOT_FOUND', 'Presentation not found: ' + id)

    try {
      var count = pres.replaceAllText(findText, replaceText, false)
      return ok({ replacements: count })
    } catch(e) { return err('REPLACE_FAILED', 'Could not replace text: ' + e.message) }
  }

  // ── Batch ──

  function batch(params) {
    var presentationId = requireParam(params, 'presentationId')
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
      // Inherit presentationId
      var opParams = op.params || {}
      if (!opParams.presentationId) opParams.presentationId = presentationId
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
