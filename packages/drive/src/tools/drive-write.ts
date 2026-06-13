import { formatResponse } from '@workspace-lite/shared'
import {
  folderCreateSchema, fileCreateSchema, fileCopySchema, fileMoveSchema,
  fileUpdateMetaSchema, fileUpdateContentSchema,
  driveAddParentSchema, driveRemoveParentSchema, driveExportAsSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDriveWriteTools(server: { tool: Function }) {
  server.tool(
    'drive_create_folder',
    'Create a new folder in Drive. Optionally specify a parent folder ID.',
    folderCreateSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('folderCreate', args)
      return formatResponse(result, {
        summary: 'Folder created successfully.',
      })
    },
  )

  server.tool(
    'drive_create_file',
    'Create a new file in Drive with content. Specify mimeType for non-text files (e.g. text/markdown, application/json).',
    fileCreateSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileCreate', args)
      return formatResponse(result, {
        summary: 'File created successfully.',
        hint: 'Use drive_read_file to verify content.',
      })
    },
  )

  server.tool(
    'drive_copy_file',
    'Copy a Drive file. Optionally rename and/or move to a different folder.',
    fileCopySchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileCopy', args)
      return formatResponse(result, {
        summary: 'File copied successfully.',
      })
    },
  )

  server.tool(
    'drive_move_file',
    'Move a file to a different folder.',
    fileMoveSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileMove', args)
      return formatResponse(result, {
        summary: 'File moved successfully.',
      })
    },
  )

  server.tool(
    'drive_update_metadata',
    'Update a file\'s name and/or description.',
    fileUpdateMetaSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileUpdateMeta', args)
      return formatResponse(result, {
        summary: 'Metadata updated successfully.',
      })
    },
  )

  server.tool(
    'drive_update_content',
    'Overwrite a file\'s content with new text. This replaces the entire file content.',
    fileUpdateContentSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileUpdateContent', args)
      return formatResponse(result, {
        summary: 'Content updated successfully.',
      })
    },
  )

  server.tool(
    'drive_add_parent',
    'Add a file to an additional parent folder without removing existing parents.',
    driveAddParentSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileAddParent', args)
      return formatResponse(result, {
        summary: 'File added to folder.',
      })
    },
  )

  server.tool(
    'drive_remove_parent',
    'Remove a file from a specific parent folder.',
    driveRemoveParentSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileRemoveParent', args)
      return formatResponse(result, {
        summary: 'File removed from folder.',
      })
    },
  )

  server.tool(
    'drive_export_as',
    'Export a Google Workspace file (Docs, Sheets, Slides) in a format like PDF, DOCX, XLSX, CSV. Returns a base64-encoded blob. Use drive_read_file for plain text export.',
    driveExportAsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileExportAs', args)
      const data = result.data as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: `Exported: ${data.fileId} as ${data.mimeType}\nSize: ${data.size} bytes\nBase64 length: ${(data.base64 as string || '').length}`,
        }],
      }
    },
  )
}
