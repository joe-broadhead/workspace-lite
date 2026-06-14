import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  docsPageSetupGetSchema, docsPageSetupUpdateSchema,
  docsBookmarksListSchema, docsBookmarkCreateSchema, docsBookmarkDeleteSchema,
  docsNamedRangesListSchema, docsNamedRangeCreateSchema, docsNamedRangeDeleteSchema,
  docsTableOfContentsListSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerDocsStructureTools(server: ToolServer) {
  server.tool(
    'docs_get_page_setup',
    'Read page size and margin settings from a Google Docs document. Values are returned in points.',
    docsPageSetupGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('pageSetupGet', args)
      return formatResponse(result, { summary: 'Page setup retrieved.' })
    },
  )

  server.tool(
    'docs_update_page_setup',
    'Update page size and margins for a Google Docs document. Values are points.',
    docsPageSetupUpdateSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('pageSetupUpdate', args)
      return formatResponse(result, { summary: 'Page setup updated.' })
    },
  )

  server.tool(
    'docs_list_bookmarks',
    'List document bookmarks with IDs and resolved paragraph positions where available.',
    docsBookmarksListSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('bookmarksList', args)
      return formatResponse(result, { summary: 'Bookmarks listed.' })
    },
  )

  server.tool(
    'docs_create_bookmark',
    'Create a bookmark at a paragraph character offset.',
    docsBookmarkCreateSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('bookmarkCreate', args)
      return formatResponse(result, { summary: 'Bookmark created.' })
    },
  )

  server.tool(
    'docs_delete_bookmark',
    'Delete a bookmark by ID. Requires confirm=true.',
    docsBookmarkDeleteSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('bookmarkDelete', args)
      return formatResponse(result, { summary: 'Bookmark deleted.' })
    },
  )

  server.tool(
    'docs_list_named_ranges',
    'List document named ranges, optionally filtered by name.',
    docsNamedRangesListSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('namedRangesList', args)
      return formatResponse(result, { summary: 'Named ranges listed.' })
    },
  )

  server.tool(
    'docs_create_named_range',
    'Create a named range around a paragraph or a partial paragraph text span.',
    docsNamedRangeCreateSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('namedRangeCreate', args)
      return formatResponse(result, { summary: 'Named range created.' })
    },
  )

  server.tool(
    'docs_delete_named_range',
    'Delete a named range by ID. Requires confirm=true.',
    docsNamedRangeDeleteSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('namedRangeDelete', args)
      return formatResponse(result, { summary: 'Named range deleted.' })
    },
  )

  server.tool(
    'docs_list_table_of_contents',
    'List existing Google Docs table-of-contents elements with child indexes and text previews.',
    docsTableOfContentsListSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('tableOfContentsList', args)
      return formatResponse(result, { summary: 'Tables of contents listed.' })
    },
  )
}
