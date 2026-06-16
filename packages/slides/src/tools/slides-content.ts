import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  slidesInsertTextBoxSchema, slidesInsertImageSchema,
  slidesInsertShapeSchema, slidesInsertTableSchema,
  slidesInsertLineSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSlidesContentTools(server: ToolServer) {
  server.tool(
    'slides_insert_text_box',
    'Insert a text box on a slide. Auto-positions below existing elements by default. Set autoPosition:false or provide coordinates to override.',
    slidesInsertTextBoxSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('textBoxInsert', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Text box inserted.' })
    },
  )

  server.tool(
    'slides_insert_image',
    'Insert an image from a public URL onto a slide at the specified position and size.',
    slidesInsertImageSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('imageInsert', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Image inserted.' })
    },
  )

  server.tool(
    'slides_insert_shape',
    'Insert a shape on a slide. Supports RECTANGLE, ROUND_RECTANGLE, ELLIPSE, TRIANGLE, ARROW_RIGHT, ARROW_LEFT, STAR_5, HEXAGON, CLOUD, FLOW_CHART_PROCESS, FLOW_CHART_DECISION, WAVE, CHEVRON, PENTAGON, TRAPEZOID.',
    slidesInsertShapeSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('shapeInsert', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Shape inserted.' })
    },
  )

  server.tool(
    'slides_insert_table',
    'Insert a table on a slide with the given 2D array of values.',
    slidesInsertTableSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('tableInsert', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Table inserted.' })
    },
  )

  server.tool(
    'slides_insert_line',
    'Insert a line connector between two points on a slide. Supports STRAIGHT, BENT, and CURVED line categories with optional line type (SOLID, DOTTED, DASHED).',
    slidesInsertLineSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('lineInsert', args)
      if (!result.success) return formatResponse(result)
      return formatResponse(result, { summary: 'Line inserted.' })
    },
  )
}
