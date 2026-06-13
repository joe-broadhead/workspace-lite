import {
  slidesSlideIndexSchema, slidesSlideNotesSchema,
  slidesDeleteElementSchema, slidesFormatTextSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSlidesReadTools(server: { tool: Function }) {
  server.tool(
    'slides_get_slide_elements',
    'List all page elements on a slide with their types, IDs, positions, dimensions, and full text content (no truncation).',
    slidesSlideIndexSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('slideElementsList', args)
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
    'slides_get_slide_notes',
    'Get or set speaker notes for a slide. If notes param is provided, sets notes. If omitted, returns current notes.',
    slidesSlideNotesSchema,
    async (args: Record<string, unknown>) => {
      const action = args.notes !== undefined ? 'slideNotes' : 'slideNotes'
      const result = await callProxy('slideNotes', args)
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
      const data = result.data as Record<string, unknown>
      return {
        content: [{ type: 'text' as const, text: `Formatted ${data.formattedCount} occurrence(s) of "${args.findText}" in element ${data.objectId} on slide ${data.slideIndex}.` }],
      }
    },
  )
}
