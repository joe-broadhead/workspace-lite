import {
  slidesSlideIndexSchema, slidesSlideNotesSchema,
} from '@google-apps-script-mcp/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSlidesReadTools(server: { tool: Function }) {
  server.tool(
    'slides_get_slide_elements',
    'List all page elements on a slide with their types, IDs, positions, and dimensions.',
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
}
