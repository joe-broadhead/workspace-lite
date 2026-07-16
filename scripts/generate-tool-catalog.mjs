#!/usr/bin/env node
/**
 * Generate skills/google-workspace/references/tool-catalog.md from catalog SSOT.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const services = ['drive','gmail','calendar','sheets','slides','docs','tasks','forms']
const titles = { drive:'Drive', gmail:'Gmail', calendar:'Calendar', sheets:'Sheets', slides:'Slides', docs:'Docs', tasks:'Tasks', forms:'Forms' }

const blocks = []
let total = 0
for (const svc of services) {
  const mod = await import(pathToFileURL(path.join(root, 'shared/dist/catalog/services', `${svc}.js`)).href)
  const tools = mod[`${svc}Tools`]
  total += tools.length
  blocks.push(`## ${titles[svc]} — ${tools.length} tools\n`)
  for (const t of tools.sort((a,b)=>a.name.localeCompare(b.name))) {
    blocks.push(`- \`${t.name}\` — ${t.description}`)
  }
  blocks.push('')
}
const out = `# Google Workspace Tool Catalog\n\nGenerated from \`shared/src/catalog/services/*\` (${total} tools).\n\nDo not hand-edit; run \`node scripts/generate-tool-catalog.mjs\`.\n\n${blocks.join('\n')}`
const dest = path.join(root, 'skills/google-workspace/references/tool-catalog.md')
fs.writeFileSync(dest, out)
console.log('Wrote', dest, 'tools', total)
if (total !== 218) {
  console.error('Expected 218 tools, got', total)
  process.exit(1)
}
