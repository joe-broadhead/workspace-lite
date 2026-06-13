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
| `drive_delete_file` | Permanently delete a file (moves to trash first, then deletes). |
| `drive_add_parent` | Add a file to an additional parent folder without removing existing parents. |
| `drive_remove_parent` | Remove a file from a specific parent folder. |
| `drive_get_folder_path` | Get the full path from root to a file by walking parent folders. |
| `drive_export_as` | Export a Google Workspace file (Docs, Sheets, Slides) in a format like PDF, DOCX, XLSX, CSV. |
| `drive_get_comments` | List comments on a Drive file. |
| `drive_add_comment` | Add a head-anchored comment to a Drive file. |
| `drive_batch` | Execute up to 20 Drive operations in a single round-trip. |

## Key Features

- **Drive query syntax** — `drive_search_files` supports the full Google Drive search language (e.g., `name contains 'report'` or `mimeType = 'application/vnd.google-apps.folder'`).
- **Granular permissions model** — Add/remove individual editors and viewers, or set broad sharing access levels (ANYONE, ANYONE_WITH_LINK, DOMAIN, PRIVATE) with VIEW, EDIT, COMMENT, or NONE permission.
- **File export for Workspace types** — Use `drive_read_file` for text export or `drive_export_as` for PDF, Office formats, CSV, and other binary exports.
- **Two-phase deletion** — `drive_trash_file` sends to trash (recoverable); `drive_delete_file` performs the repository's permanent-delete workflow.
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

- Drive query syntax has specific operator rules — `and`/`or` are lowercase, strings must be single-quoted.
- `drive_export_as` only works on Google Workspace formats (Docs, Sheets, Slides, etc.); binary files have no export representation.
- `drive_delete_file` is destructive and cannot be undone after the trash step completes.
- File listing and searching are paginated; use `page` and `pageSize` parameters to navigate large result sets.
- Shared drive (Team Drive) support is not included in this surface; operations target "My Drive" and shared-with-me files.
- For retry and partial-success behavior of `drive_move_file`, create/copy/share tools, and `idempotencyKey`, see [Mutation Safety](../operations/mutation-safety.md).
