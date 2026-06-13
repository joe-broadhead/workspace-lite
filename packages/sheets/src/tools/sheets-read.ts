import type { ToolServer } from '@workspace-lite/shared/tool-helpers'
import { sheetsRangeReadSchema, sheetsGetFormulasSchema, sheetsGetNotesSchema, sheetsBatchGetSchema } from '@workspace-lite/shared/schemas'
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
}
