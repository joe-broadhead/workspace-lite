import { registerDriveListTools } from './tools/drive-list.js'
import { registerDriveReadTools } from './tools/drive-read.js'
import { registerDriveWriteTools } from './tools/drive-write.js'
import { registerDriveManageTools } from './tools/drive-manage.js'

export function registerDriveTools(server: { tool: Function }) {
  registerDriveListTools(server)
  registerDriveReadTools(server)
  registerDriveWriteTools(server)
  registerDriveManageTools(server)
}
