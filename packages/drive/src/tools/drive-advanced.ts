import { createProxyClient } from '@workspace-lite/shared/proxy-client'
import { registerTool } from '@workspace-lite/shared/tool-helpers'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  driveChangesListSchema,
  driveChangesStartPageTokenSchema,
  driveCommentDeleteSchema,
  driveCommentGetSchema,
  driveCommentUpdateSchema,
  driveRepliesListSchema,
  driveReplyCreateSchema,
  driveReplyDeleteSchema,
  driveReplyGetSchema,
  driveReplyUpdateSchema,
  driveRevisionGetSchema,
  driveRevisionsListSchema,
  driveRevisionUpdateSchema,
  driveSharedDriveGetSchema,
  driveSharedDrivesListSchema,
} from '@workspace-lite/shared/schemas'

const client = createProxyClient('drive')

function requireOneOf(args: Record<string, unknown>, fields: string[], message: string) {
  if (!fields.some((field) => args[field] !== undefined)) throw new Error(message)
}

export function registerDriveAdvancedTools(server: ToolServer) {
  registerTool(server, client, {
    name: 'drive_get_comment',
    description: 'Get a specific Drive file comment by ID, including replies when returned by the Drive API.',
    schema: driveCommentGetSchema,
    action: 'commentsGet',
    summary: 'Comment retrieved successfully.',
  })

  registerTool(server, client, {
    name: 'drive_update_comment',
    description: 'Update a Drive file comment content and/or resolved state.',
    schema: driveCommentUpdateSchema,
    action: 'commentsUpdate',
    summary: 'Comment updated successfully.',
    validate: (args) => requireOneOf(args, ['content', 'resolved'], 'Provide content or resolved to update a comment.'),
  })

  registerTool(server, client, {
    name: 'drive_delete_comment',
    description: 'Delete a Drive file comment. Requires explicit confirmation.',
    schema: driveCommentDeleteSchema,
    action: 'commentsDelete',
    summary: 'Comment deleted successfully.',
  })

  registerTool(server, client, {
    name: 'drive_list_replies',
    description: 'List replies on a Drive file comment.',
    schema: driveRepliesListSchema,
    action: 'repliesList',
    summary: 'Replies retrieved successfully.',
  })

  registerTool(server, client, {
    name: 'drive_create_reply',
    description: 'Create a reply on a Drive file comment.',
    schema: driveReplyCreateSchema,
    action: 'repliesCreate',
    summary: 'Reply created successfully.',
  })

  registerTool(server, client, {
    name: 'drive_get_reply',
    description: 'Get a specific reply on a Drive file comment.',
    schema: driveReplyGetSchema,
    action: 'repliesGet',
    summary: 'Reply retrieved successfully.',
  })

  registerTool(server, client, {
    name: 'drive_update_reply',
    description: 'Update the content of a Drive file comment reply.',
    schema: driveReplyUpdateSchema,
    action: 'repliesUpdate',
    summary: 'Reply updated successfully.',
  })

  registerTool(server, client, {
    name: 'drive_delete_reply',
    description: 'Delete a Drive file comment reply. Requires explicit confirmation.',
    schema: driveReplyDeleteSchema,
    action: 'repliesDelete',
    summary: 'Reply deleted successfully.',
  })

  registerTool(server, client, {
    name: 'drive_list_revisions',
    description: 'List Drive file revisions with metadata such as modified time, size, and keepForever when available.',
    schema: driveRevisionsListSchema,
    action: 'revisionsList',
    summary: 'Revisions retrieved successfully.',
  })

  registerTool(server, client, {
    name: 'drive_get_revision',
    description: 'Get metadata for a specific Drive file revision.',
    schema: driveRevisionGetSchema,
    action: 'revisionsGet',
    summary: 'Revision retrieved successfully.',
  })

  registerTool(server, client, {
    name: 'drive_update_revision',
    description: 'Update Drive revision metadata such as keepForever where the Drive API supports it.',
    schema: driveRevisionUpdateSchema,
    action: 'revisionsUpdate',
    summary: 'Revision updated successfully.',
    validate: (args) => requireOneOf(args, ['keepForever'], 'Provide keepForever to update revision metadata.'),
  })

  registerTool(server, client, {
    name: 'drive_list_shared_drives',
    description: 'List shared drives visible to the deploying user.',
    schema: driveSharedDrivesListSchema,
    action: 'sharedDrivesList',
    summary: 'Shared drives retrieved successfully.',
  })

  registerTool(server, client, {
    name: 'drive_get_shared_drive',
    description: 'Get metadata and capabilities for a specific shared drive.',
    schema: driveSharedDriveGetSchema,
    action: 'sharedDrivesGet',
    summary: 'Shared drive retrieved successfully.',
  })

  registerTool(server, client, {
    name: 'drive_get_start_page_token',
    description: 'Get a Drive changes start page token for My Drive or a shared drive.',
    schema: driveChangesStartPageTokenSchema,
    action: 'changesStartPageToken',
    summary: 'Start page token retrieved successfully.',
  })

  registerTool(server, client, {
    name: 'drive_list_changes',
    description: 'List Drive changes from a start or next page token. Does not create watch channels.',
    schema: driveChangesListSchema,
    action: 'changesList',
    summary: 'Drive changes retrieved successfully.',
  })
}
