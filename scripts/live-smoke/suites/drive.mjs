/**
 * Drive smoke suite. Mutations only touch run-created files/folders.
 * Sharing: the public-sharing guard is exercised as an expected
 * ACTION_NOT_ALLOWED; viewer/editor grants only ever target --self-email.
 * Deletes are trash-only per product design; verification accepts trashed
 * leftovers but requires zero *active* prefixed artifacts.
 */
const needsSelf = (c) => (c.selfEmail ? null : 'requires --self-email')

export const suite = {
  service: 'drive',
  steps: [
    { tool: 'drive_about', params: () => ({}) },
    { tool: 'drive_create_folder', params: (c) => ({ name: `${c.prefix}-folder` }), save: { key: 'folder', pick: 'data.folder.id' } },
    { tool: 'drive_create_folder', params: (c) => ({ name: `${c.prefix}-folder2` }), save: { key: 'folder2', pick: 'data.folder.id' } },
    { tool: 'drive_create_file', params: (c) => ({ name: `${c.prefix}-file.md`, content: '# smoke v1', mimeType: 'text/markdown', parentId: c.folder }), save: { key: 'file', pick: 'data.file.id' } },
    { tool: 'drive_get_file', params: (c) => ({ fileId: c.file }) },
    { tool: 'drive_read_file', params: (c) => ({ fileId: c.file }) },
    { tool: 'drive_update_content', params: (c) => ({ fileId: c.file, content: '# smoke v2' }) },
    { tool: 'drive_update_metadata', params: (c) => ({ fileId: c.file, description: 'smoke' }) },
    { tool: 'drive_copy_file', params: (c) => ({ fileId: c.file, name: `${c.prefix}-copy.md` }), save: { key: 'copy', pick: 'data.file.id' } },
    { tool: 'drive_move_file', params: (c) => ({ fileId: c.copy, destFolderId: c.folder2 }) },
    { tool: 'drive_list_files', params: (c) => ({ folderId: c.folder }) },
    { tool: 'drive_list_folders', params: (c) => ({ folderId: c.folder }) },
    { tool: 'drive_search_files', params: (c) => ({ query: `name contains '${c.prefix}' and trashed=false` }) },
    { tool: 'drive_get_folder', params: (c) => ({ folderId: c.folder }) },
    { tool: 'drive_get_folder_path', params: (c) => ({ fileId: c.file }) },
    { tool: 'drive_add_parent', params: (c) => ({ fileId: c.copy, folderId: c.folder }) },
    { tool: 'drive_remove_parent', params: (c) => ({ fileId: c.copy, folderId: c.folder }), gated: true },
    { tool: 'drive_get_permissions', params: (c) => ({ fileId: c.file }) },
    { tool: 'drive_set_sharing', params: (c) => ({ fileId: c.file, access: 'ANYONE_WITH_LINK', permission: 'VIEW' }), gated: true, expect: 'ACTION_NOT_ALLOWED', note: 'public-sharing guard (ALLOW_PUBLIC_DRIVE_SHARING unset)' },
    { tool: 'drive_add_viewer', params: (c) => ({ fileId: c.file, email: c.selfEmail }), gated: true, skip: needsSelf },
    { tool: 'drive_remove_viewer', params: (c) => ({ fileId: c.file, email: c.selfEmail }), gated: true, skip: needsSelf },
    { tool: 'drive_add_editor', params: (c) => ({ fileId: c.file, email: c.selfEmail }), gated: true, skip: needsSelf },
    { tool: 'drive_remove_editor', params: (c) => ({ fileId: c.file, email: c.selfEmail }), gated: true, skip: needsSelf },
    { tool: 'drive_add_comment', params: (c) => ({ fileId: c.file, content: 'smoke comment' }), save: { key: 'comment', pick: 'data.comment.id' } },
    { tool: 'drive_get_comment', params: (c) => ({ fileId: c.file, commentId: c.comment }) },
    { tool: 'drive_get_comments', params: (c) => ({ fileId: c.file }) },
    { tool: 'drive_update_comment', params: (c) => ({ fileId: c.file, commentId: c.comment, content: 'smoke comment v2' }) },
    { tool: 'drive_create_reply', params: (c) => ({ fileId: c.file, commentId: c.comment, content: 'smoke reply' }), save: { key: 'reply', pick: 'data.reply.id' } },
    { tool: 'drive_get_reply', params: (c) => ({ fileId: c.file, commentId: c.comment, replyId: c.reply }) },
    { tool: 'drive_list_replies', params: (c) => ({ fileId: c.file, commentId: c.comment }) },
    { tool: 'drive_update_reply', params: (c) => ({ fileId: c.file, commentId: c.comment, replyId: c.reply, content: 'smoke reply v2' }) },
    { tool: 'drive_delete_reply', params: (c) => ({ fileId: c.file, commentId: c.comment, replyId: c.reply }), gated: true },
    { tool: 'drive_delete_comment', params: (c) => ({ fileId: c.file, commentId: c.comment }), gated: true },
    { tool: 'drive_list_revisions', params: (c) => ({ fileId: c.file }), save: { key: 'revision', pick: (body) => (body.data?.revisions ?? []).at(-1)?.id } },
    { tool: 'drive_get_revision', params: (c) => ({ fileId: c.file, revisionId: c.revision }) },
    { tool: 'drive_update_revision', params: (c) => ({ fileId: c.file, revisionId: c.revision, keepForever: true }) },
    { tool: 'drive_get_start_page_token', params: () => ({}), save: { key: 'pageToken', pick: 'data.startPageToken' } },
    { tool: 'drive_list_changes', params: (c) => ({ pageToken: c.pageToken, pageSize: 10 }) },
    { tool: 'drive_list_shared_drives', params: () => ({}) },
    { tool: 'drive_export_as', params: (c) => ({ fileId: c.file, mimeType: 'application/pdf' }), skip: () => 'needs a Google Workspace file (run the docs suite in the same invocation for live export coverage)' },
    { tool: 'drive_trash_file', params: (c) => ({ fileId: c.copy }), gated: true },
    { tool: 'drive_untrash_file', params: (c) => ({ fileId: c.copy }), gated: true },
    { tool: 'drive_batch', params: (c) => ({ operations: [
      { action: 'about', params: {} },
      { action: 'fileGet', params: { fileId: c.file } },
    ] }) },
    { tool: 'drive_delete_file', params: (c) => ({ fileId: c.copy }), gated: true, note: 'trash-only per product design' },
  ],
  cleanup: [
    { tool: 'drive_delete_file', params: (c) => ({ fileId: c.file }), gated: true, skip: (c) => (c.file ? null : 'no file created') },
    { tool: 'drive_delete_file', params: (c) => ({ fileId: c.folder }), gated: true, skip: (c) => (c.folder ? null : 'no folder created') },
    { tool: 'drive_delete_file', params: (c) => ({ fileId: c.folder2 }), gated: true, skip: (c) => (c.folder2 ? null : 'no folder created') },
  ],
  verify: [
    { tool: 'drive_search_files', params: (c) => ({ query: `name contains '${c.prefix}' and trashed=false` }),
      leftovers: (body) => (Array.isArray(body.data) ? body.data.length : (body.data?.files ?? []).length) },
  ],
}
