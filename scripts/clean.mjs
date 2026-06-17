import fs from 'node:fs'
import path from 'node:path'
import { loadRegistry, root } from './registry-helpers.mjs'

const { services } = loadRegistry()
const targets = [
  path.join(root, 'shared', 'dist'),
  path.join(root, 'shared', 'tsconfig.tsbuildinfo'),
  path.join(root, 'tsconfig.tsbuildinfo'),
]

for (const service of services) {
  targets.push(
    path.join(root, 'packages', service.key, 'dist'),
    path.join(root, 'packages', service.key, 'tsconfig.tsbuildinfo'),
  )
}

for (const target of targets) {
  fs.rmSync(target, { force: true, recursive: true })
}
