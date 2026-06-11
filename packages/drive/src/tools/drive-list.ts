import { READ_ONLY, formatList, formatBytes } from '@google-apps-script-mcp/shared'
import { fileListSchema, fileSearchSchema, folderListSchema } from '@google-apps-script-mcp/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDriveListTools(server: { tool: Function }) {
  server.tool(
    'drive_about',
    'Get Drive storage information including total storage, used storage, and root folder ID.',
    {},
    READ_ONLY,
    async () => {
      const result = await callProxy('about')
      const d = result.data as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: `Drive Storage: ${formatBytes(d.storageUsed as number)} used of ${formatBytes(d.storageLimit as number)}\nRoot Folder: ${d.rootFolderId}`,
        }],
      }
    },
  )

  server.tool(
    'drive_list_files',
    'List files in Drive. Optionally filter by folderId. Returns file name, id, mimeType, url, size, last updated, owner. Paginate with pageToken.',
    fileListSchema,
    READ_ONLY,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileList', args)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'file',
        itemSummary: (f: unknown) => {
          const file = f as Record<string, unknown>
          return `${file.name} (${file.id}) — ${file.mimeType} — ${formatBytes(file.size as number)}`
        },
        hint: 'Use drive_file_get to fetch metadata or drive_read_file to read content.',
      })
    },
  )

  server.tool(
    'drive_search_files',
    'Search Drive files with Google Drive query syntax. Supports: mimeType, name, modifiedTime, fullText, parents, starred, trashed. Example: "name contains \'report\'" or "mimeType = \'application/pdf\'".',
    fileSearchSchema,
    READ_ONLY,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('fileSearch', args)
      return formatList(result, {
        itemsKey: 'items',
        noun: 'result',
        itemSummary: (f: unknown) => {
          const file = f as Record<string, unknown>
          return `${file.name} (${file.id}) — ${file.mimeType} — ${file.owner || 'unknown'}`
        },
        hint: 'Use drive_file_get to fetch full details or drive_read_file to read content.',
      })
    },
  )

  server.tool(
    'drive_list_folders',
    'List contents of a Drive folder (subfolders and files). If no folderId, lists root folder.',
    folderListSchema,
    READ_ONLY,
    async (args: Record<string, unknown>) => {
      const action = args.folderId ? 'folderList' : 'folderListRoot'
      const result = await callProxy(action, args)
      const data = result.data as Record<string, unknown>
      const folderList = (data.folders as Array<Record<string, unknown>>) || []
      const fileList = (data.files as Array<Record<string, unknown>>) || []
      const folderLines = folderList.map((f: Record<string, unknown>) => `[folder] ${f.name} (${f.id})`)
      const fileLines = fileList.map((f: Record<string, unknown>) => `[file] ${f.name} (${f.id}) — ${f.mimeType}`)
      const text = `Directory: ${data.folderName || 'Root'}\n\n${folderLines.length} folders\n${folderLines.join('\n')}\n\n${fileLines.length} files\n${fileLines.join('\n')}`
      return { content: [{ type: 'text' as const, text }] }
    },
  )
}
