import { formatResponse } from '@google-apps-script-mcp/shared'
import { callProxy } from '../proxy.js'

export function registerGmailManageTools(server: { tool: Function }) {
  server.tool('gmail_trash_message', 'Move a message to trash.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('trashMessage', args), { summary: 'Trashed.', hint: 'Use gmail_untrash_message to restore.' }) })
  server.tool('gmail_untrash_message', 'Restore a message from trash.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('untrashMessage', args), { summary: 'Restored.' }) })
  server.tool('gmail_trash_thread', 'Move an entire thread to trash.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('trashThread', args), { summary: 'Thread trashed.' }) })
  server.tool('gmail_untrash_thread', 'Restore a thread from trash.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('untrashThread', args), { summary: 'Thread restored.' }) })
  server.tool('gmail_delete_message', 'Permanently delete a message.', {},
    async (args: Record<string, unknown>) => { return formatResponse(await callProxy('deleteMessage', args), { summary: 'Deleted.' }) })
}
