import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ToolSpec } from '@workspace-lite/shared/catalog'
import { calendarTools } from '@workspace-lite/shared/catalog/services/calendar'
import { docsTools } from '@workspace-lite/shared/catalog/services/docs'
import { driveTools } from '@workspace-lite/shared/catalog/services/drive'
import { formsTools } from '@workspace-lite/shared/catalog/services/forms'
import { gmailTools } from '@workspace-lite/shared/catalog/services/gmail'
import { sheetsTools } from '@workspace-lite/shared/catalog/services/sheets'
import { slidesTools } from '@workspace-lite/shared/catalog/services/slides'
import { tasksTools } from '@workspace-lite/shared/catalog/services/tasks'

const allTools: ToolSpec[] = [
  ...tasksTools, ...formsTools, ...calendarTools, ...slidesTools,
  ...docsTools, ...sheetsTools, ...gmailTools, ...driveTools,
]

// A successful object-shaped result (no list key). List formatters applied to
// results like this render the useless "Found 0 items" (JOE-825).
const objectResult = {
  success: true as const,
  data: { thing: { id: 'x1', name: 'wslite-shape-probe' } },
}

describe('formatter result-shape sanity (JOE-825)', () => {
  it('non-list formatters never render a successful object result as an empty list', () => {
    const offenders: string[] = []
    for (const tool of allTools) {
      if (tool.formatter?.kind === 'list' || !tool.formatter?.formatMcp) continue
      const out = tool.formatter.formatMcp(objectResult, {})
      const text = out.content.map((c) => c.text).join('\n')
      if (/^Found 0 /.test(text)) offenders.push(tool.name)
    }
    assert.deepEqual(
      offenders,
      [],
      `object-returning tools rendering as empty lists: ${offenders.join(', ')}`,
    )
  })

  it('list formatters are only declared on list/search/batch-get style tools', () => {
    const allowed = /_(list|search|find|get_event_instances|find_freebusy)/
    const offenders = allTools
      .filter((tool) => tool.formatter?.kind === 'list' && !allowed.test(tool.name))
      .map((tool) => tool.name)
    assert.deepEqual(offenders, [], `unexpected list formatters on: ${offenders.join(', ')}`)
  })
})
