# Google Drive

Manage files, folders, sharing permissions, and storage metadata in Google Drive.

## Tools

| Tool Name | Description |
|---|---|
| `drive_about` | Get storage quota information (total, used, root folder ID). |
| `drive_get_file` | Retrieve detailed metadata for a file by ID. |
| `drive_list_files` | List files in Drive, optionally scoped to a folder. Paginated. |
| `drive_search_files` | Search files using Google Drive query syntax (name, mimeType, modifiedTime, etc.). |
| `drive_read_file` | Read a Drive file as text, including Google Docs and Sheets exports. |
| `drive_get_folder` | Get metadata for a folder by ID. |
| `drive_list_folders` | List the contents of a folder, or root when `folderId` is omitted. |
| `drive_create_folder` | Create a new folder, optionally inside a parent folder. |
| `drive_create_file` | Create a new file with content and optional MIME type. |
| `drive_copy_file` | Copy a file, optionally renaming and/or moving to a different folder. |
| `drive_move_file` | Move a file to a different folder. |
| `drive_update_metadata` | Update a file's name and/or description. |
| `drive_update_content` | Overwrite a file's content with new text. |
| `drive_get_permissions` | Retrieve sharing permissions for a file (access level, editors, viewers). |
| `drive_set_sharing` | Set the sharing access level and permission for a file (ANYONE, DOMAIN, PRIVATE, etc.). |
| `drive_add_editor` | Add an editor to a file by email address. |
| `drive_add_viewer` | Add a viewer to a file by email address. |
| `drive_remove_editor` | Remove an editor from a file by email address. |
| `drive_remove_viewer` | Remove a viewer from a file by email address. |
| `drive_trash_file` | Move a file to trash (recoverable with `drive_untrash_file`). |
| `drive_untrash_file` | Restore a file from trash. |
| `drive_delete_file` | Move a file to trash through the delete workflow. Permanent deletion requires emptying trash in Drive. |
| `drive_add_parent` | Add a file to an additional parent folder without removing existing parents. |
| `drive_remove_parent` | Remove a file from a specific parent folder. |
| `drive_get_folder_path` | Get the full path from root to a file by walking parent folders. |
| `drive_export_as` | Export a Google Workspace file (Docs, Sheets, Slides) in a format like PDF, DOCX, XLSX, CSV. |
| `drive_get_comments` | List comments on a Drive file. |
| `drive_add_comment` | Add a head-anchored comment to a Drive file. |
| `drive_get_comment` | Get a specific Drive comment by ID. |
| `drive_update_comment` | Update comment content or resolved state. |
| `drive_delete_comment` | Delete a Drive comment. |
| `drive_list_replies` | List replies on a Drive comment. |
| `drive_create_reply` | Create a reply on a Drive comment. |
| `drive_get_reply` | Get a specific Drive comment reply. |
| `drive_update_reply` | Update a Drive comment reply. |
| `drive_delete_reply` | Delete a Drive comment reply. |
| `drive_list_revisions` | List Drive file revisions. |
| `drive_get_revision` | Get a specific Drive revision. |
| `drive_update_revision` | Update revision metadata such as `keepForever` where supported. |
| `drive_list_shared_drives` | List shared drives visible to the deploying user. |
| `drive_get_shared_drive` | Get shared drive metadata and capabilities. |
| `drive_get_start_page_token` | Get a start page token for Drive changes. |
| `drive_list_changes` | List Drive changes from a start or next page token. |
| `drive_batch` | Execute up to 20 Drive operations in a single round-trip. |

## Key Features

- **Drive query syntax** — `drive_search_files` uses `DriveApp.searchFiles` query syntax and normalizes common Drive API v3 fields such as `name`, `modifiedTime`, and `createdTime`.
- **Granular permissions model** — Add/remove individual editors and viewers, or set broad sharing access levels (ANYONE, ANYONE_WITH_LINK, DOMAIN, PRIVATE) with VIEW, EDIT, COMMENT, or NONE permission.
- **File export for Workspace types** — Use `drive_read_file` for text export or `drive_export_as` for PDF, Office formats, CSV, and other binary exports.
- **Trash/delete workflow** — `drive_trash_file` and `drive_delete_file` both move files to trash; permanent deletion requires emptying trash in Drive.
- **Advanced collaboration** — Manage Drive comments and replies with documented Advanced Drive service methods.
- **Revision and history reads** — List revisions and Drive changes without creating push/watch channels.
- **Shared drive discovery** — List and inspect shared drive metadata, capabilities, and restrictions visible to the deploying user.
- **Batch operations** — Use `drive_batch` to chain up to 20 Drive operations in a single round-trip.

## Examples

**Create a folder and file inside it:**

```pseudo
# Step 1: Create a subfolder
drive_create_folder({ name: "Q4 Reports" })
// Returns new folder metadata with folder ID

# Step 2: Create a markdown file inside it
drive_create_file({
  name: "summary.md",
  content: "# Q4 Summary\n\n...",
  mimeType: "text/markdown",
  parentId: "<folder-id>"
})
```

**Search for spreadsheets and share one:**

```pseudo
# Find all spreadsheets modified this month
drive_search_files({
  query: "mimeType='application/vnd.google-apps.spreadsheet' and modifiedTime > '2026-06-01T00:00:00'"
})

# Set sharing so anyone with the link can view
drive_set_sharing({
  fileId: "<file-id>",
  access: "ANYONE_WITH_LINK",
  permission: "VIEW"
})
```

**Export a Google Doc as PDF:**

```pseudo
drive_export_as({
  fileId: "<doc-id>",
  mimeType: "application/pdf"
})
// Returns the PDF binary content
```

## Limits & Considerations

- Drive search syntax has specific operator rules — `and`/`or` are lowercase, strings must be single-quoted, and not every Drive API v3 query field is supported by `DriveApp.searchFiles`.
- `drive_export_as` only works on Google Workspace formats (Docs, Sheets, Slides, etc.); binary files have no export representation.
- `drive_delete_file` moves the file to trash and is treated as destructive because trashed files may later be permanently removed by Drive retention or manual trash emptying. Use `drive_untrash_file` while the file is still recoverable.
- `drive_delete_comment` and `drive_delete_reply` are destructive and require explicit confirmation.
- Drive revision history is incomplete for some file types. Binary revisions can expose `keepForever`; Google Workspace editor files often expose less revision metadata and may reject revision metadata updates.
- Shared drive results depend on account membership, admin policies, and per-drive capabilities. Some operations may be unavailable even when a shared drive is visible.
- `drive_list_changes` reads from caller-provided page tokens and does not manage push/watch channel lifecycle.
- File listing and searching are paginated; use `page` and `pageSize` parameters to navigate large result sets.
- Comments, replies, revisions, shared drives, and changes are paginated by the Drive API; use returned page tokens to continue.
- For retry and partial-success behavior of `drive_move_file`, create/copy/share tools, and `idempotencyKey`, see [Mutation Safety](../operations/mutation-safety.md).
