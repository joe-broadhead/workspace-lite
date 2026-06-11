import { registerDriveListTools } from './drive-list.js'
import { registerDriveReadTools } from './drive-read.js'
import { registerDriveWriteTools } from './drive-write.js'
import { registerDriveManageTools } from './drive-manage.js'

export function registerDriveTools(server: { tool: Function }) {
  registerDriveListTools(server)
  registerDriveReadTools(server)
  registerDriveWriteTools(server)
  registerDriveManageTools(server)
}
