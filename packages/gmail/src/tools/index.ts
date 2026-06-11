import { registerGmailListTools } from './gmail-list.js'
import { registerGmailReadTools } from './gmail-read.js'
import { registerGmailWriteTools } from './gmail-write.js'
import { registerGmailDraftTools } from './gmail-drafts.js'
import { registerGmailManageTools } from './gmail-manage.js'

export function registerGmailTools(server: { tool: Function }) {
  registerGmailListTools(server)
  registerGmailReadTools(server)
  registerGmailWriteTools(server)
  registerGmailDraftTools(server)
  registerGmailManageTools(server)
}
