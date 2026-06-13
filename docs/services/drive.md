# Google Drive

Manage files, folders, sharing permissions, and storage metadata in Google Drive.

## Tools

| Tool Name | Description |
|---|---|
| `drive_about` | Get storage quota information (total, used, root folder ID). |
| `drive_file_get` | Retrieve detailed metadata for a file by ID. |
| `drive_file_list` | List files in Drive, optionally scoped to a folder. Paginated. |
| `drive_file_search` | Search files using Google Drive query syntax (name, mimeType, modifiedTime, etc.). |
| `drive_file_export` | Export a Google Workspace file (Docs, Sheets, Slides) in a specified MIME type. |
| `drive_folder_get` | Get metadata for a folder by ID. |
| `drive_folder_list` | List the contents (subfolders and files) of a folder. |
| `drive_folder_list_root` | List the contents of the root "My Drive" folder. |
| `drive_folder_create` | Create a new folder, optionally inside a parent folder. |
| `drive_file_create` | Create a new file with content and optional MIME type. |
| `drive_file_copy` | Copy a file, optionally renaming and/or moving to a different folder. |
| `drive_file_move` | Move a file to a different folder. |
| `drive_file_update_meta` | Update a file's name and/or description. |
| `drive_file_update_content` | Overwrite a file's content with new text. |
| `drive_file_get_permissions` | Retrieve sharing permissions for a file (access level, editors, viewers). |
| `drive_file_set_sharing` | Set the sharing access level and permission for a file (ANYONE, DOMAIN, PRIVATE, etc.). |
| `drive_file_add_editor` | Add an editor to a file by email address. |
| `drive_file_add_viewer` | Add a viewer to a file by email address. |
| `drive_file_remove_editor` | Remove an editor from a file by email address. |
| `drive_file_remove_viewer` | Remove a viewer from a file by email address. |
| `drive_file_trash` | Move a file to trash (recoverable with `untrash`). |
| `drive_file_untrash` | Restore a file from trash. |
| `drive_file_delete` | Permanently delete a file (moves to trash first, then deletes). |
| `drive_add_parent` | Add a file to an additional parent folder without removing existing parents. |
| `drive_remove_parent` | Remove a file from a specific parent folder. |
| `drive_get_folder_path` | Get the full path from root to a file by walking parent folders. |
| `drive_export_as` | Export a Google Workspace file (Docs, Sheets, Slides) in a format like PDF, DOCX, XLSX, CSV. |
| `drive_get_comments` | List comments on a Drive file. |
| `drive_add_comment` | Add a head-anchored comment to a Drive file. |
| `drive_batch` | Execute up to 20 Drive operations in a single round-trip. |

## Key Features

- **Drive query syntax** — `file_search` supports the full Google Drive search language (e.g., `name contains 'report'` or `mimeType = 'application/vnd.google-apps.folder'`).
- **Granular permissions model** — Add/remove individual editors and viewers, or set broad sharing access levels (ANYONE, ANYONE_WITH_LINK, DOMAIN, PRIVATE) with VIEW, EDIT, COMMENT, or NONE permission.
- **File export for Workspace types** — Export Google Docs, Sheets, and Slides as PDF, Office formats, CSV, plain text, and more via `file_export`.
- **Two-phase deletion** — `file_trash` sends to trash (recoverable); `file_delete` permanently removes the file.
- **Batch operations** — Use `drive_batch` to chain up to 20 Drive operations in a single round-trip.

## Examples

**Create a folder and file inside it:**

```pseudo
# Step 1: Create a subfolder
drive_folder_create({ name: "Q4 Reports" })
// Returns new folder metadata with folder ID

# Step 2: Create a markdown file inside it
drive_file_create({
  name: "summary.md",
  content: "# Q4 Summary\n\n...",
  mimeType: "text/markdown",
  parentId: "<folder-id>"
})
```

**Search for spreadsheets and share one:**

```pseudo
# Find all spreadsheets modified this month
drive_file_search({
  query: "mimeType='application/vnd.google-apps.spreadsheet' and modifiedTime > '2026-06-01T00:00:00'"
})

# Set sharing so anyone with the link can view
drive_file_set_sharing({
  fileId: "<file-id>",
  access: "ANYONE_WITH_LINK",
  permission: "VIEW"
})
```

**Export a Google Doc as PDF:**

```pseudo
drive_file_export({
  fileId: "<doc-id>",
  mimeType: "application/pdf"
})
// Returns the PDF binary content
```

## Limits & Considerations

- Drive query syntax has specific operator rules — `and`/`or` are lowercase, strings must be single-quoted.
- `file_export` only works on Google Workspace formats (Docs, Sheets, Slides, etc.); binary files have no export representation.
- `file_delete` is destructive and cannot be undone after the trash step completes.
- File listing and searching are paginated; use `page` and `pageSize` parameters to navigate large result sets.
- Shared drive (Team Drive) support is not included in this surface; operations target "My Drive" and shared-with-me files.
