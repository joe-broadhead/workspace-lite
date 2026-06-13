const SlidesService = (() => {

  const SHAPE_TYPE_MAP = {
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
    TRAPEZOID: SlidesApp.ShapeType.TRAPEZOID,
  }

  const lowestYCache = new WeakMap()

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
      case 'elementDelete':       return elementDelete(params)
      case 'elementGetText':      return elementGetText(params)
      case 'elementFormatText':   return elementFormatText(params)
      case 'batch':               return batch(params)
      default: return err('UNKNOWN_ACTION', `Unknown action: ${action}`)
    }
  }

  function ok(data) { return { success: true, data } }
  function err(code, message) { return { success: false, error: { code, message } } }

  function requireParam(params, name) {
    const val = params[name]
    if (val === undefined || val === null) throw new Error(`Missing required parameter: ${name}`)
    if (typeof val === 'string' && !val.trim()) throw new Error(`Missing required parameter: ${name}`)
    return typeof val === 'string' ? val.trim() : val
  }

  function optionalString(params, name, def) {
    return typeof params[name] === 'string' ? (params[name]).trim() || def : def
  }

  function optionalNumber(params, name, def) {
    const val = params[name]
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
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Invalid presentation ID: ${id}`)
  }

  function getPresentation(id) {
    validatePresentationId(id)
    try { return SlidesApp.openById(id) }
    catch (e) { return null }
  }

  function getSlide(presentation, slideIndex) {
    const slides = presentation.getSlides()
    if (slideIndex < 0 || slideIndex >= slides.length) return null
    return slides[slideIndex]
  }

  function resolveSlide(presentationId, slideIndex) {
    const pres = getPresentation(presentationId)
    if (!pres) return { err: 'NOT_FOUND', msg: `Presentation not found: ${presentationId}` }
    const slide = getSlide(pres, slideIndex)
    if (!slide) return { err: 'NOT_FOUND', msg: `Slide index out of range: ${slideIndex}` }
    return { pres, slide }
  }

  function getLowestY(slide) {
    let val = lowestYCache.get(slide)
    if (val !== undefined) return val
    let lowest = 0
    for (const el of slide.getPageElements()) {
      const bottom = el.getTop() + el.getHeight()
      if (bottom > lowest) lowest = bottom
    }
    lowestYCache.set(slide, lowest)
    return lowest
  }

  function invalidateLowestY(slide) {
    lowestYCache.delete(slide)
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
    const slides = pres.getSlides()
    const list = []
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i]
      const layout = s.getLayout()
      list.push({
        objectId: s.getObjectId(),
        index: i,
        layout: layout ? layout.getLayoutName() : null,
        numElements: s.getPageElements().length,
      })
    }
    return {
      id: pres.getId(),
      name: pres.getName(),
      url: pres.getUrl(),
      pageWidth: pres.getPageWidth(),
      pageHeight: pres.getPageHeight(),
      numSlides: slides.length,
      slides: list,
    }
  }

  function elementToJSON(el) {
    return {
      objectId: el.getObjectId(),
      type: el.getPageElementType().toString(),
      left: el.getLeft(),
      top: el.getTop(),
      width: el.getWidth(),
      height: el.getHeight(),
    }
  }

  function findElement(slide, objectId) {
    for (const el of slide.getPageElements()) {
      if (el.getObjectId() === objectId) return el
    }
    return null
  }

  // ── Presentation management ──

  function presentationCreate(params) {
    const name = requireParam(params, 'name')
    try {
      const pres = SlidesApp.create(name)
      return ok({ presentation: presentationToJSON(pres) })
    } catch (e) { return err('CREATE_FAILED', `Could not create presentation: ${name}`) }
  }

  function presentationGet(params) {
    const id = requireParam(params, 'presentationId')
    const pres = getPresentation(id)
    if (!pres) return err('NOT_FOUND', `Presentation not found: ${id}`)
    return ok({ presentation: presentationToJSON(pres) })
  }

  // ── Slide management ──

  function slideAdd(params) {
    const id = requireParam(params, 'presentationId')
    const titleText = optionalString(params, 'titleText', null)
    const bodyText = optionalString(params, 'bodyText', null)

    const pres = getPresentation(id)
    if (!pres) return err('NOT_FOUND', `Presentation not found: ${id}`)

    try {
      const layouts = pres.getLayouts()
      let layout = layouts.length > 0 ? layouts[0] : null

      if (titleText && layouts.length > 1) {
        for (const l of layouts) {
          if (l.getLayoutName().toLowerCase().indexOf('title') >= 0) {
            layout = l
            break
          }
        }
      }

      let slide
      if (pres.getSlides().length === 0) {
        slide = pres.getSlides()[0]
        if (titleText) {
          const shapes = slide.getShapes()
          for (const shape of shapes) {
            const text = shape.getText()
            if (text) {
              try { text.setText(titleText); break } catch (t) {}
            }
          }
          if (bodyText) {
            for (const shape of shapes) {
              const t2 = shape.getText()
              if (t2 && t2.getStartIndex() === 0 && t2.getEndIndex() === titleText.length) {
                try { t2.appendText(`\n\n${bodyText}`) } catch (t) {}
                break
              }
            }
          }
        }
      } else {
        slide = pres.appendSlide(layout)
        if (titleText) {
          let titleShape = null
          let bodyShape = null
          for (const el of slide.getPageElements()) {
            if (el.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
              const shape = el.asShape()
              if (shape.getText()) {
                if (!titleShape) titleShape = shape
                else if (!bodyShape) bodyShape = shape
              }
            }
          }
          if (titleShape) {
            try { titleShape.getText().setText(titleText) } catch (t) {}
            if (bodyText && bodyShape) {
              try { bodyShape.getText().setText(bodyText) } catch (t) {}
            } else if (bodyText) {
              try { titleShape.getText().appendText(`\n${bodyText}`) } catch (t) {}
            }
          } else {
            slide.insertTextBox(titleText + (bodyText ? `\n${bodyText}` : ''))
          }
        } else if (bodyText) {
          const shapes = slide.getShapes()
          if (shapes.length > 0) {
            try { shapes[0].getText().setText(bodyText) } catch (t) { slide.insertTextBox(bodyText) }
          } else {
            slide.insertTextBox(bodyText)
          }
        }
      }

      invalidateLowestY(slide)
      return ok({
        slideIndex: pres.getSlides().length - 1,
        objectId: slide.getObjectId(),
        layout: layout ? layout.getLayoutName() : 'default',
        bottomY: getLowestY(slide) + 8,
      })
    } catch (e) { return err('CREATE_FAILED', `Could not add slide: ${e.message}`) }
  }

  function slideDelete(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    try {
      r.slide.remove()
      return ok({ deleted: true, slideIndex })
    } catch (e) { return err('DELETE_FAILED', `Could not delete slide: ${e.message}`) }
  }

  function slideDuplicate(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    try {
      const dup = r.slide.duplicate()
      invalidateLowestY(r.slide)
      return ok({
        duplicated: true,
        originalIndex: slideIndex,
        newIndex: r.pres.getSlides().length - 1,
        newObjectId: dup.getObjectId(),
      })
    } catch (e) { return err('DUPLICATE_FAILED', `Could not duplicate slide: ${e.message}`) }
  }

  function slideMove(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')
    const newIndex = requireParam(params, 'newIndex')

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    try {
      r.slide.move(newIndex)
      return ok({ moved: true, fromIndex: slideIndex, toIndex: newIndex })
    } catch (e) { return err('MOVE_FAILED', `Could not move slide: ${e.message}`) }
  }

  // ── Content insertion ──

  function textBoxInsert(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')
    const text = requireParam(params, 'text')
    const autoPosition = optionalBool(params, 'autoPosition', true)

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    if (autoPosition) applyAutoPosition(r, params, 72, getLowestY(r.slide) + 8, r.pres.getPageWidth() - 144, 72)

    const left = params.left !== undefined ? Number(params.left) : 72
    const top = params.top !== undefined ? Number(params.top) : 72
    const width = params.width !== undefined ? Number(params.width) : 576
    const height = params.height !== undefined ? Number(params.height) : 72

    try {
      const tb = r.slide.insertTextBox(text, left, top, width, height)
      invalidateLowestY(r.slide)
      return ok({
        objectId: tb.getObjectId(),
        left: tb.getLeft(),
        top: tb.getTop(),
        width: tb.getWidth(),
        height: tb.getHeight(),
      })
    } catch (e) { return err('INSERT_FAILED', `Could not insert text box: ${e.message}`) }
  }

  function imageInsert(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')
    const imageUrl = requireParam(params, 'imageUrl')
    const autoPosition = optionalBool(params, 'autoPosition', true)

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    if (autoPosition) applyAutoPosition(r, params, 72, getLowestY(r.slide) + 8, 300, 200)

    const left = params.left !== undefined ? Number(params.left) : 72
    const top = params.top !== undefined ? Number(params.top) : 72
    const width = params.width !== undefined ? Number(params.width) : 300
    const height = params.height !== undefined ? Number(params.height) : 200

    try {
      const img = r.slide.insertImage(imageUrl, left, top, width, height)
      invalidateLowestY(r.slide)
      return ok({
        objectId: img.getObjectId(),
        left: img.getLeft(),
        top: img.getTop(),
        width: img.getWidth(),
        height: img.getHeight(),
      })
    } catch (e) { return err('INSERT_FAILED', `Could not insert image: ${e.message}`) }
  }

  function shapeInsert(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')
    const shapeType = requireParam(params, 'shapeType')
    const autoPosition = optionalBool(params, 'autoPosition', true)

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    if (autoPosition) applyAutoPosition(r, params, 72, getLowestY(r.slide) + 8, 300, 200)

    const left = params.left !== undefined ? Number(params.left) : 72
    const top = params.top !== undefined ? Number(params.top) : 200
    const width = params.width !== undefined ? Number(params.width) : 300
    const height = params.height !== undefined ? Number(params.height) : 200

    try {
      const st = SHAPE_TYPE_MAP[shapeType] || SlidesApp.ShapeType.RECTANGLE
      const shape = r.slide.insertShape(st, left, top, width, height)
      invalidateLowestY(r.slide)
      return ok({
        objectId: shape.getObjectId(),
        shapeType,
        left: shape.getLeft(),
        top: shape.getTop(),
        width: shape.getWidth(),
        height: shape.getHeight(),
      })
    } catch (e) { return err('INSERT_FAILED', `Could not insert shape: ${e.message}`) }
  }

  function tableInsert(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')
    const values = params.values
    if (!Array.isArray(values) || values.length === 0) return err('BAD_REQUEST', 'values must be a non-empty 2D array')

    const rows = optionalNumber(params, 'rows', values.length)
    const cols = optionalNumber(params, 'cols', values[0].length)
    const autoPosition = optionalBool(params, 'autoPosition', true)

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    if (autoPosition) applyAutoPosition(r, params, 72, getLowestY(r.slide) + 8, r.pres.getPageWidth() - 144, 72 * rows)

    const left = params.left !== undefined ? Number(params.left) : 72
    const top = params.top !== undefined ? Number(params.top) : 100
    const width = params.width !== undefined ? Number(params.width) : 576
    const height = params.height !== undefined ? Number(params.height) : 72 * Math.max(rows, 1)

    try {
      const table = r.slide.insertTable(Math.max(rows, 1), Math.max(cols, 1), left, top, width, height)
      for (let i = 0; i < Math.min(rows, values.length); i++) {
        for (let j = 0; j < Math.min(cols, values[i].length); j++) {
          try { table.getCell(i, j).getText().setText(String(values[i][j] || '')) } catch (cellErr) {}
        }
      }
      invalidateLowestY(r.slide)
      return ok({
        objectId: table.getObjectId(),
        rows,
        cols,
        left: table.getLeft(),
        top: table.getTop(),
      })
    } catch (e) { return err('INSERT_FAILED', `Could not insert table: ${e.message}`) }
  }

  // ── Reading ──

  function slideElementsList(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    const pageEls = r.slide.getPageElements()
    const elements = []
    for (const el of pageEls) {
      const info = elementToJSON(el)
      const elType = el.getPageElementType()
      if (elType === SlidesApp.PageElementType.SHAPE) {
        try {
          const shape = el.asShape()
          const txt = shape.getText()
          if (txt) info.text = txt.asString()
        } catch (s) {}
      } else if (elType === SlidesApp.PageElementType.TABLE) {
        try {
          const tbl = el.asTable()
          info.numRows = tbl.getNumRows()
          info.numCols = tbl.getNumColumns()
        } catch (s) {}
      }
      elements.push(info)
    }
    return ok({ slideIndex, slideObjectId: r.slide.getObjectId(), elements })
  }

  function slideNotes(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')
    const notesText = params.notes

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    try {
      const notesPage = r.slide.getNotesPage()
      const notesShape = notesPage.getSpeakerNotesShape()
      if (notesText !== undefined) {
        notesShape.getText().setText(String(notesText))
        return ok({ slideIndex, notesSet: true })
      }
      return ok({ slideIndex, notes: notesShape.getText().asString() })
    } catch (e) { return err('READ_FAILED', `Could not access speaker notes: ${e.message}`) }
  }

  // ── Text operations ──

  function textReplaceAll(params) {
    const id = requireParam(params, 'presentationId')
    const findText = requireParam(params, 'findText')
    const replaceText = requireParam(params, 'replaceText')

    const pres = getPresentation(id)
    if (!pres) return err('NOT_FOUND', `Presentation not found: ${id}`)

    try {
      const count = pres.replaceAllText(findText, replaceText, false)
      return ok({ replacements: count })
    } catch (e) { return err('REPLACE_FAILED', `Could not replace text: ${e.message}`) }
  }

  // ── Element operations ──

  function elementDelete(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')
    const objectId = requireParam(params, 'objectId')

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    const el = findElement(r.slide, objectId)
    if (!el) return err('NOT_FOUND', `Element not found: ${objectId}`)

    try {
      el.remove()
      invalidateLowestY(r.slide)
      return ok({ deleted: true, objectId, slideIndex })
    } catch (e) { return err('DELETE_FAILED', `Could not delete element: ${e.message}`) }
  }

  function elementGetText(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')
    const objectId = requireParam(params, 'objectId')

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    const el = findElement(r.slide, objectId)
    if (!el) return err('NOT_FOUND', `Element not found: ${objectId}`)

    const elType = el.getPageElementType()
    if (elType !== SlidesApp.PageElementType.SHAPE) {
      return err('BAD_REQUEST', `Element is not a shape/text element: ${objectId}`)
    }

    try {
      const shape = el.asShape()
      const text = shape.getText()
      const fullText = text ? text.asString() : ''
      return ok({ objectId, text: fullText, slideIndex })
    } catch (e) { return err('READ_FAILED', `Could not read element text: ${e.message}`) }
  }

  function elementFormatText(params) {
    const id = requireParam(params, 'presentationId')
    const slideIndex = requireParam(params, 'slideIndex')
    const objectId = requireParam(params, 'objectId')
    const findText = requireParam(params, 'findText')

    const r = resolveSlide(id, slideIndex)
    if (r.err) return err(r.err, r.msg)

    const el = findElement(r.slide, objectId)
    if (!el) return err('NOT_FOUND', `Element not found: ${objectId}`)

    const elType = el.getPageElementType()
    if (elType !== SlidesApp.PageElementType.SHAPE) {
      return err('BAD_REQUEST', `Element is not a shape/text element: ${objectId}`)
    }

    try {
      const shape = el.asShape()
      const text = shape.getText()
      if (!text) return err('NOT_FOUND', `Element has no text: ${objectId}`)

      const runs = text.getRuns()
      let formattedCount = 0
      for (let i = 0; i < runs.length; i++) {
        const run = runs[i]
        const runText = run.asString()
        if (runText.indexOf(findText) === -1) continue

        const style = run.getTextStyle()
        if (params.bold !== undefined) style.setBold(optionalBool(params, 'bold', false))
        if (params.italic !== undefined) style.setItalic(optionalBool(params, 'italic', false))
        if (params.underline !== undefined) style.setUnderline(optionalBool(params, 'underline', false))
        if (params.fontFamily !== undefined) style.setFontFamily(String(params.fontFamily))
        if (params.fontSize !== undefined) style.setFontSize(Number(params.fontSize))
        if (params.foregroundColor !== undefined) style.setForegroundColor(String(params.foregroundColor))
        if (params.backgroundColor !== undefined) style.setBackgroundColor(String(params.backgroundColor))
        if (params.linkUrl !== undefined) style.setLinkUrl(String(params.linkUrl))
        formattedCount++
      }

      return ok({ formatted: true, objectId, slideIndex, formattedCount })
    } catch (e) { return err('FORMAT_FAILED', `Could not format element text: ${e.message}`) }
  }

  // ── Batch ──

  function batch(params) {
    const presentationId = requireParam(params, 'presentationId')
    const operations = params.operations
    if (!Array.isArray(operations) || operations.length === 0) return err('BAD_REQUEST', 'operations must be a non-empty array')
    if (operations.length > 20) return err('BAD_REQUEST', 'Max 20 operations per batch')

    const results = []
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]
      if (!op.action) {
        results.push({ index: i, success: false, error: { code: 'BAD_REQUEST', message: `Missing action at index ${i}` } })
        continue
      }
      const opParams = op.params || {}
      if (!opParams.presentationId) opParams.presentationId = presentationId
      try {
        const result = handle(op.action, opParams)
        results.push({
          index: i,
          action: op.action,
          success: result.success,
          data: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error,
        })
      } catch (ex) {
        results.push({
          index: i,
          action: op.action,
          success: false,
          error: { code: 'INTERNAL_ERROR', message: ex.message || String(ex) },
        })
      }
    }
    return ok({ results })
  }

  return { handle }
})()
