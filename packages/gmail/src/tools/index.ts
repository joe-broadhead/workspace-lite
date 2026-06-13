import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { registerGmailListTools } from './gmail-list.js'
import { registerGmailReadTools } from './gmail-read.js'
import { registerGmailWriteTools } from './gmail-write.js'
import { registerGmailDraftTools } from './gmail-drafts.js'
import { registerGmailReplyTools } from './gmail-reply.js'
import { registerGmailManageTools } from './gmail-manage.js'
import { registerGmailBatchTool } from './gmail-batch.js'

export function registerGmailTools(server: ToolServer) {
  registerGmailListTools(server)
  registerGmailReadTools(server)
  registerGmailWriteTools(server)
  registerGmailDraftTools(server)
  registerGmailReplyTools(server)
  registerGmailManageTools(server)
  registerGmailBatchTool(server)
}
