import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { docsFormatTextSchema } from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDocsFormatTools(server: ToolServer) {
  server.tool(
    'docs_format_text',
    'Format text in the document by search pattern. Finds the text and applies formatting: bold, italic, underline, strikethrough, font family, font size, colors, or links.',
    docsFormatTextSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('formatText', args)
      if (!result.success) return formatResponse(result)
      const data = result.data as Record<string, unknown>
      return formatResponse(result, {
        summary: `Formatted ${data.occurrences || 0} occurrence(s) of "${args.findText}".`,
      })
    },
  )
}
