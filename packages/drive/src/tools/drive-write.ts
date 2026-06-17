import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import { registerTool } from '@workspace-lite/shared/tool-helpers'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { formatResponse } from '@workspace-lite/shared/response'
import {
  folderCreateSchema, fileCreateSchema, fileCopySchema, fileMoveSchema,
  fileUpdateMetaSchema, fileUpdateContentSchema,
  driveAddParentSchema, driveRemoveParentSchema, driveExportAsSchema,
} from '@workspace-lite/shared/schemas'

const client = createProxyClient('drive')

export function registerDriveWriteTools(server: ToolServer) {
  registerTool(server, client, {
    name: 'drive_create_folder',
    description: 'Create a new folder in Drive. Optionally specify a parent folder ID.',
    schema: folderCreateSchema,
    action: 'folderCreate',
    summary: 'Folder created successfully.',
  })

  registerTool(server, client, {
    name: 'drive_create_file',
    description: 'Create a new file in Drive with content. Specify mimeType for non-text files (e.g. text/markdown, application/json).',
    schema: fileCreateSchema,
    action: 'fileCreate',
    summary: 'File created successfully.',
  })

  registerTool(server, client, {
    name: 'drive_copy_file',
    description: 'Copy a Drive file. Optionally rename and/or move to a different folder.',
    schema: fileCopySchema,
    action: 'fileCopy',
    summary: 'File copied successfully.',
  })

  registerTool(server, client, {
    name: 'drive_move_file',
    description: 'Move a file to a different folder.',
    schema: fileMoveSchema,
    action: 'fileMove',
    summary: 'File moved successfully.',
  })

  registerTool(server, client, {
    name: 'drive_update_metadata',
    description: 'Update a file\'s name and/or description.',
    schema: fileUpdateMetaSchema,
    action: 'fileUpdateMeta',
    summary: 'Metadata updated successfully.',
  })

  registerTool(server, client, {
    name: 'drive_update_content',
    description: 'Overwrite a file\'s content with new text. This replaces the entire file content.',
    schema: fileUpdateContentSchema,
    action: 'fileUpdateContent',
    summary: 'Content updated successfully.',
  })

  registerTool(server, client, {
    name: 'drive_add_parent',
    description: 'Add a file to an additional parent folder without removing existing parents.',
    schema: driveAddParentSchema,
    action: 'fileAddParent',
    summary: 'File added to folder.',
  })

  registerTool(server, client, {
    name: 'drive_remove_parent',
    description: 'Remove a file from a specific parent folder.',
    schema: driveRemoveParentSchema,
    action: 'fileRemoveParent',
    summary: 'File removed from folder.',
  })

  server.tool(
    'drive_export_as',
    'Export a Google Workspace file (Docs, Sheets, Slides) in a format like PDF, DOCX, XLSX, CSV. Returns a base64-encoded blob. Use drive_read_file for plain text export.',
    driveExportAsSchema,
    async (args: Record<string, unknown>) => {
      const result = await client.callProxy('fileExportAs', args)
      if (!result.success) return formatResponse(result)
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
