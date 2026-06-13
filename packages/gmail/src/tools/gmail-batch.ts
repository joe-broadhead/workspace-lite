import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { gmailBatchSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerGmailBatchTool(server: ToolServer) {
  server.tool(
    'gmail_batch',
    'Execute multiple Gmail operations in a single round-trip. Pass an ordered array of {action, params} objects. Actions are the same names used by individual tools (profile, searchMessages, listThreads, getMessage, getThread, listLabels, send, createDraft, createDraftReply, createDraftReplyAll, listDrafts, getDraft, updateDraft, deleteDraft, sendDraft, markRead, markUnread, archive, star, unstar, addLabel, removeLabel, trashMessage, untrashMessage, deleteMessage, trashThread, untrashThread, reply, replyAll, forward, attachmentGet, batchModify). Operations execute sequentially; errors are collected per-operation. Up to 20 operations.',
    gmailBatchSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('batch', args)
      return formatResponse(result, { summary: 'Batch executed.' })
    },
  )
}
