import { z } from 'zod'

export const driveIdSchema = z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid Drive ID')

export const fileListSchema = z.object({
  folderId: z.string().optional().describe('Folder ID to list files from. Omit to list all files.'),
  pageSize: z.number().min(1).max(100).default(50).describe('Number of files per page.'),
  pageToken: z.number().min(0).default(0).describe('Page number (0-based) for pagination.'),
})

export const fileSearchSchema = z.object({
  query: z.string().describe('Drive search query string. See Google Drive search query syntax.'),
  maxResults: z.number().min(1).max(100).default(20).describe('Maximum results.'),
})

export const fileGetSchema = z.object({
  fileId: driveIdSchema.describe('Drive file ID.'),
})

export const fileExportSchema = z.object({
  fileId: driveIdSchema.describe('Drive file ID to export.'),
  mimeType: z.string().default('text/plain').describe('Export MIME type.'),
})

export const folderGetSchema = z.object({
  folderId: z.string().describe('Folder ID.'),
})

export const folderListSchema = z.object({
  folderId: z.string().optional().describe('Folder ID. Omit for root folder.'),
})

export const folderCreateSchema = z.object({
  name: z.string().describe('Folder name.'),
  parentId: z.string().optional().describe('Parent folder ID. Omit for root.'),
})

export const fileCreateSchema = z.object({
  name: z.string().describe('File name.'),
  content: z.string().describe('File content.'),
  mimeType: z.string().default('text/plain').describe('MIME type (e.g. text/markdown, application/json).'),
  parentId: z.string().optional().describe('Parent folder ID. Omit for root.'),
})

export const fileCopySchema = z.object({
  fileId: driveIdSchema.describe('Source file ID.'),
  name: z.string().optional().describe('New name for copy.'),
  destFolderId: z.string().optional().describe('Destination folder ID.'),
})

export const fileMoveSchema = z.object({
  fileId: driveIdSchema.describe('File ID to move.'),
  destFolderId: z.string().describe('Destination folder ID.'),
})

export const fileUpdateMetaSchema = z.object({
  fileId: driveIdSchema.describe('File ID.'),
  name: z.string().optional().describe('New name.'),
  description: z.string().optional().describe('New description.'),
})

export const fileUpdateContentSchema = z.object({
  fileId: driveIdSchema.describe('File ID.'),
  content: z.string().describe('New file content.'),
})

export const fileSetSharingSchema = z.object({
  fileId: driveIdSchema.describe('File ID.'),
  access: z.enum(['ANYONE', 'ANYONE_WITH_LINK', 'DOMAIN', 'DOMAIN_WITH_LINK', 'PRIVATE']).describe('Sharing access level.'),
  permission: z.enum(['NONE', 'VIEW', 'EDIT', 'COMMENT', 'ORGANIZER', 'FILE_ORGANIZER', 'OWNER']).describe('Sharing permission.'),
})

export const fileAddEditorSchema = z.object({
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to add as editor.'),
})

export const fileAddViewerSchema = z.object({
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to add as viewer.'),
})

export const fileRemoveEditorSchema = z.object({
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to remove as editor.'),
})

export const fileRemoveViewerSchema = z.object({
  fileId: driveIdSchema.describe('File ID.'),
  email: z.string().email().describe('Email to remove as viewer.'),
})
