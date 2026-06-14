import { formatResponse } from '@workspace-lite/shared'
import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import {
  sheetsRangeReadSchema, sheetsGetFormulasSchema, sheetsGetNotesSchema,
  sheetsBatchGetSchema, sheetsFindTextSchema, sheetsListProtectionsSchema,
} from '@workspace-lite/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsReadTools(server: ToolServer) {
  server.tool(
    'sheets_read_range',
    'Read values from a Google Sheets range. Returns a 2D array of cell values in the specified range.',
    sheetsRangeReadSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeRead', args)
      const data = result.data as Record<string, unknown>
      const values = data.values as string[][] || []

      const rows = values.map((row: string[], i: number) => {
        const cols = row.map((cell: string) => (cell === '' || cell === null || cell === undefined) ? '' : String(cell))
        return `Row ${i + 1}: [${cols.join(' | ')}]`
      })

      return {
        content: [{
          type: 'text' as const,
          text: `Sheet: ${data.sheetName || '(default)'}\nRange: ${data.range || '(all data)'}\nRows: ${data.numRows}, Cols: ${data.numCols}\n\n${rows.join('\n')}`,
        }],
      }
    },
  )

  server.tool(
    'sheets_read_formulas',
    'Read formulas and display values alongside raw values from a Google Sheets range.',
    sheetsGetFormulasSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeGetFormulas', args)
      const data = result.data as Record<string, unknown>
      const formulas = data.formulas as string[][] || []
      const displayValues = data.displayValues as string[][] || []
      const values = data.values as unknown[][] || []

      const rows = formulas.map((row: string[], i: number) => {
        const cols = row.map((cell: string, j: number) => {
          const raw = values[i]?.[j]
          const display = displayValues[i]?.[j]
          if (cell) return `${cell} → ${display ?? raw ?? ''}`
          return String(display ?? raw ?? '')
        })
        return `Row ${i + 1}: [${cols.join(' | ')}]`
      })

      return {
        content: [{
          type: 'text' as const,
          text: `Sheet: ${data.sheetName || '(default)'}\nRange: ${data.range || '(all data)'}\nRows: ${data.numRows}, Cols: ${data.numCols}\n\n${rows.join('\n')}`,
        }],
      }
    },
  )

  server.tool(
    'sheets_get_notes',
    'Read notes from a Google Sheets range.',
    sheetsGetNotesSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('rangeGetNotes', args)
      const data = result.data as Record<string, unknown>
      const notes = data.notes as string[][] || []

      const rows = notes.map((row: string[], i: number) => {
        const cols = row.map((cell: string) => cell || '')
        return `Row ${i + 1}: [${cols.join(' | ')}]`
      })

      return {
        content: [{
          type: 'text' as const,
          text: `Sheet: ${data.sheetName || '(default)'}\nRange: ${data.range || '(all data)'}\nRows: ${data.numRows}, Cols: ${data.numCols}\n\nNotes:\n${rows.join('\n')}`,
        }],
      }
    },
  )

  server.tool(
    'sheets_batch_get',
    'Read multiple ranges from a spreadsheet in a single API call via the Sheets Advanced Service. Returns a valueRanges array, each with range, majorDimension, and values. Params: spreadsheetId, ranges (array of A1 notation strings).',
    sheetsBatchGetSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('valuesBatchGet', args)
      const data = result.data as Record<string, unknown>
      const valueRanges = (data.valueRanges as Array<Record<string, unknown>>) || []
      const summary = valueRanges.map((vr: Record<string, unknown>) => {
        const vals = vr.values as unknown[][] | undefined
        return `${vr.range}: ${vals ? vals.length + ' rows' : 'empty'}`
      }).join(', ')
      return {
        content: [{ type: 'text' as const, text: `Batch get: ${summary}\n\n${JSON.stringify(valueRanges, null, 2)}` }],
      }
    },
  )

  server.tool(
    'sheets_find_text',
    'Find text in a spreadsheet, sheet, or A1 range using Apps Script TextFinder options such as case sensitivity, regex, formula text, and diacritic handling.',
    sheetsFindTextSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('textFind', args)
      const data = result.data as Record<string, unknown>
      const matches = (data.matches as Array<Record<string, unknown>>) || []
      const lines = matches.map((match) => {
        const display = match.displayValue ?? match.value ?? ''
        const formula = match.formula ? ` formula=${match.formula}` : ''
        return `${match.sheetName}!${match.range}: ${display}${formula}`
      })
      const suffix = data.truncated ? `\n\nReturned ${data.returnedMatches} of ${data.totalMatches} matches. Increase maxResults or narrow the range.` : ''
      return {
        content: [{
          type: 'text' as const,
          text: `Found ${data.totalMatches} match(es) across ${data.totalCellsSearched} cell(s).\n\n${lines.join('\n')}${suffix}`,
        }],
      }
    },
  )

  server.tool(
    'sheets_list_protections',
    'List protected ranges and sheets. Returns current filtered indexes for follow-up removal with sheets_remove_protection.',
    sheetsListProtectionsSchema,
    async (args: Record<string, unknown>) => {
      const result = await callProxy('protectionsList', args)
      return formatResponse(result, { summary: 'Protections retrieved.' })
    },
  )
}
