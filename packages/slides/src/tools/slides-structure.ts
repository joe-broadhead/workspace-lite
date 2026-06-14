import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  slidesElementGetSchema, slidesElementGeometrySchema, slidesElementTransformSchema,
  slidesElementAltTextSchema, slidesElementLinkSchema, slidesElementReorderSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSlidesStructureTools(server: ToolServer) {
  server.tool(
    'slides_get_element',
    'Get one slide page element with geometry, rotation, alt text, and link metadata.',
    slidesElementGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('elementGet', args)
      return formatResponse(result, { summary: 'Element retrieved.' })
    },
  )

  server.tool(
    'slides_update_element_geometry',
    'Update a slide element position, size, and/or rotation in points/degrees.',
    slidesElementGeometrySchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('elementGeometryUpdate', args)
      return formatResponse(result, { summary: 'Element geometry updated.' })
    },
  )

  server.tool(
    'slides_update_element_transform',
    'Update a slide element affine transform using the constrained Slides API transform fields.',
    slidesElementTransformSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('elementTransformUpdate', args)
      return formatResponse(result, { summary: 'Element transform updated.' })
    },
  )

  server.tool(
    'slides_set_element_alt_text',
    'Set or clear accessibility title and description on a slide element.',
    slidesElementAltTextSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('elementAltTextSet', args)
      return formatResponse(result, { summary: 'Element alt text updated.' })
    },
  )

  server.tool(
    'slides_set_element_link',
    'Set an element link to an HTTPS URL, link to another slide, or clear the link.',
    slidesElementLinkSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('elementLinkSet', args)
      return formatResponse(result, { summary: 'Element link updated.' })
    },
  )

  server.tool(
    'slides_reorder_element',
    'Change element z-order: bring forward/front or send backward/back.',
    slidesElementReorderSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('elementReorder', args)
      return formatResponse(result, { summary: 'Element z-order updated.' })
    },
  )
}
