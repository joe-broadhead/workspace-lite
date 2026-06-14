import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { driveBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDriveBatchTool(server: ToolServer) {
  server.tool(
    'drive_batch',
    'Execute multiple Drive operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (about, fileGet, fileList, fileSearch, fileExport, folderGet, folderList, folderListRoot, folderCreate, fileCreate, fileCopy, fileMove, fileUpdateMeta, fileUpdateContent, fileGetPermissions, fileSetSharing, fileAddEditor, fileAddViewer, fileRemoveEditor, fileRemoveViewer, fileAddParent, fileRemoveParent, folderPath, fileTrash, fileUntrash, fileDelete, fileExportAs, commentsList, commentsGet, commentCreate, commentsUpdate, commentsDelete, repliesList, repliesCreate, repliesGet, repliesUpdate, repliesDelete, revisionsList, revisionsGet, revisionsUpdate, sharedDrivesList, sharedDrivesGet, changesStartPageToken, changesList). Operations execute sequentially; errors are collected per-operation. Up to 20 operations.',
    driveBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
