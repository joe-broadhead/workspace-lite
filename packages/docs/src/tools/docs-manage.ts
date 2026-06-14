import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  docsCreateDocumentSchema, docsDocumentGetSchema,
  docsInsertParagraphSchema, docsUpdateParagraphSchema,
  docsDeleteParagraphSchema, docsSetTextSchema,
  docsReplaceTextSchema, docsHeaderFooterSchema,
  docsGetAsJsonSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDocsManageTools(server: ToolServer) {
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
    'docs_get_as_json',
    'Get the full document as structured JSON via the Docs Advanced Service. Returns the complete document tree with all content, formatting, and structure. This is an alternative to the paragraph-based docs_get_document.',
    docsGetAsJsonSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('documentGetJson', args)
      return formatResponse(result, { summary: 'Document JSON retrieved.' })
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
    'docs_update_paragraph',
    'Update heading level and/or text of an existing paragraph by index.',
    docsUpdateParagraphSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('paragraphUpdate', args)
      return formatResponse(result, { summary: 'Paragraph updated.' })
    },
  )

  server.tool(
    'docs_delete_paragraph',
    'Delete a paragraph by index from a document.',
    docsDeleteParagraphSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('paragraphDelete', args)
      return formatResponse(result, { summary: 'Paragraph deleted.' })
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

  server.tool(
    'docs_set_header',
    'Set the document header text. Use empty string to clear.',
    docsHeaderFooterSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('headerSet', args)
      return formatResponse(result, { summary: 'Header set.' })
    },
  )

  server.tool(
    'docs_set_footer',
    'Set the document footer text. Use empty string to clear.',
    docsHeaderFooterSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('footerSet', args)
      return formatResponse(result, { summary: 'Footer set.' })
    },
  )
}
