import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  docsInsertListSchema, docsInsertTableSchema,
  docsInsertImageSchema, docsInsertPageBreakSchema,
  docsInsertHorizontalRuleSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDocsContentTools(server: ToolServer) {
  server.tool(
    'docs_insert_list',
    'Insert a bulleted or numbered list into the document.',
    docsInsertListSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('listInsert', args)
      return formatResponse(result, { summary: 'List inserted.' })
    },
  )

  server.tool(
    'docs_insert_table',
    'Insert a table into the document from a 2D array of values. First row is treated as header and bolded.',
    docsInsertTableSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('tableInsert', args)
      return formatResponse(result, { summary: 'Table inserted.' })
    },
  )

  server.tool(
    'docs_insert_image',
    'Insert an image from a public URL into the document.',
    docsInsertImageSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('imageInsert', args)
      return formatResponse(result, { summary: 'Image inserted.' })
    },
  )

  server.tool(
    'docs_insert_page_break',
    'Insert a page break into the document.',
    docsInsertPageBreakSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('pageBreakInsert', args)
      return formatResponse(result, { summary: 'Page break inserted.' })
    },
  )

  server.tool(
    'docs_insert_horizontal_rule',
    'Insert a horizontal rule divider into the document.',
    docsInsertHorizontalRuleSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('horizontalRuleInsert', args)
      return formatResponse(result, { summary: 'Horizontal rule inserted.' })
    },
  )
}
