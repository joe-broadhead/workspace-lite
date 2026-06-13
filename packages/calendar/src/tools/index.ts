import { registerCalendarListTools } from './calendar-list.js'
import { registerCalendarReadTools } from './calendar-read.js'
import { registerCalendarWriteTools } from './calendar-write.js'
import { registerCalendarBatchTool } from './calendar-batch.js'

export function registerCalendarTools(server: { tool: Function }) {
  registerCalendarListTools(server)
  registerCalendarReadTools(server)
  registerCalendarWriteTools(server)
  registerCalendarBatchTool(server)
}
