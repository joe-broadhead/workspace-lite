import { formatResponse } from '@workspace-lite/shared'
import {
  fileSetSharingSchema, fileAddEditorSchema, fileAddViewerSchema,
  fileRemoveEditorSchema, fileRemoveViewerSchema, fileGetSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDriveManageTools(server: { tool: Function }) {
  server.tool(
    'drive_set_sharing',
    'Set sharing access and permission level for a file. Access: ANYONE, ANYONE_WITH_LINK, DOMAIN, DOMAIN_WITH_LINK, PRIVATE. Permission: VIEW, EDIT, COMMENT.',
    fileSetSharingSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileSetSharing', args)
      return formatResponse(result, {
        summary: 'Sharing settings updated successfully.',
      })
    },
  )

  server.tool(
    'drive_add_editor',
    'Add an editor to a file by email address.',
    fileAddEditorSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileAddEditor', args)
      return formatResponse(result, {
        summary: 'Editor added successfully.',
      })
    },
  )

  server.tool(
    'drive_add_viewer',
    'Add a viewer to a file by email address.',
    fileAddViewerSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileAddViewer', args)
      return formatResponse(result, {
        summary: 'Viewer added successfully.',
      })
    },
  )

  server.tool(
    'drive_remove_editor',
    'Remove an editor from a file by email address.',
    fileRemoveEditorSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileRemoveEditor', args)
      return formatResponse(result, {
        summary: 'Editor removed successfully.',
      })
    },
  )

  server.tool(
    'drive_remove_viewer',
    'Remove a viewer from a file by email address.',
    fileRemoveViewerSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileRemoveViewer', args)
      return formatResponse(result, {
        summary: 'Viewer removed successfully.',
      })
    },
  )

  server.tool(
    'drive_trash_file',
    'Move a file to trash. Can be restored with drive_untrash_file.',
    fileGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileTrash', args)
      return formatResponse(result, {
        summary: 'File moved to trash.',
        hint: 'Use drive_untrash_file to restore within 30 days.',
      })
    },
  )

  server.tool(
    'drive_untrash_file',
    'Restore a file from trash.',
    fileGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileUntrash', args)
      return formatResponse(result, {
        summary: 'File restored from trash.',
      })
    },
  )

  server.tool(
    'drive_delete_file',
    'Permanently delete a file. Moves to trash first; permanent deletion from trash requires Drive API. WARNING: this action cannot be undone for the trash step.',
    fileGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileDelete', args)
      return formatResponse(result, {
        summary: 'File deleted (moved to trash).',
        hint: 'For permanent deletion, empty trash in drive.google.com.',
      })
    },
  )
}
