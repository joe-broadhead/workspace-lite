var DriveService = (() => {
  const ACCESS_MAP = {
    ANYONE: DriveApp.Access.ANYONE,
    ANYONE_WITH_LINK: DriveApp.Access.ANYONE_WITH_LINK,
    DOMAIN: DriveApp.Access.DOMAIN,
    DOMAIN_WITH_LINK: DriveApp.Access.DOMAIN_WITH_LINK,
    PRIVATE: DriveApp.Access.PRIVATE
  };

  const PERMISSION_MAP = {
    NONE: DriveApp.Permission.NONE,
    VIEW: DriveApp.Permission.VIEW,
    EDIT: DriveApp.Permission.EDIT,
    COMMENT: DriveApp.Permission.COMMENT,
    ORGANIZER: DriveApp.Permission.ORGANIZER,
    FILE_ORGANIZER: DriveApp.Permission.FILE_ORGANIZER,
    OWNER: DriveApp.Permission.OWNER
  };

  const ACTION_POLICIES = {
    about: { class: 'read' },
    fileGet: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileList: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['folderId'], defaultValue: 'root' }] },
    fileSearch: { class: 'read' },
    fileExport: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    folderGet: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['folderId'] }] },
    folderList: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['folderId'], defaultValue: 'root' }] },
    folderListRoot: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['folderId'], defaultValue: 'root' }] },
    folderPath: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileGetPermissions: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileExportAs: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    commentsList: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    commentsGet: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    repliesList: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    repliesGet: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    revisionsList: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    revisionsGet: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    sharedDrivesList: { class: 'read' },
    sharedDrivesGet: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_SHARED_DRIVE_IDS', params: ['driveId'] }] },
    changesStartPageToken: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_SHARED_DRIVE_IDS', params: ['driveId'], requiredWhenConfigured: true }] },
    changesList: { class: 'read', allowlists: [{ property: 'ALLOWED_DRIVE_SHARED_DRIVE_IDS', params: ['driveId'], requiredWhenConfigured: true }] },
    folderCreate: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['parentId'], defaultValue: 'root' }] },
    fileCreate: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['parentId'], defaultValue: 'root' }] },
    fileCopy: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }, { property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['destFolderId'] }] },
    fileMove: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }, { property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['destFolderId'] }] },
    fileUpdateMeta: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileUpdateContent: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileAddParent: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }, { property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['folderId'] }] },
    commentCreate: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    commentsUpdate: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    repliesCreate: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    repliesUpdate: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    revisionsUpdate: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileUntrash: { class: 'write', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileSetSharing: { class: 'share', blockPublicSharing: true, allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileAddEditor: { class: 'share', recipientParams: ['email'], requiresKnownRecipients: true, allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileAddViewer: { class: 'share', recipientParams: ['email'], requiresKnownRecipients: true, allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileRemoveEditor: { class: 'share', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileRemoveViewer: { class: 'share', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileRemoveParent: { class: 'destructive', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }, { property: 'ALLOWED_DRIVE_FOLDER_IDS', params: ['folderId'] }] },
    fileTrash: { class: 'destructive', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    fileDelete: { class: 'destructive', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    commentsDelete: { class: 'destructive', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    repliesDelete: { class: 'destructive', allowlists: [{ property: 'ALLOWED_DRIVE_FILE_IDS', params: ['fileId'] }] },
    batch: { class: 'read' },
  }

  const BATCH_ACTIONS = {
    about: true, fileGet: true, fileList: true, fileSearch: true,
    fileExport: true, folderGet: true, folderList: true, folderListRoot: true,
    folderCreate: true, fileCreate: true, fileCopy: true, fileMove: true,
    fileUpdateMeta: true, fileUpdateContent: true, fileGetPermissions: true,
    fileSetSharing: true, fileAddEditor: true, fileAddViewer: true,
    fileRemoveEditor: true, fileRemoveViewer: true, fileAddParent: true,
    fileRemoveParent: true, folderPath: true, fileTrash: true,
    fileUntrash: true, fileDelete: true, fileExportAs: true,
    commentsList: true, commentsGet: true, commentCreate: true,
    commentsUpdate: true, commentsDelete: true, repliesList: true,
    repliesCreate: true, repliesGet: true, repliesUpdate: true,
    repliesDelete: true, revisionsList: true, revisionsGet: true,
    revisionsUpdate: true, sharedDrivesList: true, sharedDrivesGet: true,
    changesStartPageToken: true, changesList: true,
  }

  const LIMITS = {
    pageSize: 100,
    pageOffset: 5000,
    folderEntries: 200,
    textChars: 500000,
    exportBytes: 5000000,
    writeBytes: 1000000,
    responseBytes: 1000000,
    pathDepth: 50,
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

  function partialOk(data, results, warnings) {
    const response = { success: true, data: data, partial: true, results: results, warnings: warnings };
    const payload = JSON.stringify(response);
    if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes);
    return response;
  }

  function withIdempotency(action, params, fn) {
    const key = optionalString(params || {}, 'idempotencyKey');
    if (!key) return fn();
    if (!/^[a-zA-Z0-9._:-]{1,128}$/.test(key)) return err('BAD_REQUEST', 'idempotencyKey must be 1-128 characters: letters, numbers, dot, underscore, colon, or dash');

    const store = PropertiesService.getScriptProperties();
    const prop = 'IDEMPOTENCY:drive:' + action + ':' + key;
    const cached = store.getProperty(prop);
    if (cached) {
      try {
        const response = JSON.parse(cached);
        if (response && response.success === true) {
          response.warnings = (response.warnings || []).concat(['Idempotency key replayed; mutation was not repeated.']);
          return response;
        }
      } catch (_) {
        store.deleteProperty(prop);
      }
    }

    const response = fn();
    if (response && response.success === true) {
      const payload = JSON.stringify(response);
      if (payload.length <= 8000) {
        store.setProperty(prop, payload);
      } else {
        response.warnings = (response.warnings || []).concat(['Idempotency result was too large to cache; retry may repeat the mutation.']);
      }
    }
    return response;
  }

  function boundedPageSize(params, name, def) {
    const value = Math.floor(optionalNumber(params, name, def));
    if (value < 1) return { error: err('BAD_REQUEST', `${name} must be at least 1`) };
    if (value > LIMITS.pageSize) return { error: limitExceeded(name, value, LIMITS.pageSize) };
    return { value: value };
  }

  const ACTIONS = {
    about, fileGet, fileList, fileSearch, fileExport, folderGet,
    folderList, folderListRoot, folderCreate, fileCreate, fileCopy,
    fileMove, fileUpdateMeta, fileUpdateContent, fileGetPermissions,
    fileSetSharing, fileAddEditor, fileAddViewer, fileRemoveEditor,
    fileRemoveViewer, fileAddParent, fileRemoveParent, folderPath,
    fileTrash, fileUntrash, fileDelete, fileExportAs, commentsList,
    commentsGet, commentCreate, commentsUpdate, commentsDelete,
    repliesList, repliesCreate, repliesGet, repliesUpdate, repliesDelete,
    revisionsList, revisionsGet, revisionsUpdate, sharedDrivesList,
    sharedDrivesGet, changesStartPageToken, changesList, batch,
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

  function trap(fn, errorCode, errorMsg) {
    try {
      const result = fn();
      return result && typeof result.success === 'boolean' ? result : ok(result);
    }
    catch (e) {
      if (e && e.proxyError) return e.proxyError;
      const correlationId = Utilities.getUuid();
      console.error('[drive-proxy] correlationId=%s code=%s error=%s', correlationId, errorCode, e && e.message ? e.message : String(e));
      const message = typeof errorMsg === 'string' ? errorMsg : `${errorCode} failed. See Apps Script logs with correlationId ${correlationId}.`;
      return err(errorCode, message, correlationId);
    }
  }

  function validateDriveId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error(`Invalid Drive ID: ${id}`);
    }
  }

  function driveReadAllowlistsConfigured() {
    return policyPropertyHasList_('ALLOWED_DRIVE_FILE_IDS') || policyPropertyHasList_('ALLOWED_DRIVE_FOLDER_IDS');
  }

  function driveFileAllowedByReadAllowlists(file) {
    if (!driveReadAllowlistsConfigured()) return true;
    if (policyPropertyHasList_('ALLOWED_DRIVE_FILE_IDS') && policyValueAllowed_('ALLOWED_DRIVE_FILE_IDS', file.getId())) return true;
    if (policyPropertyHasList_('ALLOWED_DRIVE_FOLDER_IDS')) {
      const parents = file.getParents();
      while (parents.hasNext()) {
        if (policyValueAllowed_('ALLOWED_DRIVE_FOLDER_IDS', parents.next().getId())) return true;
      }
    }
    return false;
  }

  function fileToJSON(f) {
    return {
      id: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      url: f.getUrl(),
      size: f.getSize(),
      created: toString(f.getDateCreated()),
      updated: toString(f.getLastUpdated()),
      starred: f.isStarred(),
      trashed: typeof f.isTrashed === 'function' ? f.isTrashed() : false,
      owner: toString(getEmail(f.getOwner())),
      parents: iteratorToArray(f.getParents())
    };
  }

  function folderToJSON(f) {
    return {
      id: f.getId(),
      name: f.getName(),
      url: f.getUrl(),
      created: toString(f.getDateCreated()),
      updated: toString(f.getLastUpdated()),
      owner: toString(getEmail(f.getOwner())),
      parents: iteratorToArray(f.getParents())
    };
  }

  function toString(val) {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (val.toISOString) return val.toISOString();
    return String(val);
  }

  function getEmail(user) {
    if (!user) return null;
    try { return user.getEmail(); } catch(e) { return null; }
  }

  function iteratorToArray(it) {
    const arr = [];
    while (it.hasNext()) arr.push(it.next());
    return arr;
  }

  function commentToJSON(c) {
    if (!c) return null;
    return {
      id: c.id || c.commentId || null,
      content: c.content || null,
      htmlContent: c.htmlContent || null,
      author: userToJSON(c.author),
      createdTime: c.createdTime || null,
      modifiedTime: c.modifiedTime || null,
      resolved: c.resolved || false,
      deleted: c.deleted || false,
      anchor: c.anchor ? String(c.anchor) : null,
      quotedFileContent: c.quotedFileContent || null,
      repliesCount: c.replies ? (Array.isArray(c.replies) ? c.replies.length : 0) : 0,
      replies: c.replies ? c.replies.map(replyToJSON) : undefined,
    };
  }

  function replyToJSON(r) {
    if (!r) return null;
    return {
      id: r.id || r.replyId || null,
      content: r.content || null,
      htmlContent: r.htmlContent || null,
      author: userToJSON(r.author),
      createdTime: r.createdTime || null,
      modifiedTime: r.modifiedTime || null,
      action: r.action || null,
      deleted: r.deleted || false,
    };
  }

  function revisionToJSON(r) {
    if (!r) return null;
    return {
      id: r.id || null,
      mimeType: r.mimeType || null,
      modifiedTime: r.modifiedTime || null,
      keepForever: r.keepForever || false,
      published: r.published || false,
      publishedOutsideDomain: r.publishedOutsideDomain || false,
      publishAuto: r.publishAuto || false,
      size: r.size || null,
      originalFilename: r.originalFilename || null,
      lastModifyingUser: userToJSON(r.lastModifyingUser),
    };
  }

  function sharedDriveToJSON(d) {
    if (!d) return null;
    return {
      id: d.id || null,
      name: d.name || null,
      colorRgb: d.colorRgb || null,
      backgroundImageLink: d.backgroundImageLink || null,
      createdTime: d.createdTime || null,
      hidden: d.hidden || false,
      capabilities: d.capabilities || undefined,
      restrictions: d.restrictions || undefined,
    };
  }

  function changeToJSON(c) {
    if (!c) return null;
    return {
      type: c.type || null,
      time: c.time || null,
      removed: c.removed || false,
      fileId: c.fileId || null,
      driveId: c.driveId || null,
      file: c.file ? {
        id: c.file.id || null,
        name: c.file.name || null,
        mimeType: c.file.mimeType || null,
        trashed: c.file.trashed || false,
        modifiedTime: c.file.modifiedTime || null,
      } : undefined,
      drive: c.drive ? sharedDriveToJSON(c.drive) : undefined,
    };
  }

  function userToJSON(user) {
    if (!user) return null;
    return {
      displayName: user.displayName || null,
      emailAddress: user.emailAddress || null,
      permissionId: user.permissionId || null,
      photoLink: user.photoLink || null,
    };
  }

  // ── About ──

  function about() {
    return ok({
      storageUsed: DriveApp.getStorageUsed(),
      storageLimit: DriveApp.getStorageLimit(),
      rootFolderId: DriveApp.getRootFolder().getId()
    });
  }

  // ── File read ──

  function fileGet(params) {
    const id = requireParam(params, 'fileId');
    validateDriveId(id);
    return trap(function() { return { file: fileToJSON(DriveApp.getFileById(id)) }; }, 'NOT_FOUND', `File not found: ${id}`);
  }

  function fileList(params) {
    const folderId = optionalString(params, 'folderId', 'root');
    const pageSizeLimit = boundedPageSize(params, 'pageSize', 50);
    if (pageSizeLimit.error) return pageSizeLimit.error;
    const pageSize = pageSizeLimit.value;
    const pageToken = Math.floor(optionalNumber(params, 'pageToken', 0));
    if (pageToken < 0) return err('BAD_REQUEST', 'pageToken must be non-negative');
    if (pageToken > LIMITS.pageOffset) return limitExceeded('Drive page offset', pageToken, LIMITS.pageOffset);

    let files;
    if (folderId === 'root') {
      files = DriveApp.getRootFolder().getFiles();
    } else {
      validateDriveId(folderId);
      try {
        files = DriveApp.getFolderById(folderId).getFiles();
      } catch(e) {
        return err('NOT_FOUND', `Folder not found: ${folderId}`);
      }
    }

    const allFiles = [];
    const start = pageToken;
    const end = start + pageSize;
    let idx = 0;

    while (files.hasNext()) {
      const f = files.next();
      if (idx >= start) {
        allFiles.push(fileToJSON(f));
      }
      idx++;
      if (idx >= end) break;
    }

    const hasMore = files.hasNext();
    return ok(allFiles, { nextPageToken: hasMore ? String(end) : undefined, hasMore: hasMore });
  }

  function fileSearch(params) {
    const query = requireParam(params, 'query');
    const maxResultLimit = boundedPageSize(params, 'maxResults', 50);
    if (maxResultLimit.error) return maxResultLimit.error;
    const maxResults = maxResultLimit.value;
    return trap(function() {
      const driveAppQuery = normalizeDriveAppQuery(query);
      const files = DriveApp.searchFiles(driveAppQuery);
      const results = [];
      while (files.hasNext() && results.length < maxResults) {
        const file = files.next();
        if (driveFileAllowedByReadAllowlists(file)) results.push(fileToJSON(file));
      }
      const warnings = driveAppQuery !== query ? ['Translated Drive API v3 query fields to DriveApp query fields.'] : undefined;
      return ok(results, { hasMore: files.hasNext() }, warnings);
    }, 'SEARCH_FAILED', function(e) { return e.message || 'Drive search failed'; });
  }

  function normalizeDriveAppQuery(query) {
    return String(query)
      .replace(/\bname\s+(contains|=|!=)/gi, 'title $1')
      .replace(/\bmodifiedTime\b/gi, 'modifiedDate')
      .replace(/\bcreatedTime\b/gi, 'createdDate');
  }

  function fileExport(params) {
    const id = requireParam(params, 'fileId');
    const mimeType = optionalString(params, 'mimeType', 'text/plain');
    validateDriveId(id);
    return trap(function() {
      const file = DriveApp.getFileById(id);
      const size = file.getSize()
      if (size > LIMITS.exportBytes) return limitExceeded('fileExport bytes', size, LIMITS.exportBytes)
      const text = file.getBlob().getDataAsString();
      return {
        id: file.getId(),
        name: file.getName(),
        mimeType: file.getMimeType(),
        size: file.getSize(),
        content: text.substring(0, LIMITS.textChars),
        truncated: text.length > LIMITS.textChars
      };
    }, 'NOT_FOUND', `File not found: ${id}`);
  }

  // ── Folder operations ──

  function folderGet(params) {
    const id = requireParam(params, 'folderId');
    validateDriveId(id);
    return trap(function() { return { folder: folderToJSON(DriveApp.getFolderById(id)) }; }, 'NOT_FOUND', `Folder not found: ${id}`);
  }

  function folderList(params) {
    const folderId = optionalString(params, 'folderId');
    return trap(function() {
      const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();

      const subfolders = [];
      const subIter = folder.getFolders();
      while (subIter.hasNext() && subfolders.length < LIMITS.folderEntries) {
        const f = subIter.next();
        subfolders.push({ id: f.getId(), name: f.getName(), url: f.getUrl() });
      }

      const fileListArr = [];
      const fileIter = folder.getFiles();
      while (fileIter.hasNext() && (subfolders.length + fileListArr.length) < LIMITS.folderEntries) {
        const f = fileIter.next();
        fileListArr.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(), url: f.getUrl() });
      }

      return {
        folderId: folder.getId(),
        folderName: folder.getName(),
        folders: subfolders,
        files: fileListArr,
        hasMore: subIter.hasNext() || fileIter.hasNext(),
        limit: LIMITS.folderEntries
      };
    }, 'NOT_FOUND', `Folder not found: ${folderId || 'root'}`);
  }

  function folderListRoot() {
    return folderList({});
  }

  // ── Write / mutate ──

  function folderCreate(params) {
    const name = requireParam(params, 'name');
    const parentId = optionalString(params, 'parentId');
    return withIdempotency('folderCreate', params, function() { return trap(function() {
      const parent = parentId ? DriveApp.getFolderById(parentId) : DriveApp.getRootFolder();
      return { folder: folderToJSON(parent.createFolder(name)) };
    }, 'CREATE_FAILED', `Could not create folder: ${name}`); });
  }

  function fileCreate(params) {
    const name = requireParam(params, 'name');
    const content = requireParam(params, 'content');
    if (String(content).length > LIMITS.writeBytes) return limitExceeded('fileCreate content bytes', String(content).length, LIMITS.writeBytes);
    const mimeType = optionalString(params, 'mimeType', 'text/plain');
    const parentId = optionalString(params, 'parentId');
    return withIdempotency('fileCreate', params, function() { return trap(function() {
      const parent = parentId ? DriveApp.getFolderById(parentId) : DriveApp.getRootFolder();
      return { file: fileToJSON(parent.createFile(name, content, mimeType)) };
    }, 'CREATE_FAILED', `Could not create file: ${name}`); });
  }

  function fileCopy(params) {
    const id = requireParam(params, 'fileId');
    const newName = optionalString(params, 'name');
    const destFolderId = optionalString(params, 'destFolderId');
    validateDriveId(id);
    return withIdempotency('fileCopy', params, function() { return trap(function() {
      const file = DriveApp.getFileById(id);
      let copy;
      if (destFolderId) {
        const dest = DriveApp.getFolderById(destFolderId);
        copy = file.makeCopy(newName || file.getName(), dest);
      } else {
        copy = file.makeCopy(newName || file.getName());
      }
      return { file: fileToJSON(copy) };
    }, 'COPY_FAILED', `Could not copy file: ${id}`); });
  }

  function fileMove(params) {
    const id = requireParam(params, 'fileId');
    const destFolderId = requireParam(params, 'destFolderId');
    validateDriveId(id);
    validateDriveId(destFolderId);
    return trap(function() {
      const file = DriveApp.getFileById(id);
      const dest = DriveApp.getFolderById(destFolderId);
      const currentParents = iteratorToArray(file.getParents());
      let destAlreadyParent = false;
      for (let i = 0; i < currentParents.length; i++) {
        if (currentParents[i].getId() === destFolderId) destAlreadyParent = true;
      }
      if (!destAlreadyParent) dest.addFile(file);

      const failedParentRemovals = [];
      for (let i = 0; i < currentParents.length; i++) {
        const parent = currentParents[i];
        if (parent.getId() === destFolderId) continue;
        try {
          parent.removeFile(file);
        } catch (_) {
          failedParentRemovals.push(parent.getId());
        }
      }

      const data = { file: fileToJSON(file), destinationFolderId: destFolderId, failedParentRemovals: failedParentRemovals };
      if (failedParentRemovals.length > 0) {
        return partialOk(data, [{ action: 'removePreviousParents', success: false, error: { code: 'PARENT_REMOVAL_FAILED', message: 'File was added to destination, but one or more previous parents could not be removed.' }, data: { failedParentRemovals: failedParentRemovals } }], ['File remains in the destination folder and may still appear in previous parent folders.']);
      }
      return data;
    }, 'MOVE_FAILED', `Could not move file: ${id}`);
  }

  function fileUpdateMeta(params) {
    const id = requireParam(params, 'fileId');
    validateDriveId(id);
    return trap(function() {
      const file = DriveApp.getFileById(id);
      if (params.name !== undefined) file.setName(String(params.name));
      if (params.description !== undefined) file.setDescription(String(params.description));
      return { file: fileToJSON(file) };
    }, 'UPDATE_FAILED', `Could not update file: ${id}`);
  }

  function fileUpdateContent(params) {
    const id = requireParam(params, 'fileId');
    const content = requireParam(params, 'content');
    if (String(content).length > LIMITS.writeBytes) return limitExceeded('fileUpdateContent bytes', String(content).length, LIMITS.writeBytes);
    validateDriveId(id);
    return trap(function() {
      const file = DriveApp.getFileById(id);
      file.setContent(content);
      return { file: fileToJSON(file) };
    }, 'UPDATE_FAILED', `Could not update content for file: ${id}`);
  }

  // ── Permissions ──

  function fileGetPermissions(params) {
    const id = requireParam(params, 'fileId');
    validateDriveId(id);
    return trap(function() {
      const file = DriveApp.getFileById(id);
      return {
        sharingAccess: file.getSharingAccess().toString(),
        sharingPermission: file.getSharingPermission().toString(),
        editors: file.getEditors().map(function(u) { return u.getEmail(); }),
        viewers: file.getViewers().map(function(u) { return u.getEmail(); }),
        owner: file.getOwner() ? file.getOwner().getEmail() : null
      };
    }, 'NOT_FOUND', `File not found: ${id}`);
  }

  function fileSetSharing(params) {
    const id = requireParam(params, 'fileId');
    const accessKey = requireParam(params, 'access');
    const permissionKey = requireParam(params, 'permission');
    validateDriveId(id);
    return withIdempotency('fileSetSharing', params, function() { return trap(function() {
      const file = DriveApp.getFileById(id);
      const access = ACCESS_MAP[accessKey] || DriveApp.Access[accessKey];
      const permission = PERMISSION_MAP[permissionKey] || DriveApp.Permission[permissionKey];
      if (!access || !permission) {
        throw new Error(`Invalid access or permission: ${accessKey}/${permissionKey}`);
      }
      file.setSharing(access, permission);
      return { file: fileToJSON(file) };
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not set sharing for file: ${id}`; }); });
  }

  function fileAddEditor(params) {
    const id = requireParam(params, 'fileId');
    const email = requireParam(params, 'email');
    validateDriveId(id);
    return withIdempotency('fileAddEditor', params, function() { return trap(function() { DriveApp.getFileById(id).addEditor(email); return { added: true, email: email }; }, 'UPDATE_FAILED', `Could not add editor: ${email}`); });
  }

  function fileAddViewer(params) {
    const id = requireParam(params, 'fileId');
    const email = requireParam(params, 'email');
    validateDriveId(id);
    return withIdempotency('fileAddViewer', params, function() { return trap(function() { DriveApp.getFileById(id).addViewer(email); return { added: true, email: email }; }, 'UPDATE_FAILED', `Could not add viewer: ${email}`); });
  }

  function fileRemoveEditor(params) {
    const id = requireParam(params, 'fileId');
    const email = requireParam(params, 'email');
    validateDriveId(id);
    return trap(function() { DriveApp.getFileById(id).removeEditor(email); return { removed: true, email: email }; }, 'UPDATE_FAILED', `Could not remove editor: ${email}`);
  }

  function fileRemoveViewer(params) {
    const id = requireParam(params, 'fileId');
    const email = requireParam(params, 'email');
    validateDriveId(id);
    return trap(function() { DriveApp.getFileById(id).removeViewer(email); return { removed: true, email: email }; }, 'UPDATE_FAILED', `Could not remove viewer: ${email}`);
  }

  // ── Parent management ──

  function fileAddParent(params) {
    const id = requireParam(params, 'fileId');
    const folderId = requireParam(params, 'folderId');
    validateDriveId(id);
    validateDriveId(folderId);
    return trap(function() {
      const file = DriveApp.getFileById(id);
      const folder = DriveApp.getFolderById(folderId);
      folder.addFile(file);
      return { file: fileToJSON(file) };
    }, 'UPDATE_FAILED', `Could not add parent folder: ${folderId}`);
  }

  function fileRemoveParent(params) {
    const id = requireParam(params, 'fileId');
    const folderId = requireParam(params, 'folderId');
    validateDriveId(id);
    validateDriveId(folderId);
    return trap(function() {
      const file = DriveApp.getFileById(id);
      const parents = file.getParents();
      let found = false;
      while (parents.hasNext()) {
        const parent = parents.next();
        if (parent.getId() === folderId) {
          parent.removeFile(file);
          found = true;
          break;
        }
      }
      if (!found) throw new Error(`Folder ${folderId} is not a parent of file ${id}`);
      return { file: fileToJSON(file) };
    }, 'UPDATE_FAILED', function(e) { return e.message || `Could not remove parent folder: ${folderId}`; });
  }

  function folderPath(params) {
    const id = requireParam(params, 'fileId');
    validateDriveId(id);
    return trap(function() {
      const file = DriveApp.getFileById(id);
      const path = [];
      const parentIter = file.getParents();
      const parentArr = iteratorToArray(parentIter);

      if (parentArr.length > 0) {
        let current = parentArr[0];
        path.push(folderToJSONLight(current));

        while (path.length < LIMITS.pathDepth) {
          const nextParents = iteratorToArray(current.getParents());
          if (nextParents.length === 0) break;
          current = nextParents[0];
          path.push(folderToJSONLight(current));
        }
        if (path.length >= LIMITS.pathDepth) return limitExceeded('folder path depth', path.length, LIMITS.pathDepth);
      }

      path.reverse();

      return {
        fileId: id,
        fileName: file.getName(),
        path: path,
        pathString: path.map(function(p) { return p.name; }).join(' / '),
      };
    }, 'NOT_FOUND', `Could not get folder path for file: ${id}`);
  }

  function folderToJSONLight(f) {
    return {
      id: f.getId(),
      name: f.getName(),
    };
  }

  // ── Trash / delete ──

  function fileTrash(params) {
    const id = requireParam(params, 'fileId');
    validateDriveId(id);
    return withIdempotency('fileTrash', params, function() { return trap(function() { DriveApp.getFileById(id).setTrashed(true); return { trashed: true, fileId: id }; }, 'UPDATE_FAILED', `Could not trash file: ${id}`); });
  }

  function fileUntrash(params) {
    const id = requireParam(params, 'fileId');
    validateDriveId(id);
    return withIdempotency('fileUntrash', params, function() { return trap(function() { DriveApp.getFileById(id).setTrashed(false); return { untrashed: true, fileId: id }; }, 'UPDATE_FAILED', `Could not untrash file: ${id}`); });
  }

  function fileDelete(params) {
    const id = requireParam(params, 'fileId');
    validateDriveId(id);
    return trap(function() { DriveApp.getFileById(id).setTrashed(true); return { deleted: true, fileId: id, note: 'File moved to trash. Permanent deletion requires Drive API advanced service.' }; }, 'DELETE_FAILED', `Could not delete file: ${id}`);
  }

  // ── Advanced Services ──

  function fileExportAs(params) {
    const id = requireParam(params, 'fileId');
    const mimeType = requireParam(params, 'mimeType');
    validateDriveId(id);
    return trap(function() {
      const sourceFile = DriveApp.getFileById(id);
      const sourceMimeType = sourceFile.getMimeType();
      if (sourceMimeType.indexOf('application/vnd.google-apps.') !== 0) {
        return err('BAD_REQUEST', 'drive_export_as only works on Google Workspace files. Use drive_read_file for plain text files and Drive binary downloads outside this proxy.');
      }
      const blob = sourceFile.getAs(mimeType);
      const bytes = blob.getBytes();
      if (bytes.length > LIMITS.exportBytes) return limitExceeded('fileExportAs bytes', bytes.length, LIMITS.exportBytes);
      const base64 = Utilities.base64Encode(bytes);
      return {
        fileId: id,
        mimeType: mimeType,
        size: bytes.length,
        base64: base64,
      };
    }, 'EXPORT_FAILED', function(e) { return e.message || `Could not export file: ${id}`; });
  }

  function commentsList(params) {
    const id = requireParam(params, 'fileId');
    validateDriveId(id);
    return trap(function() {
      const pageSizeLimit = boundedPageSize(params, 'pageSize', 100);
      if (pageSizeLimit.error) return pageSizeLimit.error;
      const optionalArgs = {
        fields: 'comments(id,content,htmlContent,author,createdTime,modifiedTime,resolved,deleted,anchor,quotedFileContent,replies),nextPageToken',
        pageSize: pageSizeLimit.value,
        pageToken: optionalString(params, 'pageToken'),
        includeDeleted: optionalBool(params, 'includeDeleted', false),
      };
      const result = Drive.Comments.list(id, optionalArgs);
      const comments = (result.comments || []).map(function(c) {
        const comment = commentToJSON(c);
        if (comment && comment.replies) delete comment.replies;
        return comment;
      });
      return ok({ fileId: id, comments: comments }, { nextPageToken: result.nextPageToken, hasMore: !!result.nextPageToken });
    }, 'COMMENTS_FAILED', function(e) { return e.message || `Could not list comments for file: ${id}`; });
  }

  function commentsGet(params) {
    const id = requireParam(params, 'fileId');
    const commentId = requireParam(params, 'commentId');
    validateDriveId(id);
    return trap(function() {
      const comment = Drive.Comments.get(id, commentId, { fields: '*', includeDeleted: optionalBool(params, 'includeDeleted', false) });
      return { fileId: id, comment: commentToJSON(comment) };
    }, 'COMMENT_FAILED', function(e) { return e.message || `Could not get comment: ${commentId}`; });
  }

  function commentCreate(params) {
    const id = requireParam(params, 'fileId');
    const content = requireParam(params, 'content');
    validateDriveId(id);
    return withIdempotency('commentCreate', params, function() { return trap(function() {
      const comment = Drive.Comments.create({ content: content, anchor: JSON.stringify({ r: 'head' }) }, id, { fields: '*' });
      return {
        fileId: id,
        comment: commentToJSON(comment),
      };
    }, 'COMMENT_FAILED', function(e) { return e.message || `Could not add comment to file: ${id}`; }); });
  }

  function commentsUpdate(params) {
    const id = requireParam(params, 'fileId');
    const commentId = requireParam(params, 'commentId');
    validateDriveId(id);
    return trap(function() {
      const patch = {};
      if (params.content !== undefined) patch.content = String(params.content);
      if (params.resolved !== undefined) patch.resolved = optionalBool(params, 'resolved', false);
      if (Object.keys(patch).length === 0) return err('BAD_REQUEST', 'Provide content or resolved to update a comment.');
      const comment = Drive.Comments.update(patch, id, commentId, { fields: '*' });
      return { fileId: id, comment: commentToJSON(comment) };
    }, 'COMMENT_UPDATE_FAILED', function(e) { return e.message || `Could not update comment: ${commentId}`; });
  }

  function commentsDelete(params) {
    const id = requireParam(params, 'fileId');
    const commentId = requireParam(params, 'commentId');
    validateDriveId(id);
    return trap(function() {
      Drive.Comments.remove(id, commentId);
      return { deleted: true, fileId: id, commentId: commentId };
    }, 'COMMENT_DELETE_FAILED', function(e) { return e.message || `Could not delete comment: ${commentId}`; });
  }

  function repliesList(params) {
    const id = requireParam(params, 'fileId');
    const commentId = requireParam(params, 'commentId');
    validateDriveId(id);
    return trap(function() {
      const pageSizeLimit = boundedPageSize(params, 'pageSize', 100);
      if (pageSizeLimit.error) return pageSizeLimit.error;
      const result = Drive.Replies.list(id, commentId, {
        fields: 'replies(id,content,htmlContent,author,createdTime,modifiedTime,action,deleted),nextPageToken',
        pageSize: pageSizeLimit.value,
        pageToken: optionalString(params, 'pageToken'),
        includeDeleted: optionalBool(params, 'includeDeleted', false),
      });
      return ok({ fileId: id, commentId: commentId, replies: (result.replies || []).map(replyToJSON) }, { nextPageToken: result.nextPageToken, hasMore: !!result.nextPageToken });
    }, 'REPLIES_FAILED', function(e) { return e.message || `Could not list replies for comment: ${commentId}`; });
  }

  function repliesCreate(params) {
    const id = requireParam(params, 'fileId');
    const commentId = requireParam(params, 'commentId');
    const content = requireParam(params, 'content');
    validateDriveId(id);
    return withIdempotency('repliesCreate', params, function() { return trap(function() {
      const reply = Drive.Replies.create({ content: content }, id, commentId, { fields: '*' });
      return { fileId: id, commentId: commentId, reply: replyToJSON(reply) };
    }, 'REPLY_FAILED', function(e) { return e.message || `Could not create reply for comment: ${commentId}`; }); });
  }

  function repliesGet(params) {
    const id = requireParam(params, 'fileId');
    const commentId = requireParam(params, 'commentId');
    const replyId = requireParam(params, 'replyId');
    validateDriveId(id);
    return trap(function() {
      const reply = Drive.Replies.get(id, commentId, replyId, { fields: '*', includeDeleted: optionalBool(params, 'includeDeleted', false) });
      return { fileId: id, commentId: commentId, reply: replyToJSON(reply) };
    }, 'REPLY_FAILED', function(e) { return e.message || `Could not get reply: ${replyId}`; });
  }

  function repliesUpdate(params) {
    const id = requireParam(params, 'fileId');
    const commentId = requireParam(params, 'commentId');
    const replyId = requireParam(params, 'replyId');
    const content = requireParam(params, 'content');
    validateDriveId(id);
    return trap(function() {
      const reply = Drive.Replies.update({ content: content }, id, commentId, replyId, { fields: '*' });
      return { fileId: id, commentId: commentId, reply: replyToJSON(reply) };
    }, 'REPLY_UPDATE_FAILED', function(e) { return e.message || `Could not update reply: ${replyId}`; });
  }

  function repliesDelete(params) {
    const id = requireParam(params, 'fileId');
    const commentId = requireParam(params, 'commentId');
    const replyId = requireParam(params, 'replyId');
    validateDriveId(id);
    return trap(function() {
      Drive.Replies.remove(id, commentId, replyId);
      return { deleted: true, fileId: id, commentId: commentId, replyId: replyId };
    }, 'REPLY_DELETE_FAILED', function(e) { return e.message || `Could not delete reply: ${replyId}`; });
  }

  function revisionsList(params) {
    const id = requireParam(params, 'fileId');
    validateDriveId(id);
    return trap(function() {
      const pageSizeLimit = boundedPageSize(params, 'pageSize', 100);
      if (pageSizeLimit.error) return pageSizeLimit.error;
      const result = Drive.Revisions.list(id, {
        fields: 'revisions(id,mimeType,modifiedTime,keepForever,published,publishedOutsideDomain,publishAuto,size,originalFilename,lastModifyingUser),nextPageToken',
        pageSize: pageSizeLimit.value,
        pageToken: optionalString(params, 'pageToken'),
      });
      return ok({ fileId: id, revisions: (result.revisions || []).map(revisionToJSON) }, { nextPageToken: result.nextPageToken, hasMore: !!result.nextPageToken });
    }, 'REVISIONS_FAILED', function(e) { return e.message || `Could not list revisions for file: ${id}`; });
  }

  function revisionsGet(params) {
    const id = requireParam(params, 'fileId');
    const revisionId = requireParam(params, 'revisionId');
    validateDriveId(id);
    return trap(function() {
      const revision = Drive.Revisions.get(id, revisionId, { fields: '*' });
      return { fileId: id, revision: revisionToJSON(revision) };
    }, 'REVISION_FAILED', function(e) { return e.message || `Could not get revision: ${revisionId}`; });
  }

  function revisionsUpdate(params) {
    const id = requireParam(params, 'fileId');
    const revisionId = requireParam(params, 'revisionId');
    validateDriveId(id);
    return trap(function() {
      if (params.keepForever === undefined) return err('BAD_REQUEST', 'Provide keepForever to update revision metadata.');
      const revision = Drive.Revisions.update({ keepForever: optionalBool(params, 'keepForever', false) }, id, revisionId, { fields: '*' });
      return { fileId: id, revision: revisionToJSON(revision) };
    }, 'REVISION_UPDATE_FAILED', function(e) { return e.message || `Could not update revision: ${revisionId}`; });
  }

  function sharedDrivesList(params) {
    return trap(function() {
      const pageSizeLimit = boundedPageSize(params, 'pageSize', 100);
      if (pageSizeLimit.error) return pageSizeLimit.error;
      const result = Drive.Drives.list({
        fields: 'drives(id,name,colorRgb,backgroundImageLink,createdTime,hidden,capabilities,restrictions),nextPageToken',
        pageSize: pageSizeLimit.value,
        pageToken: optionalString(params, 'pageToken'),
        q: optionalString(params, 'query'),
      });
      const drives = (result.drives || []).filter(function(drive) {
        return !policyPropertyHasList_('ALLOWED_DRIVE_SHARED_DRIVE_IDS') || policyValueAllowed_('ALLOWED_DRIVE_SHARED_DRIVE_IDS', drive.id);
      });
      return ok({ drives: drives.map(sharedDriveToJSON) }, { nextPageToken: result.nextPageToken, hasMore: !!result.nextPageToken });
    }, 'SHARED_DRIVES_FAILED', function(e) { return e.message || 'Could not list shared drives.'; });
  }

  function sharedDrivesGet(params) {
    const driveId = requireParam(params, 'driveId');
    validateDriveId(driveId);
    return trap(function() {
      const drive = Drive.Drives.get(driveId, { fields: '*' });
      return { drive: sharedDriveToJSON(drive) };
    }, 'SHARED_DRIVE_FAILED', function(e) { return e.message || `Could not get shared drive: ${driveId}`; });
  }

  function changesStartPageToken(params) {
    const driveId = optionalString(params, 'driveId');
    if (driveId) validateDriveId(driveId);
    return trap(function() {
      const result = Drive.Changes.getStartPageToken({
        driveId: driveId,
        supportsAllDrives: true,
        fields: 'startPageToken',
      });
      return { startPageToken: result.startPageToken, driveId: driveId || null };
    }, 'CHANGES_TOKEN_FAILED', function(e) { return e.message || 'Could not get Drive changes start page token.'; });
  }

  function changesList(params) {
    const pageToken = requireParam(params, 'pageToken');
    const driveId = optionalString(params, 'driveId');
    if (driveId) validateDriveId(driveId);
    return trap(function() {
      const pageSizeLimit = boundedPageSize(params, 'pageSize', 100);
      if (pageSizeLimit.error) return pageSizeLimit.error;
      const optionalArgs = {
        fields: 'changes(type,time,removed,fileId,driveId,file(id,name,mimeType,trashed,modifiedTime),drive(id,name,colorRgb,backgroundImageLink,createdTime,hidden,capabilities,restrictions)),newStartPageToken,nextPageToken',
        pageSize: pageSizeLimit.value,
        driveId: driveId,
        includeItemsFromAllDrives: optionalBool(params, 'includeItemsFromAllDrives', true),
        restrictToMyDrive: optionalBool(params, 'restrictToMyDrive', false),
        spaces: optionalString(params, 'spaces', 'drive'),
        supportsAllDrives: true,
      };
      const result = Drive.Changes.list(pageToken, optionalArgs);
      return ok({ changes: (result.changes || []).map(changeToJSON), newStartPageToken: result.newStartPageToken || null }, { nextPageToken: result.nextPageToken, hasMore: !!result.nextPageToken });
    }, 'CHANGES_FAILED', function(e) { return e.message || 'Could not list Drive changes.'; });
  }

  // ── Batch ──

  function runBatch(params, handleFn) {
    const ops = params.operations;
    if (!Array.isArray(ops) || ops.length === 0) return err('BAD_REQUEST', 'operations must be a non-empty array');
    if (ops.length > 20) return limitExceeded('batch operations', ops.length, 20);
    const results = [];
    let operationWeight = 1;
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const invalid = validateBatchOperation_(op, i, BATCH_ACTIONS);
      if (invalid) { results.push(invalid); continue; }
      operationWeight += actionWeightForPolicy(op.action, ACTION_POLICIES, op.params || {});
      try {
        const result = handleFn(op.action, op.params || {});
        results.push({ index: i, action: op.action, success: result.success, data: result.success ? result.data : undefined, error: result.success ? undefined : result.error });
      } catch(ex) {
        const correlationId = Utilities.getUuid();
        console.error('[drive-proxy] correlationId=%s batchAction=%s error=%s', correlationId, op.action, ex && ex.message ? ex.message : String(ex));
        results.push({ index: i, action: op.action, success: false, error: { code: 'INTERNAL_ERROR', message: 'Batch operation failed. See Apps Script logs with correlationId ' + correlationId + '.', correlationId: correlationId }});
      }
    }
    const response = batchResponse_(results, operationWeight);
    const payload = JSON.stringify(response);
    if (payload.length > LIMITS.responseBytes) return limitExceeded('response bytes', payload.length, LIMITS.responseBytes);
    return response;
  }

  function batch(params) {
    return runBatch(params, handle);
  }

  return { handle: handle, requestWeight: requestWeight };
})();
