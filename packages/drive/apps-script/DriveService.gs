var DriveService = (function() {
  function handle(action, params) {
    switch (action) {
      case 'about':              return about()
      case 'fileGet':            return fileGet(params)
      case 'fileList':           return fileList(params)
      case 'fileSearch':         return fileSearch(params)
      case 'fileExport':         return fileExport(params)
      case 'folderGet':          return folderGet(params)
      case 'folderList':         return folderList(params)
      case 'folderListRoot':     return folderListRoot()
      case 'folderCreate':       return folderCreate(params)
      case 'fileCreate':         return fileCreate(params)
      case 'fileCopy':           return fileCopy(params)
      case 'fileMove':           return fileMove(params)
      case 'fileUpdateMeta':     return fileUpdateMeta(params)
      case 'fileUpdateContent':  return fileUpdateContent(params)
      case 'fileGetPermissions': return fileGetPermissions(params)
      case 'fileSetSharing':     return fileSetSharing(params)
      case 'fileAddEditor':      return fileAddEditor(params)
      case 'fileAddViewer':      return fileAddViewer(params)
      case 'fileRemoveEditor':   return fileRemoveEditor(params)
      case 'fileRemoveViewer':   return fileRemoveViewer(params)
      case 'fileTrash':          return fileTrash(params)
      case 'fileUntrash':        return fileUntrash(params)
      case 'fileDelete':         return fileDelete(params)
      default: return err('UNKNOWN_ACTION', 'Unknown action: ' + action)
    }
  }

  function requireParam(params, name) {
    const val = params[name]
    if (typeof val !== 'string' || !val.trim()) {
      throw new Error('Missing required parameter: ' + name)
    }
    return val.trim()
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

  function validateDriveId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('Invalid Drive ID: ' + id)
    }
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
      trashed: f.isTrashed ? f.isTrashed() : false,
      owner: toString(getEmail(f.getOwner())),
      parents: iteratorToArray(f.getParents())
    }
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
    }
  }

  function toString(val) {
    if (!val) return null
    if (typeof val === 'string') return val
    if (val.toISOString) return val.toISOString()
    return String(val)
  }

  function getEmail(user) {
    if (!user) return null
    try { return user.getEmail() } catch(e) { return null }
  }

  function iteratorToArray(it) {
    const arr = []
    while (it.hasNext()) arr.push(it.next())
    return arr
  }

  function about() {
    return ok({
      storageUsed: DriveApp.getStorageUsed(),
      storageLimit: DriveApp.getStorageLimit(),
      rootFolderId: DriveApp.getRootFolder().getId()
    })
  }

  function fileGet(params) {
    const id = requireParam(params, 'fileId')
    validateDriveId(id)
    try {
      const file = DriveApp.getFileById(id)
      return ok({ file: fileToJSON(file) })
    } catch(e) {
      return err('NOT_FOUND', 'File not found: ' + id)
    }
  }

  function fileList(params) {
    const folderId = optionalString(params, 'folderId')
    const pageSize = optionalNumber(params, 'pageSize', 50)
    const pageToken = optionalNumber(params, 'pageToken', 0)

    var files
    if (folderId) {
      validateDriveId(folderId)
      try {
        const folder = DriveApp.getFolderById(folderId)
        files = folder.getFiles()
      } catch(e) {
        return err('NOT_FOUND', 'Folder not found: ' + folderId)
      }
    } else {
      files = DriveApp.getFiles()
    }

    const allFiles = []
    const start = pageToken * pageSize
    const end = start + pageSize
    var idx = 0

    while (files.hasNext()) {
      const f = files.next()
      if (idx >= start && idx < end) {
        allFiles.push({
          id: f.getId(),
          name: f.getName(),
          mimeType: f.getMimeType(),
          url: f.getUrl(),
          size: f.getSize(),
          updated: toString(f.getLastUpdated()),
          starred: f.isStarred(),
          trashed: false,
          owner: toString(getEmail(f.getOwner()))
        })
      }
      idx++
      if (idx >= end + pageSize) break
    }

    return ok(allFiles, { nextPageToken: idx > end ? String(pageToken + 1) : undefined, hasMore: idx > end })
  }

  function fileSearch(params) {
    const query = requireParam(params, 'query')
    const maxResults = optionalNumber(params, 'maxResults', 50)
    const files = DriveApp.searchFiles(query)
    const results = []
    var count = 0
    while (files.hasNext() && count < maxResults) {
      const f = files.next()
      results.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(), url: f.getUrl(), size: f.getSize(), updated: toString(f.getLastUpdated()), owner: toString(getEmail(f.getOwner())) })
      count++
    }
    return ok(results)
  }

  function fileExport(params) {
    const id = requireParam(params, 'fileId')
    const mimeType = optionalString(params, 'mimeType', 'text/plain')
    validateDriveId(id)
    try {
      const file = DriveApp.getFileById(id)
      const blob = file.getBlob()
      const text = blob.getDataAsString()
      return ok({ id: file.getId(), name: file.getName(), mimeType: file.getMimeType(), size: file.getSize(), content: text.substring(0, 500000), truncated: text.length > 500000 })
    } catch(e) {
      return err('NOT_FOUND', 'File not found: ' + id)
    }
  }

  function folderGet(params) {
    const id = requireParam(params, 'folderId')
    validateDriveId(id)
    try {
      const folder = DriveApp.getFolderById(id)
      return ok({ folder: folderToJSON(folder) })
    } catch(e) {
      return err('NOT_FOUND', 'Folder not found: ' + id)
    }
  }

  function folderList(params) {
    const folderId = optionalString(params, 'folderId')
    try {
      const folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder()
      const folders = folder.getFolders()
      const subfolders = []
      while (folders.hasNext()) {
        const f = folders.next()
        subfolders.push({ id: f.getId(), name: f.getName(), url: f.getUrl() })
      }
      const fileIter = folder.getFiles()
      const fileListArr = []
      while (fileIter.hasNext()) {
        const f = fileIter.next()
        fileListArr.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(), url: f.getUrl() })
      }
      return ok({ folderId: folder.getId(), folderName: folder.getName(), folders: subfolders, files: fileListArr })
    } catch(e) {
      return err('NOT_FOUND', 'Folder not found: ' + (folderId || 'root'))
    }
  }

  function folderListRoot() {
    return folderList({})
  }

  function folderCreate(params) {
    const name = requireParam(params, 'name')
    const parentId = optionalString(params, 'parentId')
    try {
      const parent = parentId ? DriveApp.getFolderById(parentId) : DriveApp.getRootFolder()
      const folder = parent.createFolder(name)
      return ok({ folder: folderToJSON(folder) })
    } catch(e) {
      return err('CREATE_FAILED', 'Could not create folder: ' + name)
    }
  }

  function fileCreate(params) {
    const name = requireParam(params, 'name')
    const content = requireParam(params, 'content')
    const mimeType = optionalString(params, 'mimeType', 'text/plain')
    const parentId = optionalString(params, 'parentId')
    try {
      const parent = parentId ? DriveApp.getFolderById(parentId) : DriveApp.getRootFolder()
      const file = parent.createFile(name, content, mimeType)
      return ok({ file: fileToJSON(file) })
    } catch(e) {
      return err('CREATE_FAILED', 'Could not create file: ' + name)
    }
  }

  function fileCopy(params) {
    const id = requireParam(params, 'fileId')
    const newName = optionalString(params, 'name')
    const destFolderId = optionalString(params, 'destFolderId')
    validateDriveId(id)
    try {
      const file = DriveApp.getFileById(id)
      var copy
      if (destFolderId) {
        const dest = DriveApp.getFolderById(destFolderId)
        copy = file.makeCopy(newName || file.getName(), dest)
      } else {
        copy = file.makeCopy(newName || file.getName())
      }
      return ok({ file: fileToJSON(copy) })
    } catch(e) {
      return err('COPY_FAILED', 'Could not copy file: ' + id)
    }
  }

  function fileMove(params) {
    const id = requireParam(params, 'fileId')
    const destFolderId = requireParam(params, 'destFolderId')
    validateDriveId(id)
    validateDriveId(destFolderId)
    try {
      const file = DriveApp.getFileById(id)
      const dest = DriveApp.getFolderById(destFolderId)
      const currentParents = file.getParents()
      while (currentParents.hasNext()) {
        currentParents.next().removeFile(file)
      }
      dest.addFile(file)
      return ok({ file: fileToJSON(file) })
    } catch(e) {
      return err('MOVE_FAILED', 'Could not move file: ' + id)
    }
  }

  function fileUpdateMeta(params) {
    const id = requireParam(params, 'fileId')
    validateDriveId(id)
    try {
      const file = DriveApp.getFileById(id)
      if (params.name !== undefined) file.setName(String(params.name))
      if (params.description !== undefined) file.setDescription(String(params.description))
      return ok({ file: fileToJSON(file) })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not update file: ' + id)
    }
  }

  function fileUpdateContent(params) {
    const id = requireParam(params, 'fileId')
    const content = requireParam(params, 'content')
    validateDriveId(id)
    try {
      const file = DriveApp.getFileById(id)
      file.setContent(content)
      return ok({ file: fileToJSON(file) })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not update content for file: ' + id)
    }
  }

  function fileGetPermissions(params) {
    const id = requireParam(params, 'fileId')
    validateDriveId(id)
    try {
      const file = DriveApp.getFileById(id)
      return ok({
        sharingAccess: file.getSharingAccess().toString(),
        sharingPermission: file.getSharingPermission().toString(),
        editors: file.getEditors().map(function(u) { return u.getEmail() }),
        viewers: file.getViewers().map(function(u) { return u.getEmail() }),
        owner: file.getOwner() ? file.getOwner().getEmail() : null
      })
    } catch(e) {
      return err('NOT_FOUND', 'File not found: ' + id)
    }
  }

  function fileSetSharing(params) {
    const id = requireParam(params, 'fileId')
    const access = requireParam(params, 'access')
    const permission = requireParam(params, 'permission')
    validateDriveId(id)
    try {
      const file = DriveApp.getFileById(id)
      file.setSharing(DriveApp.Access[access], DriveApp.Permission[permission])
      return ok({ file: fileToJSON(file) })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not set sharing for file: ' + id)
    }
  }

  function fileAddEditor(params) {
    const id = requireParam(params, 'fileId')
    const email = requireParam(params, 'email')
    validateDriveId(id)
    try {
      DriveApp.getFileById(id).addEditor(email)
      return ok({ added: true, email: email })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not add editor: ' + email)
    }
  }

  function fileAddViewer(params) {
    const id = requireParam(params, 'fileId')
    const email = requireParam(params, 'email')
    validateDriveId(id)
    try {
      DriveApp.getFileById(id).addViewer(email)
      return ok({ added: true, email: email })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not add viewer: ' + email)
    }
  }

  function fileRemoveEditor(params) {
    const id = requireParam(params, 'fileId')
    const email = requireParam(params, 'email')
    validateDriveId(id)
    try {
      DriveApp.getFileById(id).removeEditor(email)
      return ok({ removed: true, email: email })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not remove editor: ' + email)
    }
  }

  function fileRemoveViewer(params) {
    const id = requireParam(params, 'fileId')
    const email = requireParam(params, 'email')
    validateDriveId(id)
    try {
      DriveApp.getFileById(id).removeViewer(email)
      return ok({ removed: true, email: email })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not remove viewer: ' + email)
    }
  }

  function fileTrash(params) {
    const id = requireParam(params, 'fileId')
    validateDriveId(id)
    try {
      DriveApp.getFileById(id).setTrashed(true)
      return ok({ trashed: true, fileId: id })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not trash file: ' + id)
    }
  }

  function fileUntrash(params) {
    const id = requireParam(params, 'fileId')
    validateDriveId(id)
    try {
      DriveApp.getFileById(id).setTrashed(false)
      return ok({ untrashed: true, fileId: id })
    } catch(e) {
      return err('UPDATE_FAILED', 'Could not untrash file: ' + id)
    }
  }

  function fileDelete(params) {
    const id = requireParam(params, 'fileId')
    validateDriveId(id)
    try {
      const file = DriveApp.getFileById(id)
      file.setTrashed(true)
      return ok({ deleted: true, fileId: id, note: 'File moved to trash. Permanent deletion requires Drive API advanced service.' })
    } catch(e) {
      return err('DELETE_FAILED', 'Could not delete file: ' + id)
    }
  }

  return { handle: handle }
})()
