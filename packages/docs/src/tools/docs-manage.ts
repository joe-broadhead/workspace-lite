import { formatResponse } from '@google-apps-script-mcp/shared'
import {
  docsCreateDocumentSchema, docsDocumentGetSchema,
  docsInsertParagraphSchema, docsSetTextSchema,
  docsReplaceTextSchema,
} from '@google-apps-script-mcp/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDocsManageTools(server: { tool: Function }) {
  server.tool(
    'docs_create_document',
    'Create a new Google Docs document.',
    docsCreateDocumentSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('documentCreate', args)
      return formatResponse(result, {
        summary: 'Document created.',
        hint: 'Use docs_insert_paragraph to add content.',
      })
    },
  )

  server.tool(
    'docs_get_document',
    'Get document metadata including ID, name, URL, and full text content with paragraph breakdown.',
    docsDocumentGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('documentGet', args)
      return formatResponse(result, {
        summary: 'Document retrieved.',
        hint: 'Use docs_insert_paragraph to add content, docs_format_text to style.',
      })
    },
  )

  server.tool(
    'docs_insert_paragraph',
    'Insert a paragraph into a document. Optionally set text, heading level (HEADING1-6 or NORMAL), and position (append or prepend).',
    docsInsertParagraphSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('paragraphInsert', args)
      return formatResponse(result, { summary: 'Paragraph inserted.' })
    },
  )

  server.tool(
    'docs_set_text',
    'Replace the entire document body with new text.',
    docsSetTextSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('setText', args)
      return formatResponse(result, { summary: 'Document text set.' })
    },
  )

  server.tool(
    'docs_replace_text',
    'Find and replace text across the entire document.',
    docsReplaceTextSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('replaceText', args)
      return formatResponse(result, { summary: 'Text replaced.' })
    },
  )
}
