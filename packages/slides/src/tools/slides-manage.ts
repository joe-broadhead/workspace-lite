import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  slidesCreatePresentationSchema, slidesPresentationGetSchema,
  slidesAddSlideSchema, slidesSlideIndexSchema,
  slidesMoveSlideSchema, slidesReplaceAllTextSchema,
  slidesBackgroundSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSlidesManageTools(server: ToolServer) {
  server.tool(
    'slides_create_presentation',
    'Create a new Google Slides presentation.',
    slidesCreatePresentationSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('presentationCreate', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, {
        summary: 'Presentation created.',
        hint: 'Use slides_add_slide to add content.',
      })
    },
  )

  server.tool(
    'slides_get_presentation',
    'Get presentation metadata including ID, name, URL, and list of slides with indices and object IDs.',
    slidesPresentationGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('presentationGet', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, {
        summary: 'Presentation metadata retrieved.',
        hint: 'Use slides_get_slide_elements to inspect individual slides.',
      })
    },
  )

  server.tool(
    'slides_add_slide',
    'Add a new slide to a presentation. Optionally sets title and body text if the layout supports it.',
    slidesAddSlideSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('slideAdd', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Slide added.' })
    },
  )

  server.tool(
    'slides_delete_slide',
    'Delete a slide by index (0-based).',
    slidesSlideIndexSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('slideDelete', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Slide deleted.' })
    },
  )

  server.tool(
    'slides_duplicate_slide',
    'Duplicate a slide by index (0-based). Inserts the copy after the original.',
    slidesSlideIndexSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('slideDuplicate', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Slide duplicated.' })
    },
  )

  server.tool(
    'slides_move_slide',
    'Move a slide to a different position by index (0-based).',
    slidesMoveSlideSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('slideMove', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Slide moved.' })
    },
  )

  server.tool(
    'slides_replace_all_text',
    'Find and replace text across all slides in a presentation.',
    slidesReplaceAllTextSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('textReplaceAll', args)
      if (!result.success) return formatResponse(result)
      const data = result.data as Record<string, unknown>
      return formatResponse(result, {
        summary: `Replaced ${data.replacements || 0} occurrence(s).`,
      })
    },
  )

  server.tool(
    'slides_set_slide_background',
    'Set the background color of a slide using a solid fill color.',
    slidesBackgroundSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('slideBackground', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Slide background set.' })
    },
  )
}
