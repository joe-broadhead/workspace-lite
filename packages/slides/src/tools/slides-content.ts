import { formatResponse } from '@google-apps-script-mcp/shared'
import {
  slidesInsertTextBoxSchema, slidesInsertImageSchema,
  slidesInsertShapeSchema, slidesInsertTableSchema,
} from '@google-apps-script-mcp/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSlidesContentTools(server: { tool: Function }) {
  server.tool(
    'slides_insert_text_box',
    'Insert a text box on a slide at the specified position with the given text content.',
    slidesInsertTextBoxSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('textBoxInsert', args)
      return formatResponse(result, { summary: 'Text box inserted.' })
    },
  )

  server.tool(
    'slides_insert_image',
    'Insert an image from a public URL onto a slide at the specified position and size.',
    slidesInsertImageSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('imageInsert', args)
      return formatResponse(result, { summary: 'Image inserted.' })
    },
  )

  server.tool(
    'slides_insert_shape',
    'Insert a shape on a slide. Supports RECTANGLE, ROUND_RECTANGLE, ELLIPSE, TRIANGLE, ARROW_RIGHT, ARROW_LEFT, STAR_5, HEXAGON, CLOUD, FLOW_CHART_PROCESS, FLOW_CHART_DECISION, WAVE, CHEVRON, PENTAGON, TRAPEZOID.',
    slidesInsertShapeSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('shapeInsert', args)
      return formatResponse(result, { summary: 'Shape inserted.' })
    },
  )

  server.tool(
    'slides_insert_table',
    'Insert a table on a slide with the given 2D array of values.',
    slidesInsertTableSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('tableInsert', args)
      return formatResponse(result, { summary: 'Table inserted.' })
    },
  )
}
