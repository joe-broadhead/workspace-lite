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
  };

  const LINE_CATEGORY_MAP = {
    STRAIGHT: SlidesApp.LineCategory.STRAIGHT,
    BENT: SlidesApp.LineCategory.BENT,
    CURVED: SlidesApp.LineCategory.CURVED,
  };

  function handle(action, params) {
    const fn = ACTIONS[action]
    return fn ? fn(params) : err('UNKNOWN_ACTION', `Unknown action: ${action}`)
  }

  function ok(data) { return { success: true, data }; }
  function err(code, message) { return { success: false, error: { code, message } }; }

  function trap(fn, errorCode, errorMsg) {
    try { return ok(fn()); }
    catch (e) { return err(errorCode, typeof errorMsg === 'function' ? errorMsg(e) : errorMsg); }
  }

  function runBatch(handle) {
    return function batch(params) {
      const presentationId = requireParam(params, 'presentationId');
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
        if (!opParams.presentationId) opParams.presentationId = presentationId;
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
    return typeof params[name] === 'string' ? (params[name]).trim() || def : def;
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

  function validatePresentationId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`Invalid presentation ID: ${id}`);
  }

  function getPresentation(id) {
    validatePresentationId(id);
    try { return SlidesApp.openById(id); }
    catch (e) { return null; }
  }

  function getSlide(presentation, slideIndex) {
    const slides = presentation.getSlides();
    if (slideIndex < 0 || slideIndex >= slides.length) return null;
    return slides[slideIndex];
  }

  function resolveSlide(presentationId, slideIndex) {
    const pres = getPresentation(presentationId);
    if (!pres) return { err: 'NOT_FOUND', msg: `Presentation not found: ${presentationId}` };
    const slide = getSlide(pres, slideIndex);
    if (!slide) return { err: 'NOT_FOUND', msg: `Slide index out of range: ${slideIndex}` };
    return { pres, slide };
  }

  function computeLowestY(slide) {
    let lowest = 0;
    for (const el of slide.getPageElements()) {
      const bottom = el.getTop() + el.getHeight();
      if (bottom > lowest) lowest = bottom;
    }
    return lowest;
  }

  function computeAutoPosition(r, params, fallbackLeft, fallbackTop, fallbackWidth, fallbackHeight) {
    const lowestY = computeLowestY(r.slide) + 8;
    if (params.left === undefined && params.top === undefined) {
      return { left: fallbackLeft, top: Math.max(lowestY, fallbackTop), width: fallbackWidth, height: fallbackHeight };
    }
    return {
      left: params.left !== undefined ? Number(params.left) : fallbackLeft,
      top: params.top !== undefined ? Number(params.top) : Math.max(lowestY, fallbackTop),
      width: params.width !== undefined ? Number(params.width) : fallbackWidth,
      height: params.height !== undefined ? Number(params.height) : fallbackHeight,
    };
  }

  function presentationToJSON(pres) {
    const slides = pres.getSlides();
    const list = [];
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const layout = s.getLayout();
      list.push({
        objectId: s.getObjectId(),
        index: i,
        layout: layout ? layout.getLayoutName() : null,
        numElements: s.getPageElements().length,
      });
    }
    return {
      id: pres.getId(),
      name: pres.getName(),
      url: pres.getUrl(),
      pageWidth: pres.getPageWidth(),
      pageHeight: pres.getPageHeight(),
      numSlides: slides.length,
      slides: list,
    };
  }

  function elementToJSON(el) {
    return {
      objectId: el.getObjectId(),
      type: el.getPageElementType().toString(),
      left: el.getLeft(),
      top: el.getTop(),
      width: el.getWidth(),
      height: el.getHeight(),
    };
  }

  function findElement(slide, objectId) {
    for (const el of slide.getPageElements()) {
      if (el.getObjectId() === objectId) return el;
    }
    return null;
  }

  function resolveLineType(lineType) {
    switch (lineType) {
      case 'SOLID': return SlidesApp.LineType.SOLID;
      case 'DOTTED': return SlidesApp.LineType.DOTTED;
      case 'DASHED': return SlidesApp.LineType.DASHED;
      default: return null;
    }
  }

  function applySlideText(slide, titleText, bodyText) {
    const result = { appliedTitle: null, appliedBody: null };

    if (!titleText && !bodyText) return result;

    const shapes = slide.getShapes();
    if (shapes.length === 0) {
      slide.insertTextBox((titleText || '') + (bodyText ? '\n' + bodyText : ''));
      if (titleText) result.appliedTitle = titleText;
      if (bodyText) result.appliedBody = bodyText;
      return result;
    }

    if (titleText) {
      for (const shape of shapes) {
        const text = shape.getText();
        if (text) {
          try { text.setText(titleText); result.appliedTitle = titleText; break; } catch (t) {}
        }
      }
    }

    if (bodyText) {
      if (titleText) {
        for (const shape of shapes) {
          const t2 = shape.getText();
          if (t2 && t2.getStartIndex() === 0 && t2.getEndIndex() === titleText.length) {
            try { t2.appendText('\n\n' + bodyText); result.appliedBody = bodyText; break; } catch (t) {}
          }
        }
        if (!result.appliedBody) {
          result.appliedBody = null;
        }
      } else {
        if (shapes.length > 0) {
          try { shapes[0].getText().setText(bodyText); result.appliedBody = bodyText; } catch (t) {
            slide.insertTextBox(bodyText);
            result.appliedBody = bodyText;
          }
        } else {
          slide.insertTextBox(bodyText);
          result.appliedBody = bodyText;
        }
      }
    }

    return result;
  }

  function applyNewSlideText(slide, titleText, bodyText) {
    const result = { appliedTitle: null, appliedBody: null };

    if (!titleText) return result;

    let titleShape = null;
    let bodyShape = null;
    for (const el of slide.getPageElements()) {
      if (el.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
        const shape = el.asShape();
        if (shape.getText()) {
          if (!titleShape) titleShape = shape;
          else if (!bodyShape) bodyShape = shape;
        }
      }
    }

    if (titleShape) {
      try { titleShape.getText().setText(titleText); result.appliedTitle = titleText; } catch (t) {}
      if (bodyText && bodyShape) {
        try { bodyShape.getText().setText(bodyText); result.appliedBody = bodyText; } catch (t) {}
      } else if (bodyText) {
        try { titleShape.getText().appendText('\n' + bodyText); result.appliedBody = bodyText; } catch (t) {}
      }
    } else {
      slide.insertTextBox(titleText + (bodyText ? '\n' + bodyText : ''));
      if (titleText) result.appliedTitle = titleText;
      if (bodyText) result.appliedBody = bodyText;
    }

    return result;
  }

  // ── Presentation management ──

  function presentationCreate(params) {
    const name = requireParam(params, 'name');
    return trap(
      () => {
        const pres = SlidesApp.create(name);
        return { presentation: presentationToJSON(pres) };
      },
      'CREATE_FAILED',
      `Could not create presentation: ${name}`
    );
  }

  function presentationGet(params) {
    const id = requireParam(params, 'presentationId');
    const pres = getPresentation(id);
    if (!pres) return err('NOT_FOUND', `Presentation not found: ${id}`);
    return ok({ presentation: presentationToJSON(pres) });
  }

  // ── Slide management ──

  function slideAdd(params) {
    const id = requireParam(params, 'presentationId');
    const titleText = optionalString(params, 'titleText', null);
    const bodyText = optionalString(params, 'bodyText', null);

    const pres = getPresentation(id);
    if (!pres) return err('NOT_FOUND', `Presentation not found: ${id}`);

    try {
      const layouts = pres.getLayouts();
      let layout = layouts.length > 0 ? layouts[0] : null;

      if (titleText && layouts.length > 1) {
        for (const l of layouts) {
          if (l.getLayoutName().toLowerCase().indexOf('title') >= 0) {
            layout = l;
            break;
          }
        }
      }

      let slide;
      if (pres.getSlides().length === 0) {
        slide = pres.getSlides()[0];
        applySlideText(slide, titleText, bodyText);
      } else {
        slide = pres.appendSlide(layout);
        applyNewSlideText(slide, titleText, bodyText);
      }

      return ok({
        slideIndex: pres.getSlides().length - 1,
        objectId: slide.getObjectId(),
        layout: layout ? layout.getLayoutName() : 'default',
        bottomY: computeLowestY(slide) + 8,
      });
    } catch (e) { return err('CREATE_FAILED', `Could not add slide: ${e.message}`); }
  }

  function slideDelete(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => { r.slide.remove(); return { deleted: true, slideIndex }; },
      'DELETE_FAILED',
      (e) => `Could not delete slide: ${e.message}`
    );
  }

  function slideDuplicate(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const dup = r.slide.duplicate();
        return {
          duplicated: true,
          originalIndex: slideIndex,
          newIndex: r.pres.getSlides().length - 1,
          newObjectId: dup.getObjectId(),
        };
      },
      'DUPLICATE_FAILED',
      (e) => `Could not duplicate slide: ${e.message}`
    );
  }

  function slideMove(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const newIndex = requireParam(params, 'newIndex');

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => { r.slide.move(newIndex); return { moved: true, fromIndex: slideIndex, toIndex: newIndex }; },
      'MOVE_FAILED',
      (e) => `Could not move slide: ${e.message}`
    );
  }

  // ── Content insertion ──

  function textBoxInsert(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const text = requireParam(params, 'text');
    const autoPosition = optionalBool(params, 'autoPosition', true);

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    const pos = autoPosition ? computeAutoPosition(r, params, 72, computeLowestY(r.slide) + 8, r.pres.getPageWidth() - 144, 72) : { left: 72, top: 72, width: 576, height: 72 };

    return trap(
      () => {
        const tb = r.slide.insertTextBox(text, pos.left, pos.top, pos.width, pos.height);
        return {
          objectId: tb.getObjectId(),
          left: tb.getLeft(),
          top: tb.getTop(),
          width: tb.getWidth(),
          height: tb.getHeight(),
        };
      },
      'INSERT_FAILED',
      (e) => `Could not insert text box: ${e.message}`
    );
  }

  function imageInsert(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const imageUrl = requireParam(params, 'imageUrl');
    const autoPosition = optionalBool(params, 'autoPosition', true);

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    const pos = autoPosition ? computeAutoPosition(r, params, 72, computeLowestY(r.slide) + 8, 300, 200) : { left: 72, top: 72, width: 300, height: 200 };

    return trap(
      () => {
        const img = r.slide.insertImage(imageUrl, pos.left, pos.top, pos.width, pos.height);
        return {
          objectId: img.getObjectId(),
          left: img.getLeft(),
          top: img.getTop(),
          width: img.getWidth(),
          height: img.getHeight(),
        };
      },
      'INSERT_FAILED',
      (e) => `Could not insert image: ${e.message}`
    );
  }

  function shapeInsert(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const shapeType = requireParam(params, 'shapeType');
    const autoPosition = optionalBool(params, 'autoPosition', true);

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    const pos = autoPosition ? computeAutoPosition(r, params, 72, computeLowestY(r.slide) + 8, 300, 200) : { left: 72, top: 200, width: 300, height: 200 };

    return trap(
      () => {
        const st = SHAPE_TYPE_MAP[shapeType] || SlidesApp.ShapeType.RECTANGLE;
        const shape = r.slide.insertShape(st, pos.left, pos.top, pos.width, pos.height);
        return {
          objectId: shape.getObjectId(),
          shapeType,
          left: shape.getLeft(),
          top: shape.getTop(),
          width: shape.getWidth(),
          height: shape.getHeight(),
        };
      },
      'INSERT_FAILED',
      (e) => `Could not insert shape: ${e.message}`
    );
  }

  function tableInsert(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const values = params.values;
    if (!Array.isArray(values) || values.length === 0) return err('BAD_REQUEST', 'values must be a non-empty 2D array');

    const rows = optionalNumber(params, 'rows', values.length);
    const cols = optionalNumber(params, 'cols', values[0].length);
    const autoPosition = optionalBool(params, 'autoPosition', true);

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    const pos = autoPosition ? computeAutoPosition(r, params, 72, computeLowestY(r.slide) + 8, r.pres.getPageWidth() - 144, 72 * rows) : { left: 72, top: 100, width: 576, height: 72 * Math.max(rows, 1) };

    return trap(
      () => {
        const table = r.slide.insertTable(Math.max(rows, 1), Math.max(cols, 1), pos.left, pos.top, pos.width, pos.height);
        for (let i = 0; i < Math.min(rows, values.length); i++) {
          for (let j = 0; j < Math.min(cols, values[i].length); j++) {
            try { table.getCell(i, j).getText().setText(String(values[i][j] || '')); } catch (cellErr) {}
          }
        }
        return {
          objectId: table.getObjectId(),
          rows,
          cols,
          left: table.getLeft(),
          top: table.getTop(),
        };
      },
      'INSERT_FAILED',
      (e) => `Could not insert table: ${e.message}`
    );
  }

  // ── Reading ──

  function slideElementsList(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    const pageEls = r.slide.getPageElements();
    const elements = [];
    for (const el of pageEls) {
      const info = elementToJSON(el);
      const elType = el.getPageElementType();
      if (elType === SlidesApp.PageElementType.SHAPE) {
        try {
          const shape = el.asShape();
          const txt = shape.getText();
          if (txt) info.text = txt.asString();
        } catch (s) {}
      } else if (elType === SlidesApp.PageElementType.TABLE) {
        try {
          const tbl = el.asTable();
          info.numRows = tbl.getNumRows();
          info.numCols = tbl.getNumColumns();
        } catch (s) {}
      }
      elements.push(info);
    }
    return ok({ slideIndex, slideObjectId: r.slide.getObjectId(), elements });
  }

  function slideNotes(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const notesText = params.notes;

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => {
        const notesPage = r.slide.getNotesPage();
        const notesShape = notesPage.getSpeakerNotesShape();
        if (notesText !== undefined) {
          notesShape.getText().setText(String(notesText));
          return { slideIndex, notesSet: true };
        }
        return { slideIndex, notes: notesShape.getText().asString() };
      },
      'READ_FAILED',
      (e) => `Could not access speaker notes: ${e.message}`
    );
  }

  // ── Text operations ──

  function textReplaceAll(params) {
    const id = requireParam(params, 'presentationId');
    const findText = requireParam(params, 'findText');
    const replaceText = requireParam(params, 'replaceText');

    const pres = getPresentation(id);
    if (!pres) return err('NOT_FOUND', `Presentation not found: ${id}`);

    return trap(
      () => {
        const count = pres.replaceAllText(findText, replaceText, false);
        return { replacements: count };
      },
      'REPLACE_FAILED',
      (e) => `Could not replace text: ${e.message}`
    );
  }

  // ── Element operations ──

  function elementDelete(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const objectId = requireParam(params, 'objectId');

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    const el = findElement(r.slide, objectId);
    if (!el) return err('NOT_FOUND', `Element not found: ${objectId}`);

    return trap(
      () => { el.remove(); return { deleted: true, objectId, slideIndex }; },
      'DELETE_FAILED',
      (e) => `Could not delete element: ${e.message}`
    );
  }

  function elementGetText(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const objectId = requireParam(params, 'objectId');

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    const el = findElement(r.slide, objectId);
    if (!el) return err('NOT_FOUND', `Element not found: ${objectId}`);

    const elType = el.getPageElementType();
    if (elType !== SlidesApp.PageElementType.SHAPE) {
      return err('BAD_REQUEST', `Element is not a shape/text element: ${objectId}`);
    }

    return trap(
      () => {
        const shape = el.asShape();
        const text = shape.getText();
        const fullText = text ? text.asString() : '';
        return { objectId, text: fullText, slideIndex };
      },
      'READ_FAILED',
      (e) => `Could not read element text: ${e.message}`
    );
  }

  function elementFormatText(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const objectId = requireParam(params, 'objectId');
    const findText = requireParam(params, 'findText');

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    const el = findElement(r.slide, objectId);
    if (!el) return err('NOT_FOUND', `Element not found: ${objectId}`);

    const elType = el.getPageElementType();
    if (elType !== SlidesApp.PageElementType.SHAPE) {
      return err('BAD_REQUEST', `Element is not a shape/text element: ${objectId}`);
    }

    return trap(
      () => {
        const shape = el.asShape();
        const text = shape.getText();
        if (!text) throw new Error(`Element has no text: ${objectId}`);

        const runs = text.getRuns();
        let formattedCount = 0;
        for (let i = 0; i < runs.length; i++) {
          const run = runs[i];
          const runText = run.asString();
          if (runText.indexOf(findText) === -1) continue;

          const style = run.getTextStyle();
          if (params.bold !== undefined) style.setBold(optionalBool(params, 'bold', false));
          if (params.italic !== undefined) style.setItalic(optionalBool(params, 'italic', false));
          if (params.underline !== undefined) style.setUnderline(optionalBool(params, 'underline', false));
          if (params.fontFamily !== undefined) style.setFontFamily(String(params.fontFamily));
          if (params.fontSize !== undefined) style.setFontSize(Number(params.fontSize));
          if (params.foregroundColor !== undefined) style.setForegroundColor(String(params.foregroundColor));
          if (params.backgroundColor !== undefined) style.setBackgroundColor(String(params.backgroundColor));
          if (params.linkUrl !== undefined) style.setLinkUrl(String(params.linkUrl));
          formattedCount++;
        }

        return { formatted: true, objectId, slideIndex, formattedCount };
      },
      'FORMAT_FAILED',
      (e) => `Could not format element text: ${e.message}`
    );
  }

  // ── Slide background ──

  function slideBackground(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const color = requireParam(params, 'color');

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    return trap(
      () => { r.slide.getBackground().setSolidFill(String(color)); return { slideIndex, color }; },
      'UPDATE_FAILED',
      (e) => `Could not set slide background: ${e.message}`
    );
  }

  // ── Line insertion ──

  function lineInsert(params) {
    const id = requireParam(params, 'presentationId');
    const slideIndex = requireParam(params, 'slideIndex');
    const lineCategory = requireParam(params, 'lineCategory');
    const startLeft = Number(requireParam(params, 'startLeft'));
    const startTop = Number(requireParam(params, 'startTop'));
    const endLeft = Number(requireParam(params, 'endLeft'));
    const endTop = Number(requireParam(params, 'endTop'));

    const r = resolveSlide(id, slideIndex);
    if (r.err) return err(r.err, r.msg);

    const category = LINE_CATEGORY_MAP[lineCategory];
    if (!category) return err('BAD_REQUEST', `Unknown line category: ${lineCategory}`);

    const lineType = optionalString(params, 'lineType', null);
    const lt = lineType ? resolveLineType(lineType) : null;

    return trap(
      () => {
        let line = r.slide.insertLine(category, startLeft, startTop, endLeft, endTop);

        if (lt) {
          try { line.setLineType(lt); } catch (ltErr) {}
        }

        return {
          objectId: line.getObjectId(),
          lineCategory,
          lineType: lineType || 'SOLID',
          startLeft: line.getStart().getX(),
          startTop: line.getStart().getY(),
          endLeft: line.getEnd().getX(),
          endTop: line.getEnd().getY(),
        };
      },
      'INSERT_FAILED',
      (e) => `Could not insert line: ${e.message}`
    );
  }

  const ACTIONS = {
    presentationCreate, presentationGet, slideAdd, slideDelete,
    slideDuplicate, slideMove, textBoxInsert, imageInsert, shapeInsert,
    tableInsert, slideElementsList, slideNotes, textReplaceAll,
    elementDelete, elementGetText, elementFormatText, slideBackground,
    lineInsert,
    batch: function(params) { return runBatch(handle)(params); },
  }

  return { handle };
})();
