const FormsService = (() => {
  const ACTION_POLICIES = {
    formCreate: { class: 'write' },
    formGet: { class: 'read' },
    formUpdate: { class: 'write' },
    formSetAcceptingResponses: { class: 'write' },
    formSetDestination: { class: 'write' },
    formRemoveDestination: { class: 'destructive' },
    itemsList: { class: 'read' },
    itemAdd: { class: 'write' },
    itemUpdate: { class: 'write' },
    itemMove: { class: 'write' },
    itemDelete: { class: 'destructive' },
    responsesList: { class: 'read' },
    responseGet: { class: 'read' },
    responseDelete: { class: 'destructive' },
    responsesDeleteAll: { class: 'destructive' },
    batch: { class: 'read' },
  }

  const BATCH_ACTIONS = {
    formCreate: true, formGet: true, formUpdate: true,
    formSetAcceptingResponses: true, formSetDestination: true,
    formRemoveDestination: true, itemsList: true, itemAdd: true,
    itemUpdate: true, itemMove: true, itemDelete: true,
    responsesList: true, responseGet: true, responseDelete: true,
    responsesDeleteAll: true,
  }

  const LIMITS = {
    items: 200,
    responses: 100,
    responseAnswers: 100,
    titleChars: 1024,
    descriptionChars: 10000,
    choices: 200,
    choiceChars: 500,
    responseChars: 100000,
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
    const payload = JSON.stringify({ data: data, pagination: pagination, warnings: warnings })
    if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes)
    return { success: true, data: data, pagination: pagination, warnings: warnings }
  }

  function err(code, message, correlationId) {
    return { success: false, error: { code: code, message: message, correlationId: correlationId } }
  }

  function limitExceeded(name, requested, max) {
    return err('LIMIT_EXCEEDED', `${name} limit exceeded: requested ${requested}, max ${max}`)
  }

  function withIdempotency(action, params, fn) {
    const key = optionalString(params || {}, 'idempotencyKey')
    if (!key) return fn()
    if (!/^[a-zA-Z0-9._:-]{1,128}$/.test(key)) return err('BAD_REQUEST', 'idempotencyKey must be 1-128 characters: letters, numbers, dot, underscore, colon, or dash')

    const store = PropertiesService.getScriptProperties()
    const prop = 'IDEMPOTENCY:forms:' + action + ':' + key
    const cached = store.getProperty(prop)
    if (cached) {
      try {
        const response = JSON.parse(cached)
        if (response && response.success === true) {
          response.warnings = (response.warnings || []).concat(['Idempotency key replayed; mutation was not repeated.'])
          return response
        }
      } catch (_) {
        store.deleteProperty(prop)
      }
    }

    const response = fn()
    if (response && response.success === true) {
      const payload = JSON.stringify(response)
      if (payload.length <= 8000) {
        store.setProperty(prop, payload)
      } else {
        response.warnings = (response.warnings || []).concat(['Idempotency result was too large to cache; retry may repeat the mutation.'])
      }
    }
    return response
  }

  function requireParam(params, name) {
    const val = params[name]
    if (val === undefined || val === null) throw new Error(`Missing required parameter: ${name}`)
    if (typeof val === 'string' && !val.trim()) throw new Error(`Missing required parameter: ${name}`)
    return typeof val === 'string' ? val.trim() : val
  }

  function optionalString(params, name, def) {
    return typeof params[name] === 'string' ? params[name].trim() || def : def
  }

  function optionalNumber(params, name, def) {
    const val = params[name]
    if (typeof val === 'number' && !Number.isNaN(val)) return val
    if (typeof val === 'string' && !Number.isNaN(Number(val))) return Number(val)
    return def
  }

  function optionalBool(params, name) {
    if (typeof params[name] === 'boolean') return params[name]
    if (params[name] === 'true') return true
    if (params[name] === 'false') return false
    return undefined
  }

  function validateId(name, id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(String(id))) throw new Error(`Invalid ${name}: ${id}`)
  }

  function boundedNumber(params, name, def, min, max) {
    const value = Math.floor(optionalNumber(params, name, def))
    if (value < min) return { error: err('BAD_REQUEST', `${name} must be at least ${min}`) }
    if (value > max) return { error: limitExceeded(name, value, max) }
    return { value: value }
  }

  function validateText(value, name, max, required) {
    if (value === undefined || value === null) {
      if (required) return { error: err('BAD_REQUEST', `${name} is required`) }
      return { value: undefined }
    }
    const text = String(value).trim()
    if (required && !text) return { error: err('BAD_REQUEST', `${name} is required`) }
    if (text.length > max) return { error: limitExceeded(name + ' characters', text.length, max) }
    return { value: text }
  }

  function safeCall(fn, fallback) {
    try { return fn() } catch (_) { return fallback }
  }

  function openForm(formId) {
    validateId('formId', formId)
    return FormApp.openById(formId)
  }

  function enumName(value) {
    return value === undefined || value === null ? null : String(value)
  }

  function formToJSON(form, includeItems) {
    const destinationType = safeCall(function() { return form.getDestinationType() }, null)
    const items = includeItems ? form.getItems().slice(0, LIMITS.items).map(itemToJSON) : undefined
    return {
      id: form.getId(),
      title: form.getTitle(),
      description: safeCall(function() { return form.getDescription() }, ''),
      editUrl: safeCall(function() { return form.getEditUrl() }, null),
      publishedUrl: safeCall(function() { return form.getPublishedUrl() }, null),
      summaryUrl: safeCall(function() { return form.getSummaryUrl() }, null),
      acceptingResponses: safeCall(function() { return form.isAcceptingResponses() }, null),
      confirmationMessage: safeCall(function() { return form.getConfirmationMessage() }, ''),
      customClosedFormMessage: safeCall(function() { return form.getCustomClosedFormMessage() }, ''),
      collectsEmail: safeCall(function() { return form.collectsEmail() }, null),
      allowResponseEdits: safeCall(function() { return form.canEditResponse() }, null),
      limitOneResponsePerUser: safeCall(function() { return form.hasLimitOneResponsePerUser() }, null),
      publishingSummary: safeCall(function() { return form.isPublishingSummary() }, null),
      published: safeCall(function() { return form.isPublished() }, null),
      showLinkToRespondAgain: safeCall(function() { return form.hasRespondAgainLink() }, null),
      requiresLogin: safeCall(function() { return form.requiresLogin() }, null),
      progressBar: safeCall(function() { return form.hasProgressBar() }, null),
      quiz: safeCall(function() { return form.isQuiz() }, null),
      destinationType: enumName(destinationType),
      destinationId: safeCall(function() { return form.getDestinationId() }, null),
      itemCount: safeCall(function() { return form.getItems().length }, null),
      responseCount: safeCall(function() { return form.getResponses().length }, null),
      items: items,
    }
  }

  function typedItem(item) {
    const type = item.getType()
    if (type === FormApp.ItemType.TEXT && item.asTextItem) return item.asTextItem()
    if (type === FormApp.ItemType.PARAGRAPH_TEXT && item.asParagraphTextItem) return item.asParagraphTextItem()
    if (type === FormApp.ItemType.MULTIPLE_CHOICE && item.asMultipleChoiceItem) return item.asMultipleChoiceItem()
    if (type === FormApp.ItemType.CHECKBOX && item.asCheckboxItem) return item.asCheckboxItem()
    if (type === FormApp.ItemType.LIST && item.asListItem) return item.asListItem()
    if (type === FormApp.ItemType.SCALE && item.asScaleItem) return item.asScaleItem()
    if (type === FormApp.ItemType.DATE && item.asDateItem) return item.asDateItem()
    if (type === FormApp.ItemType.TIME && item.asTimeItem) return item.asTimeItem()
    if (type === FormApp.ItemType.SECTION_HEADER && item.asSectionHeaderItem) return item.asSectionHeaderItem()
    if (type === FormApp.ItemType.PAGE_BREAK && item.asPageBreakItem) return item.asPageBreakItem()
    return item
  }

  function itemToJSON(item) {
    const type = item.getType()
    const typed = typedItem(item)
    const data = {
      itemId: item.getId(),
      index: item.getIndex(),
      type: enumName(type),
      title: safeCall(function() { return item.getTitle() }, ''),
      helpText: safeCall(function() { return item.getHelpText() }, ''),
      required: safeCall(function() { return typed.isRequired() }, null),
    }
    if (typed.getChoices) data.choices = typed.getChoices().map(function(choice) { return choice.getValue() })
    if (typed.hasOtherOption) data.hasOtherOption = safeCall(function() { return typed.hasOtherOption() }, null)
    if (type === FormApp.ItemType.SCALE) {
      data.lowerBound = safeCall(function() { return typed.getLowerBound() }, null)
      data.upperBound = safeCall(function() { return typed.getUpperBound() }, null)
      data.leftLabel = safeCall(function() { return typed.getLeftLabel() }, '')
      data.rightLabel = safeCall(function() { return typed.getRightLabel() }, '')
    }
    return data
  }

  function findItem(form, itemId) {
    validateId('itemId', itemId)
    const items = form.getItems()
    for (let i = 0; i < items.length; i++) {
      if (String(items[i].getId()) === String(itemId)) return items[i]
    }
    throw new Error(`Item not found: ${itemId}`)
  }

  function normalizeItemType(value) {
    const type = String(value || '').trim().toUpperCase()
    const map = {
      TEXT: 'TEXT',
      PARAGRAPH_TEXT: 'PARAGRAPH_TEXT',
      PARAGRAPH: 'PARAGRAPH_TEXT',
      MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
      CHECKBOX: 'CHECKBOX',
      LIST: 'LIST',
      SCALE: 'SCALE',
      DATE: 'DATE',
      TIME: 'TIME',
      SECTION_HEADER: 'SECTION_HEADER',
      PAGE_BREAK: 'PAGE_BREAK',
    }
    return map[type] || null
  }

  function choicesFromParams(params) {
    const values = Array.isArray(params.choices) ? params.choices : []
    if (values.length === 0) return { error: err('BAD_REQUEST', 'choices must be a non-empty array for this item type') }
    if (values.length > LIMITS.choices) return { error: limitExceeded('choices', values.length, LIMITS.choices) }
    const choices = []
    for (let i = 0; i < values.length; i++) {
      const choice = validateText(values[i], 'choice', LIMITS.choiceChars, true)
      if (choice.error) return choice
      choices.push(choice.value)
    }
    return { values: choices }
  }

  function applyCommonItemFields(item, params) {
    if (params.title !== undefined) {
      const title = validateText(params.title, 'title', LIMITS.titleChars, true)
      if (title.error) return title.error
      item.setTitle(title.value)
    }
    if (params.helpText !== undefined) {
      const helpText = validateText(params.helpText, 'helpText', LIMITS.descriptionChars, false)
      if (helpText.error) return helpText.error
      item.setHelpText(helpText.value || '')
    }
    const typed = typedItem(item)
    if (params.required !== undefined && typed.setRequired) typed.setRequired(!!params.required)
    return null
  }

  function applySpecificItemFields(item, params) {
    const type = item.getType()
    const typed = typedItem(item)
    if (type === FormApp.ItemType.MULTIPLE_CHOICE || type === FormApp.ItemType.CHECKBOX || type === FormApp.ItemType.LIST) {
      if (params.choices !== undefined) {
        const choices = choicesFromParams(params)
        if (choices.error) return choices.error
        typed.setChoiceValues(choices.values)
      }
      if (params.showOtherOption !== undefined && typed.showOtherOption) typed.showOtherOption(!!params.showOtherOption)
    }
    if (type === FormApp.ItemType.SCALE) {
      if (params.lowerBound !== undefined || params.upperBound !== undefined) {
        const lower = Math.floor(optionalNumber(params, 'lowerBound', safeCall(function() { return typed.getLowerBound() }, 1)))
        const upper = Math.floor(optionalNumber(params, 'upperBound', safeCall(function() { return typed.getUpperBound() }, 5)))
        if (lower < 0 || upper > 10 || lower >= upper) return err('BAD_REQUEST', 'scale bounds must satisfy 0 <= lowerBound < upperBound <= 10')
        typed.setBounds(lower, upper)
      }
      if (params.leftLabel !== undefined || params.rightLabel !== undefined) {
        typed.setLabels(String(params.leftLabel || ''), String(params.rightLabel || ''))
      }
    }
    return null
  }

  function validateCommonItemFields(params) {
    if (params.title !== undefined) {
      const title = validateText(params.title, 'title', LIMITS.titleChars, true)
      if (title.error) return title.error
    }
    if (params.helpText !== undefined) {
      const helpText = validateText(params.helpText, 'helpText', LIMITS.descriptionChars, false)
      if (helpText.error) return helpText.error
    }
    return null
  }

  function validateSpecificItemFields(itemType, params) {
    if ((itemType === 'MULTIPLE_CHOICE' || itemType === 'CHECKBOX' || itemType === 'LIST') && params.choices !== undefined) {
      const choices = choicesFromParams(params)
      if (choices.error) return choices.error
    }
    if (itemType === 'SCALE' && (params.lowerBound !== undefined || params.upperBound !== undefined)) {
      const lower = Math.floor(optionalNumber(params, 'lowerBound', 1))
      const upper = Math.floor(optionalNumber(params, 'upperBound', 5))
      if (lower < 0 || upper > 10 || lower >= upper) return err('BAD_REQUEST', 'scale bounds must satisfy 0 <= lowerBound < upperBound <= 10')
    }
    return null
  }

  function validateFormSettings(params) {
    if (params.title !== undefined) {
      const title = validateText(params.title, 'title', LIMITS.titleChars, true)
      if (title.error) return title.error
    }
    if (params.description !== undefined) {
      const description = validateText(params.description, 'description', LIMITS.descriptionChars, false)
      if (description.error) return description.error
    }
    if (params.confirmationMessage !== undefined) {
      const confirmationMessage = validateText(params.confirmationMessage, 'confirmationMessage', LIMITS.descriptionChars, false)
      if (confirmationMessage.error) return confirmationMessage.error
    }
    if (params.customClosedFormMessage !== undefined) {
      const customClosedFormMessage = validateText(params.customClosedFormMessage, 'customClosedFormMessage', LIMITS.descriptionChars, false)
      if (customClosedFormMessage.error) return customClosedFormMessage.error
    }
    return null
  }

  function addTypedItem(form, itemType) {
    switch (itemType) {
      case 'TEXT': return form.addTextItem()
      case 'PARAGRAPH_TEXT': return form.addParagraphTextItem()
      case 'MULTIPLE_CHOICE': return form.addMultipleChoiceItem()
      case 'CHECKBOX': return form.addCheckboxItem()
      case 'LIST': return form.addListItem()
      case 'SCALE': return form.addScaleItem()
      case 'DATE': return form.addDateItem()
      case 'TIME': return form.addTimeItem()
      case 'SECTION_HEADER': return form.addSectionHeaderItem()
      case 'PAGE_BREAK': return form.addPageBreakItem()
      default: throw new Error(`Unsupported itemType: ${itemType}`)
    }
  }

  function responseToJSON(response, includeAnswers) {
    const answers = includeAnswers ? response.getItemResponses().slice(0, LIMITS.responseAnswers).map(function(itemResponse) {
      const item = itemResponse.getItem()
      const raw = itemResponse.getResponse()
      const serialized = Array.isArray(raw) ? raw.map(String) : (raw === undefined || raw === null ? null : String(raw))
      return {
        itemId: item.getId(),
        title: item.getTitle(),
        type: enumName(item.getType()),
        response: serialized,
      }
    }) : undefined
    return {
      responseId: response.getId(),
      timestamp: safeCall(function() { return response.getTimestamp().toISOString() }, null),
      respondentEmail: safeCall(function() { return response.getRespondentEmail() }, null),
      editResponseUrl: safeCall(function() { return response.getEditResponseUrl() }, null),
      answerCount: safeCall(function() { return response.getItemResponses().length }, 0),
      answers: answers,
    }
  }

  function formCreate(params) {
    const title = validateText(requireParam(params, 'title'), 'title', LIMITS.titleChars, true)
    if (title.error) return title.error
    const isPublished = optionalBool(params, 'isPublished')
    return withIdempotency('formCreate', params, function() { return trap(function() {
      const form = FormApp.create(title.value)
      form.setTitle(title.value)
      if (isPublished !== undefined) form.setPublished(isPublished)
      if (params.description !== undefined) {
        const description = validateText(params.description, 'description', LIMITS.descriptionChars, false)
        if (description.error) return description.error
        form.setDescription(description.value || '')
      }
      return { form: formToJSON(form, false) }
    }, 'CREATE_FAILED', function(e) { return e.message || 'Could not create form' }) })
  }

  function formGet(params) {
    const formId = requireParam(params, 'formId')
    const includeItems = optionalBool(params, 'includeItems') === true
    return trap(function() {
      const form = openForm(formId)
      return { form: formToJSON(form, includeItems) }
    }, 'NOT_FOUND', function(e) { return e.message || `Form not found: ${formId}` })
  }

  function formUpdate(params) {
    const formId = requireParam(params, 'formId')
    const settingsError = validateFormSettings(params)
    if (settingsError) return settingsError
    return trap(function() {
      const form = openForm(formId)
      if (params.title !== undefined) {
        form.setTitle(String(params.title).trim())
      }
      if (params.description !== undefined) {
        form.setDescription(String(params.description).trim())
      }
      if (params.confirmationMessage !== undefined) form.setConfirmationMessage(String(params.confirmationMessage).trim())
      if (params.customClosedFormMessage !== undefined) form.setCustomClosedFormMessage(String(params.customClosedFormMessage).trim())
      if (params.collectEmail !== undefined && form.setCollectEmail) form.setCollectEmail(!!params.collectEmail)
      if (params.allowResponseEdits !== undefined) form.setAllowResponseEdits(!!params.allowResponseEdits)
      if (params.limitOneResponsePerUser !== undefined) form.setLimitOneResponsePerUser(!!params.limitOneResponsePerUser)
      if (params.publishingSummary !== undefined) form.setPublishingSummary(!!params.publishingSummary)
      if (params.isPublished !== undefined) form.setPublished(!!params.isPublished)
      if (params.showLinkToRespondAgain !== undefined) form.setShowLinkToRespondAgain(!!params.showLinkToRespondAgain)
      if (params.requireLogin !== undefined) form.setRequireLogin(!!params.requireLogin)
      if (params.progressBar !== undefined) form.setProgressBar(!!params.progressBar)
      if (params.quiz !== undefined) form.setIsQuiz(!!params.quiz)
      return { form: formToJSON(form, false) }
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not update form: ${formId}` })
  }

  function formSetAcceptingResponses(params) {
    const formId = requireParam(params, 'formId')
    const acceptingResponses = optionalBool(params, 'acceptingResponses')
    if (acceptingResponses === undefined) return err('BAD_REQUEST', 'acceptingResponses must be true or false')
    if (params.customClosedFormMessage !== undefined) {
      const customClosedFormMessage = validateText(params.customClosedFormMessage, 'customClosedFormMessage', LIMITS.descriptionChars, false)
      if (customClosedFormMessage.error) return customClosedFormMessage.error
    }
    return trap(function() {
      const form = openForm(formId)
      if (params.customClosedFormMessage !== undefined) form.setCustomClosedFormMessage(String(params.customClosedFormMessage).trim())
      form.setAcceptingResponses(acceptingResponses)
      return { form: formToJSON(form, false) }
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not update accepting-responses setting: ${formId}` })
  }

  function formSetDestination(params) {
    const formId = requireParam(params, 'formId')
    const spreadsheetId = requireParam(params, 'spreadsheetId')
    validateId('spreadsheetId', spreadsheetId)
    return trap(function() {
      const form = openForm(formId)
      form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheetId)
      return { form: formToJSON(form, false) }
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not set response destination: ${formId}` })
  }

  function formRemoveDestination(params) {
    const formId = requireParam(params, 'formId')
    return trap(function() {
      const form = openForm(formId)
      form.removeDestination()
      return { form: formToJSON(form, false), destinationRemoved: true }
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not remove response destination: ${formId}` })
  }

  function itemsList(params) {
    const formId = requireParam(params, 'formId')
    return trap(function() {
      const form = openForm(formId)
      const items = form.getItems()
      if (items.length > LIMITS.items) return limitExceeded('items', items.length, LIMITS.items)
      return { formId: formId, items: items.map(itemToJSON) }
    }, 'LIST_FAILED', function(e) { return e.message || `Could not list items: ${formId}` })
  }

  function itemAdd(params) {
    const formId = requireParam(params, 'formId')
    const itemType = normalizeItemType(requireParam(params, 'itemType'))
    if (!itemType) return err('BAD_REQUEST', 'Unsupported itemType')
    return withIdempotency('itemAdd', params, function() { return trap(function() {
      const form = openForm(formId)
      const commonError = validateCommonItemFields(params)
      if (commonError) return commonError
      const specificError = validateSpecificItemFields(itemType, params)
      if (specificError) return specificError
      if (params.index !== undefined) {
        const index = boundedNumber(params, 'index', 0, 0, form.getItems().length)
        if (index.error) return index.error
      }
      const item = addTypedItem(form, itemType)
      const commonApplyError = applyCommonItemFields(item, params)
      if (commonApplyError) return commonApplyError
      const specificApplyError = applySpecificItemFields(item, params)
      if (specificApplyError) return specificApplyError
      if (params.index !== undefined) {
        const index = boundedNumber(params, 'index', item.getIndex(), 0, form.getItems().length - 1)
        if (index.error) return index.error
        form.moveItem(item, index.value)
      }
      return { item: itemToJSON(item) }
    }, 'CREATE_FAILED', function(e) { return e.message || `Could not add item to form: ${formId}` }) })
  }

  function itemUpdate(params) {
    const formId = requireParam(params, 'formId')
    const itemId = requireParam(params, 'itemId')
    return trap(function() {
      const form = openForm(formId)
      const item = findItem(form, itemId)
      const commonError = applyCommonItemFields(item, params)
      if (commonError) return commonError
      const specificError = applySpecificItemFields(item, params)
      if (specificError) return specificError
      return { item: itemToJSON(item) }
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not update item: ${itemId}` })
  }

  function itemMove(params) {
    const formId = requireParam(params, 'formId')
    const itemId = requireParam(params, 'itemId')
    return trap(function() {
      const form = openForm(formId)
      const item = findItem(form, itemId)
      const index = boundedNumber(params, 'index', 0, 0, form.getItems().length - 1)
      if (index.error) return index.error
      const moved = form.moveItem(item, index.value)
      return { item: itemToJSON(moved) }
    }, 'MOVE_FAILED', function(e) { return e.message || `Could not move item: ${itemId}` })
  }

  function itemDelete(params) {
    const formId = requireParam(params, 'formId')
    const itemId = requireParam(params, 'itemId')
    return trap(function() {
      const form = openForm(formId)
      const item = findItem(form, itemId)
      const index = item.getIndex()
      form.deleteItem(item)
      return { deleted: true, formId: formId, itemId: itemId, previousIndex: index }
    }, 'DELETE_FAILED', function(e) { return e.message || `Could not delete item: ${itemId}` })
  }

  function responsesList(params) {
    const formId = requireParam(params, 'formId')
    const max = boundedNumber(params, 'maxResults', 20, 1, LIMITS.responses)
    if (max.error) return max.error
    const includeAnswers = optionalBool(params, 'includeAnswers') === true
    return trap(function() {
      const form = openForm(formId)
      const responses = form.getResponses()
      const page = Math.floor(optionalNumber(params, 'page', 0))
      if (page < 0) return err('BAD_REQUEST', 'page must be non-negative')
      const offset = page * max.value
      const slice = responses.slice(offset, offset + max.value)
      return ok({ formId: formId, items: slice.map(function(response) { return responseToJSON(response, includeAnswers) }) }, {
        nextPageToken: offset + max.value < responses.length ? String(page + 1) : undefined,
        hasMore: offset + max.value < responses.length,
      })
    }, 'LIST_FAILED', function(e) { return e.message || `Could not list responses: ${formId}` })
  }

  function responseGet(params) {
    const formId = requireParam(params, 'formId')
    const responseId = requireParam(params, 'responseId')
    return trap(function() {
      const form = openForm(formId)
      return { response: responseToJSON(form.getResponse(responseId), true) }
    }, 'NOT_FOUND', function(e) { return e.message || `Response not found: ${responseId}` })
  }

  function responseDelete(params) {
    const formId = requireParam(params, 'formId')
    const responseId = requireParam(params, 'responseId')
    return trap(function() {
      const form = openForm(formId)
      form.deleteResponse(responseId)
      return { deleted: true, formId: formId, responseId: responseId }
    }, 'DELETE_FAILED', function(e) { return e.message || `Could not delete response: ${responseId}` })
  }

  function responsesDeleteAll(params) {
    const formId = requireParam(params, 'formId')
    return trap(function() {
      const form = openForm(formId)
      const count = form.getResponses().length
      form.deleteAllResponses()
      return { deleted: true, formId: formId, deletedCount: count }
    }, 'DELETE_FAILED', function(e) { return e.message || `Could not delete form responses: ${formId}` })
  }

  function trap(fn, errorCode, errorMsg) {
    try {
      const result = fn()
      return result && typeof result.success === 'boolean' ? result : ok(result)
    } catch (e) {
      if (e && e.proxyError) return e.proxyError
      const correlationId = Utilities.getUuid()
      console.error('[forms-proxy] correlationId=%s code=%s error=%s', correlationId, errorCode, e && e.message ? e.message : String(e))
      const message = typeof errorMsg === 'function' ? errorMsg(e) : (typeof errorMsg === 'string' ? errorMsg : `${errorCode} failed. See Apps Script logs with correlationId ${correlationId}.`)
      return err(errorCode, message, correlationId)
    }
  }

  function runBatch(params, handleFn) {
    const ops = params.operations
    if (!Array.isArray(ops) || ops.length === 0) return err('BAD_REQUEST', 'operations must be a non-empty array')
    if (ops.length > 20) return limitExceeded('batch operations', ops.length, 20)
    const results = []
    let operationWeight = 1
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i]
      const invalid = validateBatchOperation_(op, i, BATCH_ACTIONS)
      if (invalid) { results.push(invalid); continue }
      operationWeight += actionWeightForPolicy(op.action, ACTION_POLICIES)
      try {
        const result = handleFn(op.action, op.params || {})
        results.push({ index: i, action: op.action, success: result.success, data: result.success ? result.data : undefined, error: result.success ? undefined : result.error })
      } catch (ex) {
        const correlationId = Utilities.getUuid()
        console.error('[forms-proxy] correlationId=%s batchAction=%s error=%s', correlationId, op.action, ex && ex.message ? ex.message : String(ex))
        results.push({ index: i, action: op.action, success: false, error: { code: 'INTERNAL_ERROR', message: 'Batch operation failed. See Apps Script logs with correlationId ' + correlationId + '.', correlationId: correlationId } })
      }
    }
    const response = batchResponse_(results, operationWeight);
    const payload = JSON.stringify(response)
    if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes)
    return response
  }

  function batch(params) {
    return runBatch(params, handle)
  }

  const ACTIONS = {
    formCreate, formGet, formUpdate, formSetAcceptingResponses,
    formSetDestination, formRemoveDestination, itemsList, itemAdd,
    itemUpdate, itemMove, itemDelete, responsesList, responseGet,
    responseDelete, responsesDeleteAll, batch,
  }

  return { handle: handle, requestWeight: requestWeight }
})()
