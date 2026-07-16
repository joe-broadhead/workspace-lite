import { createInterface } from 'node:readline'

/** Interactive yes/no prompt on stderr (stdout reserved for results). */
export async function interactivePrompt(summary: string): Promise<boolean> {
  process.stderr.write(`${summary}\n[y/N] `)
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  try {
    const answer = await new Promise<string>((resolve) => {
      rl.question('', (line) => resolve(line))
    })
    const normalized = answer.trim().toLowerCase()
    return normalized === 'y' || normalized === 'yes'
  } finally {
    rl.close()
  }
}
