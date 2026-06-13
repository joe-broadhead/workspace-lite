import { sheetsRangeReadSchema } from '@google-apps-script-mcp/shared/schemas'
import { callProxy } from '../proxy.js'

export function registerSheetsReadTools(server: { tool: Function }) {
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
}
