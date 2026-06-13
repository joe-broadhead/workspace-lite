# Gmail

Read, send, draft, label, search, and manage email threads and messages.

## Tools

| Tool Name | Description |
|---|---|
| `gmail_profile` | Get the authenticated user's Gmail profile information. |
| `gmail_search_messages` | Search messages by query, sender, recipient, subject, date range, label, or read/starred status. |
| `gmail_list_threads` | List email threads with same filter options as `search_messages`. |
| `gmail_get_message` | Retrieve full details of a single message (headers, body, attachments). |
| `gmail_get_thread` | Retrieve a complete thread with all messages. |
| `gmail_list_labels` | List all Gmail labels in the account. |
| `gmail_send` | Send an email immediately. |
| `gmail_create_draft` | Create a new draft without sending. |
| `gmail_create_draft_reply` | Create a draft reply to a message (review before sending). |
| `gmail_create_draft_reply_all` | Create a draft reply-all to a message (review before sending). |
| `gmail_list_drafts` | List all saved drafts. |
| `gmail_get_draft` | Retrieve a specific draft by ID. |
| `gmail_update_draft` | Update an existing draft's content. |
| `gmail_delete_draft` | Permanently delete a draft. |
| `gmail_send_draft` | Send an existing draft. |
| `gmail_mark_read` | Mark a message as read. |
| `gmail_mark_unread` | Mark a message as unread. |
| `gmail_archive` | Archive a message (remove from inbox). |
| `gmail_star` | Star a message. |
| `gmail_unstar` | Remove the star from a message. |
| `gmail_add_label` | Add a label to a message (creates the label if it doesn't exist). |
| `gmail_remove_label` | Remove a label from a message. |
| `gmail_trash_message` | Move a single message to trash. |
| `gmail_untrash_message` | Restore a message from trash. |
| `gmail_delete_message` | Permanently delete a message. |
| `gmail_trash_thread` | Move an entire thread to trash. |
| `gmail_untrash_thread` | Restore a thread from trash. |
| `gmail_reply` | Reply to a message (sends immediately). |
| `gmail_reply_all` | Reply to a message and all recipients (sends immediately). |
| `gmail_forward` | Forward a message to new recipients (sends immediately). |
| `gmail_get_attachment` | Download an attachment from a Gmail message by message ID and attachment ID. |
| `gmail_batch_modify` | Bulk label changes on multiple messages at once. |
| `gmail_batch` | Execute up to 20 Gmail operations in a single round-trip. |

## Key Features

- **Draft-first safety** — Always create a draft before sending. Use `create_draft`, `create_draft_reply`, or `create_draft_reply_all` to compose safely, review with `get_draft`, and only send with `send_draft` when ready. This prevents accidental sends.
- **Rich search and filtering** — `search_messages` and `list_threads` support Gmail query syntax plus structured filters: `from`, `to`, `subject`, `before`/`after` dates, `isUnread`, `isStarred`, and `label`.
- **Thread-level operations** — `trash_thread`, `untrash_thread`, and `get_thread` operate on entire conversations at once, matching Gmail's thread-centric model.
- **Full label lifecycle** — `add_label` auto-creates labels that don't exist yet; `remove_label` detaches without deleting the label itself; `list_labels` shows all available labels.
- **Batch operations** — Use `gmail_batch` to chain up to 20 Gmail operations in a single round-trip.

## Examples

**Safe reply workflow (draft-first):**

```pseudo
# Step 1: Find the message
gmail_search_messages({ query: "from:boss@company.com subject:budget" })

# Step 2: Create a draft reply (not sent yet)
gmail_create_draft_reply({
  messageId: "<message-id>",
  body: "Here are the updated budget numbers..."
})

# Step 3: Review the draft
gmail_get_draft({ draftId: "<draft-id>" })

# Step 4: Send only after review
gmail_send_draft({ draftId: "<draft-id>" })
```

**Search unread messages from a specific sender:**

```pseudo
gmail_search_messages({
  from: "client@example.com",
  isUnread: "true",
  maxResults: 10
})
// Returns up to 10 matching messages
```

**Label and archive a thread:**

```pseudo
# Get a thread and apply a label
gmail_add_label({ messageId: "<msg-id>", label: "Project/Alpha" })

# Remove from inbox while keeping the label
gmail_archive({ messageId: "<msg-id>" })
```

## Limits & Considerations

- `gmail_send`, `gmail_reply`, `gmail_reply_all`, and `gmail_forward` send immediately — prefer draft variants for safety.
- `gmail_delete_message` is permanent and cannot be undone. Use `trash_message` for a recoverable delete.
- The Gmail API enforces daily usage quotas; batch operations help reduce API calls.
- Attachments are referenced in message responses but are not downloaded inline; use Drive tools to fetch attachment content.
- Gmail search query syntax uses operators like `from:`, `subject:`, `label:`, `has:attachment`, `is:unread`, etc. Refer to Google's Gmail search documentation for the full syntax.
