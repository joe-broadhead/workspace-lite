import fs from 'node:fs'
import { loadRegistry, renderProxyCode, serviceFilePath, sharedShellSource } from './registry-helpers.mjs'

const { services } = loadRegistry()
const authSource = sharedShellSource('Auth.gs')
const responseSource = sharedShellSource('Response.gs')

for (const service of services) {
  fs.writeFileSync(serviceFilePath(service, 'Code.gs'), renderProxyCode(service))
  fs.writeFileSync(serviceFilePath(service, 'Auth.gs'), authSource)
  fs.writeFileSync(serviceFilePath(service, 'Response.gs'), responseSource)
}

console.log(`Generated proxy shell for ${services.length} services`)
