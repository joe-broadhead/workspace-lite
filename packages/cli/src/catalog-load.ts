import { tasksTools } from '@workspace-lite/shared/catalog/services/tasks'
import type { ServiceKey, ToolSpec } from '@workspace-lite/shared/catalog'
import { assertUniqueCliPaths } from '@workspace-lite/shared/catalog'

/** All catalog tools present in this build (grows as services flip). */
export function loadCatalogTools(): ToolSpec[] {
  const tools = [...tasksTools]
  assertUniqueCliPaths(tools.map((t) => t.name))
  return tools
}

export function toolsByService(tools: ToolSpec[]): Map<ServiceKey, ToolSpec[]> {
  const map = new Map<ServiceKey, ToolSpec[]>()
  for (const tool of tools) {
    const list = map.get(tool.service) ?? []
    list.push(tool)
    map.set(tool.service, list)
  }
  return map
}

export function findToolByName(tools: ToolSpec[], name: string): ToolSpec | undefined {
  return tools.find((t) => t.name === name)
}

export function findToolsByAction(tools: ToolSpec[], service: string, action: string): ToolSpec[] {
  return tools.filter(
    (t) => t.service === service && (t.actions?.length ? t.actions : [t.action]).includes(action),
  )
}
