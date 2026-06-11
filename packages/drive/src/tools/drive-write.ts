import { formatResponse } from '@google-apps-script-mcp/shared'
import {
  folderCreateSchema, fileCreateSchema, fileCopySchema, fileMoveSchema,
  fileUpdateMetaSchema, fileUpdateContentSchema,
} from '@google-apps-script-mcp/shared/schemas'
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
}
