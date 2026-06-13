import { formatResponse, formatPermissions } from '@workspace-lite/shared'
import { fileGetSchema, fileExportSchema, folderGetSchema, driveFolderPathSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDriveReadTools(server: { tool: Function }) {
  server.tool(
    'drive_get_file',
    'Get detailed metadata for a Drive file by ID. Returns id, name, mimeType, url, size, created, updated, starred, trashed, owner, parents.',
    fileGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileGet', args)
      return formatResponse(result, {
        summary: 'File metadata retrieved successfully.',
        hint: 'Use drive_read_file to read file content.',
      })
    },
  )

  server.tool(
    'drive_read_file',
    'Read the content of a Drive file as text. Works for Docs, Sheets, plain text, markdown, JSON, etc. Content is truncated at 500KB.',
    fileExportSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileExport', args)
      const data = result.data as Record<string, unknown>
      const content = data.content as string || ''
      const truncated = data.truncated ? '\n\n[Content was truncated at 500KB]' : ''
      return {
        content: [{
          type: 'text' as const,
          text: `File: ${data.name} (${data.mimeType})\nSize: ${data.size} bytes\n\n${content}${truncated}`,
        }],
      }
    },
  )

  server.tool(
    'drive_get_folder',
    'Get metadata for a Drive folder by ID. Returns id, name, url, created, updated, owner, parents.',
    folderGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('folderGet', args)
      return formatResponse(result, {
        summary: 'Folder metadata retrieved successfully.',
        hint: 'Use drive_list_folders to list folder contents.',
      })
    },
  )

  server.tool(
    'drive_get_permissions',
    'Get sharing permissions for a Drive file. Returns sharing access level, permission level, owner, editors, and viewers.',
    fileGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileGetPermissions', args)
      const data = result.data as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: formatPermissions(data),
        }],
      }
    },
  )

  server.tool(
    'drive_get_folder_path',
    'Get the full path from root to a file. Walks parent folders up to root Drive.',
    driveFolderPathSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('folderPath', args)
      const data = result.data as Record<string, unknown>
      const pathStr = (data.pathString as string) || ''
      const path = (data.path as Array<Record<string, unknown>>) || []
      const text = `Path: ${pathStr || 'Root'}\n\n` + path.map((p: Record<string, unknown>) => `${p.name} (${p.id})`).join('\n')
      return { content: [{ type: 'text' as const, text }] }
    },
  )
}
