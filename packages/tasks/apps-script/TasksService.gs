const TasksService = (() => {
  const ACTION_POLICIES = {
    tasklistsList: { class: 'read' },
    tasklistsGet: { class: 'read' },
    tasklistsCreate: { class: 'write' },
    tasklistsUpdate: { class: 'write' },
    tasklistsDelete: { class: 'destructive' },
    tasksList: { class: 'read' },
    tasksGet: { class: 'read' },
    tasksCreate: { class: 'write' },
    tasksUpdate: { class: 'write' },
    tasksMove: { class: 'write' },
    tasksDelete: { class: 'destructive' },
    tasksClear: { class: 'destructive' },
    batch: { class: 'read' },
  }

  const BATCH_ACTIONS = {
    tasklistsList: true, tasklistsGet: true, tasklistsCreate: true,
    tasklistsUpdate: true, tasklistsDelete: true, tasksList: true,
    tasksGet: true, tasksCreate: true, tasksUpdate: true,
    tasksMove: true, tasksDelete: true, tasksClear: true,
  }

  const LIMITS = {
    tasklistsPageSize: 100,
    tasksPageSize: 100,
    titleChars: 1024,
    notesChars: 10000,
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
    const prop = 'IDEMPOTENCY:tasks:' + action + ':' + key
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

  function boundedPageSize(params, name, def, max) {
    const value = Math.floor(optionalNumber(params, name, def))
    if (value < 1) return { error: err('BAD_REQUEST', `${name} must be at least 1`) }
    if (value > max) return { error: limitExceeded(name, value, max) }
    return { value: value }
  }

  function validateTasksId(name, id) {
    if (!/^[a-zA-Z0-9_@.\-]+$/.test(String(id))) throw new Error(`Invalid ${name}: ${id}`)
  }

  function validateTitle(title) {
    const value = String(title || '').trim()
    if (!value) return { error: err('BAD_REQUEST', 'title is required') }
    if (value.length > LIMITS.titleChars) return { error: limitExceeded('title characters', value.length, LIMITS.titleChars) }
    return { value: value }
  }

  function validateNotes(notes) {
    if (notes === undefined) return { value: undefined }
    const value = String(notes)
    if (value.length > LIMITS.notesChars) return { error: limitExceeded('notes characters', value.length, LIMITS.notesChars) }
    return { value: value }
  }

  function normalizeDue(due) {
    if (due === undefined) return { value: undefined }
    const date = new Date(String(due))
    if (Number.isNaN(date.getTime())) return { error: err('BAD_REQUEST', 'due must be a valid ISO/RFC3339 datetime') }
    return { value: date.toISOString() }
  }

  function normalizeStatus(status) {
    if (status === undefined) return { value: undefined }
    const value = String(status)
    if (value !== 'needsAction' && value !== 'completed') return { error: err('BAD_REQUEST', 'status must be needsAction or completed') }
    return { value: value }
  }

  function tasklistToJSON(tasklist) {
    return {
      id: tasklist.id,
      title: tasklist.title,
      etag: tasklist.etag,
      updated: tasklist.updated,
      selfLink: tasklist.selfLink,
    }
  }

  function taskToJSON(task) {
    return {
      id: task.id,
      title: task.title,
      notes: task.notes,
      status: task.status,
      due: task.due,
      completed: task.completed,
      updated: task.updated,
      parent: task.parent,
      position: task.position,
      hidden: task.hidden,
      deleted: task.deleted,
      links: task.links,
      selfLink: task.selfLink,
      etag: task.etag,
    }
  }

  function tasklistsList(params) {
    const limit = boundedPageSize(params, 'maxResults', 100, LIMITS.tasklistsPageSize)
    if (limit.error) return limit.error
    const args = { maxResults: limit.value }
    const pageToken = optionalString(params, 'pageToken')
    if (pageToken) args.pageToken = pageToken

    return trap(function() {
      const response = Tasks.Tasklists.list(args)
      const items = (response.items || []).map(tasklistToJSON)
      return ok({ items: items }, { nextPageToken: response.nextPageToken, hasMore: !!response.nextPageToken })
    }, 'LIST_FAILED', function(e) { return e.message || 'Could not list task lists' })
  }

  function tasklistsGet(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    validateTasksId('tasklistId', tasklistId)
    return trap(function() {
      return { tasklist: tasklistToJSON(Tasks.Tasklists.get(tasklistId)) }
    }, 'NOT_FOUND', function(e) { return e.message || `Task list not found: ${tasklistId}` })
  }

  function tasklistsCreate(params) {
    const title = validateTitle(requireParam(params, 'title'))
    if (title.error) return title.error
    return withIdempotency('tasklistsCreate', params, function() { return trap(function() {
      return { tasklist: tasklistToJSON(Tasks.Tasklists.insert({ title: title.value })) }
    }, 'CREATE_FAILED', function(e) { return e.message || 'Could not create task list' }) })
  }

  function tasklistsUpdate(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    validateTasksId('tasklistId', tasklistId)
    const title = validateTitle(requireParam(params, 'title'))
    if (title.error) return title.error
    return trap(function() {
      return { tasklist: tasklistToJSON(Tasks.Tasklists.update({ id: tasklistId, title: title.value }, tasklistId)) }
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not update task list: ${tasklistId}` })
  }

  function tasklistsDelete(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    validateTasksId('tasklistId', tasklistId)
    return trap(function() {
      Tasks.Tasklists.remove(tasklistId)
      return { deleted: true, tasklistId: tasklistId }
    }, 'DELETE_FAILED', function(e) { return e.message || `Could not delete task list: ${tasklistId}` })
  }

  function tasksList(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    validateTasksId('tasklistId', tasklistId)
    const limit = boundedPageSize(params, 'maxResults', 100, LIMITS.tasksPageSize)
    if (limit.error) return limit.error
    const args = { maxResults: limit.value }
    const pageToken = optionalString(params, 'pageToken')
    if (pageToken) args.pageToken = pageToken
    for (const name of ['showCompleted', 'showDeleted', 'showHidden']) {
      const value = optionalBool(params, name)
      if (value !== undefined) args[name] = value
    }
    for (const name of ['completedMin', 'completedMax', 'dueMin', 'dueMax', 'updatedMin']) {
      const value = optionalString(params, name)
      if (value) args[name] = value
    }

    return trap(function() {
      const response = Tasks.Tasks.list(tasklistId, args)
      const items = (response.items || []).map(taskToJSON)
      return ok({ tasklistId: tasklistId, items: items }, { nextPageToken: response.nextPageToken, hasMore: !!response.nextPageToken })
    }, 'LIST_FAILED', function(e) { return e.message || `Could not list tasks for task list: ${tasklistId}` })
  }

  function tasksGet(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    const taskId = requireParam(params, 'taskId')
    validateTasksId('tasklistId', tasklistId)
    validateTasksId('taskId', taskId)
    return trap(function() {
      return { task: taskToJSON(Tasks.Tasks.get(tasklistId, taskId)) }
    }, 'NOT_FOUND', function(e) { return e.message || `Task not found: ${taskId}` })
  }

  function taskResourceFromParams(params, existing) {
    const resource = existing ? {
      id: existing.id,
      title: existing.title,
      notes: existing.notes,
      due: existing.due,
      status: existing.status,
    } : {}
    let changed = false

    if (params.title !== undefined) {
      const title = validateTitle(params.title)
      if (title.error) return { error: title.error }
      resource.title = title.value
      changed = true
    }
    if (params.notes !== undefined) {
      const notes = validateNotes(params.notes)
      if (notes.error) return { error: notes.error }
      resource.notes = notes.value
      changed = true
    }
    if (params.due !== undefined) {
      const due = normalizeDue(params.due)
      if (due.error) return { error: due.error }
      resource.due = due.value
      changed = true
    }
    if (params.status !== undefined) {
      const status = normalizeStatus(params.status)
      if (status.error) return { error: status.error }
      resource.status = status.value
      changed = true
    }

    return { resource: resource, changed: changed }
  }

  function tasksCreate(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    validateTasksId('tasklistId', tasklistId)
    const title = validateTitle(requireParam(params, 'title'))
    if (title.error) return title.error
    const resourceResult = taskResourceFromParams({ ...params, title: title.value }, null)
    if (resourceResult.error) return resourceResult.error
    const args = {}
    const parent = optionalString(params, 'parent')
    const previous = optionalString(params, 'previous')
    if (parent) { validateTasksId('parent', parent); args.parent = parent }
    if (previous) { validateTasksId('previous', previous); args.previous = previous }

    return withIdempotency('tasksCreate', params, function() { return trap(function() {
      return { task: taskToJSON(Tasks.Tasks.insert(resourceResult.resource, tasklistId, args)) }
    }, 'CREATE_FAILED', function(e) { return e.message || `Could not create task in task list: ${tasklistId}` }) })
  }

  function tasksUpdate(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    const taskId = requireParam(params, 'taskId')
    validateTasksId('tasklistId', tasklistId)
    validateTasksId('taskId', taskId)

    return trap(function() {
      const existing = Tasks.Tasks.get(tasklistId, taskId)
      const resourceResult = taskResourceFromParams(params, existing)
      if (resourceResult.error) return resourceResult.error
      if (!resourceResult.changed) return err('BAD_REQUEST', 'At least one of title, notes, due, or status must be provided')
      return { task: taskToJSON(Tasks.Tasks.update(resourceResult.resource, tasklistId, taskId)) }
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not update task: ${taskId}` })
  }

  function tasksDelete(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    const taskId = requireParam(params, 'taskId')
    validateTasksId('tasklistId', tasklistId)
    validateTasksId('taskId', taskId)
    return trap(function() {
      Tasks.Tasks.remove(tasklistId, taskId)
      return { deleted: true, tasklistId: tasklistId, taskId: taskId }
    }, 'DELETE_FAILED', function(e) { return e.message || `Could not delete task: ${taskId}` })
  }

  function tasksMove(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    const taskId = requireParam(params, 'taskId')
    validateTasksId('tasklistId', tasklistId)
    validateTasksId('taskId', taskId)
    const args = {}
    const parent = optionalString(params, 'parent')
    const previous = optionalString(params, 'previous')
    if (parent) { validateTasksId('parent', parent); args.parent = parent }
    if (previous) { validateTasksId('previous', previous); args.previous = previous }

    return trap(function() {
      return { task: taskToJSON(Tasks.Tasks.move(tasklistId, taskId, args)) }
    }, 'MOVE_FAILED', function(e) { return e.message || `Could not move task: ${taskId}` })
  }

  function tasksClear(params) {
    const tasklistId = requireParam(params, 'tasklistId')
    validateTasksId('tasklistId', tasklistId)
    return trap(function() {
      Tasks.Tasks.clear(tasklistId)
      return { clearedCompleted: true, tasklistId: tasklistId }
    }, 'CLEAR_FAILED', function(e) { return e.message || `Could not clear completed tasks for task list: ${tasklistId}` })
  }

  function trap(fn, errorCode, errorMsg) {
    try {
      const result = fn()
      return result && typeof result.success === 'boolean' ? result : ok(result)
    } catch (e) {
      if (e && e.proxyError) return e.proxyError
      const correlationId = Utilities.getUuid()
      console.error('[tasks-proxy] correlationId=%s code=%s error=%s', correlationId, errorCode, e && e.message ? e.message : String(e))
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
        console.error('[tasks-proxy] correlationId=%s batchAction=%s error=%s', correlationId, op.action, ex && ex.message ? ex.message : String(ex))
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
    tasklistsList, tasklistsGet, tasklistsCreate, tasklistsUpdate,
    tasklistsDelete, tasksList, tasksGet, tasksCreate, tasksUpdate,
    tasksMove, tasksDelete, tasksClear, batch,
  }

  return { handle: handle, requestWeight: requestWeight }
})()
