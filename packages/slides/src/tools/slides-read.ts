import {
  slidesSlideIndexSchema, slidesSlideNotesSchema,
  slidesDeleteElementSchema, slidesFormatTextSchema,
  slidesGetElementTextSchema,
} from '@workspace-lite/shared/schemas'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { formatResponse } from '@workspace-lite/shared'
import { callProxy } from '../proxy.js'

export function registerSlidesReadTools(server: ToolServer) {
  server.tool(
    'slides_get_slide_elements',
    'List all page elements on a slide with their types, IDs, positions, dimensions, and full text content (no truncation).',
    slidesSlideIndexSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('slideElementsList', args)
      if (!result.success) return formatResponse(result)
      const data = result.data as Record<string, unknown>
      const elements = data.elements as Array<Record<string, unknown>> || []
      const lines = elements.map((el: Record<string, unknown>) =>
        `[${el.type || 'unknown'}] ${el.objectId} — ${el.width}×${el.height}pt at (${el.left}, ${el.top})`)
      return {
        content: [{
          type: 'text' as const,
          text: `Slide ${data.slideIndex}: ${elements.length} element(s)\n${lines.join('\n')}`,
        }],
      }
    },
  )

  server.tool(
    'slides_get_element_text',
    'Read text from a specific shape/text element on a slide. Get objectIds from slides_get_slide_elements.',
    slidesGetElementTextSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('elementGetText', args)
      if (!result.success) return formatResponse(result)
      const data = result.data as Record<string, unknown>
      return { content: [{ type: 'text' as const, text: `Text for element ${data.objectId} on slide ${data.slideIndex}:\n\n${data.text || ''}` }] }
    },
  )

  server.tool(
    'slides_get_slide_notes',
    'Get or set speaker notes for a slide. If notes param is provided, sets notes. If omitted, returns current notes.',
    slidesSlideNotesSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('slideNotes', args)
      if (!result.success) return formatResponse(result)
      const data = result.data as Record<string, unknown>
      if (args.notes !== undefined) {
        return { content: [{ type: 'text' as const, text: `Speaker notes updated on slide ${data.slideIndex}.` }] }
      }
      return { content: [{ type: 'text' as const, text: `Speaker notes for slide ${data.slideIndex}:\n\n${data.notes || '(none)'}` }] }
    },
  )

  server.tool(
    'slides_delete_element',
    'Delete a page element from a slide by its objectId. Get objectIds from slides_get_slide_elements.',
    slidesDeleteElementSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('elementDelete', args)
      if (!result.success) return formatResponse(result)
      const data = result.data as Record<string, unknown>
      return {
        content: [{ type: 'text' as const, text: `Deleted element ${data.objectId} from slide ${data.slideIndex}.` }],
      }
    },
  )

  server.tool(
    'slides_format_text',
    'Format text within a slide element (shape/text box). Finds all occurrences of findText in the element and applies the specified formatting.',
    slidesFormatTextSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('elementFormatText', args)
      if (!result.success) return formatResponse(result)
      const data = result.data as Record<string, unknown>
      return {
        content: [{ type: 'text' as const, text: `Formatted ${data.formattedCount} occurrence(s) of "${args.findText}" in element ${data.objectId} on slide ${data.slideIndex}.` }],
      }
    },
  )
}
